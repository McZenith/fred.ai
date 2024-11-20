// hooks/useMatchData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { enrichMatch } from '@/utils/matchEnricher';

const BATCH_SIZE = 10; // Increased from 5 to handle more matches simultaneously
const UPDATE_INTERVAL = 15000; // Increased to 15 seconds to reduce API load
const WORKER_POOL_SIZE = 8; // Increased from 4 to handle more concurrent processing
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export const useMatchData = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [error, setError] = useState(null);

  const workers = useRef([]);
  const activeRequests = useRef(new Map());
  const isPausedRef = useRef(false);
  const updateIntervalRef = useRef(null);
  const previousDataRef = useRef(null);

  // Initialize Web Workers with error handling
  useEffect(() => {
    if (typeof Window !== 'undefined') {
      try {
        workers.current = Array.from({ length: WORKER_POOL_SIZE }, () => {
          const worker = new Worker(
            new URL('../utils/matchWorker.js', import.meta.url)
          );
          worker.onerror = (error) => {
            console.error('Worker initialization error:', error);
            workers.current = workers.current.filter((w) => w !== worker);
          };
          return worker;
        });

        return () => {
          workers.current.forEach((worker) => {
            try {
              worker.terminate();
            } catch (error) {
              console.error('Worker termination error:', error);
            }
          });
        };
      } catch (error) {
        console.error('Worker initialization failed:', error);
        workers.current = [];
      }
    }
  }, []);

  // Enhanced fetch with retry logic
  const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (retries > 0) {
        console.warn(
          `Retrying fetch for ${url}, ${retries} attempts remaining`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  };

  const processMatchBatch = useCallback(async (matches, type = 'realtime') => {
    const results = [];
    const errors = [];

    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
      const batch = matches.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((match) => {
        return new Promise((resolve) => {
          const worker = workers.current.find(
            (w) => !activeRequests.current.has(w)
          );

          if (worker) {
            const timeout = setTimeout(() => {
              console.warn(`Worker timeout for match ${match.eventId}`);
              worker.terminate();
              workers.current = workers.current.filter((w) => w !== worker);
              resolve({ ...match, _processingError: true });
            }, 8000); // Increased timeout

            worker.onmessage = (e) => {
              clearTimeout(timeout);
              activeRequests.current.delete(worker);
              resolve(e.data.data);
            };

            worker.onerror = (error) => {
              clearTimeout(timeout);
              activeRequests.current.delete(worker);
              console.error(`Worker error for match ${match.eventId}:`, error);
              resolve({ ...match, _processingError: true });
            };

            activeRequests.current.set(worker, match.eventId);
            worker.postMessage({ match, type });
          } else {
            // Fallback to main thread with error handling
            enrichMatch[type](match)
              .then(resolve)
              .catch((error) => {
                console.error(
                  `Main thread error for match ${match.eventId}:`,
                  error
                );
                resolve({ ...match, _processingError: true });
              });
          }
        });
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(
          ...batchResults.filter((result) => !result._processingError)
        );
        errors.push(
          ...batchResults.filter((result) => result._processingError)
        );
      } catch (error) {
        console.error('Batch processing error:', error);
      }

      // Reduced delay between batches
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Retry failed matches once
    if (errors.length > 0) {
      console.log(`Retrying ${errors.length} failed matches...`);
      const retryResults = await Promise.all(
        errors.map((match) => enrichMatch[type](match).catch(() => null))
      );
      results.push(...retryResults.filter(Boolean));
    }

    return results;
  }, []);

  const hasValidData = useCallback(
    (data) => {
      return (
        Array.isArray(data) &&
        data.length > 0 &&
        data.every((match) => {
          const hasBasicInfo = match.tournamentName && match.eventId;
          const hasEnrichedData =
            match.enrichedData?.analysis || isInitialFetch;
          return hasBasicInfo && hasEnrichedData;
        })
      );
    },
    [isInitialFetch]
  );

  const fetchAndEnrichLiveData = useCallback(async () => {
    if (isPausedRef.current) return;

    try {
      const result = await fetchWithRetry('/api/getData');
      if (!result?.data) throw new Error('Invalid data received');

      // Enhanced data flattening logic with error handling
      const flattenedData = Array.isArray(result.data)
        ? result.data.flatMap((tournament) => {
            if (!tournament) return [];
            const events = tournament.events || [];
            return events.map((event) => ({
              ...event,
              tournamentName: tournament.name || 'Unknown Tournament',
              _stableKey: `${event.eventId}-${event.updateTime || Date.now()}`,
            }));
          })
        : (result.data.tournaments || []).flatMap((tournament) => {
            if (!tournament) return [];
            const events = tournament.events || [];
            return events.map((event) => ({
              ...event,
              tournamentName: tournament.name || 'Unknown Tournament',
              _stableKey: `${event.eventId}-${event.updateTime || Date.now()}`,
            }));
          });

      // More lenient initial filtering
      const validMatches = flattenedData.filter(
        (match) =>
          match.eventId &&
          match.tournamentName &&
          !match.tournamentName?.toLowerCase().includes('srl') &&
          !match.homeTeamName?.toLowerCase().includes('srl') &&
          !match.awayTeamName?.toLowerCase().includes('srl')
      );

      if (validMatches.length === 0) {
        console.warn('No valid matches found in response');
        return;
      }

      const enrichedData = await processMatchBatch(
        validMatches,
        isInitialFetch ? 'initial' : 'realtime'
      );

      if (hasValidData(enrichedData)) {
        setLiveData((prevData) => {
          const newData = enrichedData
            .filter((match) => match.enrichedData?.analysis)
            .sort((a, b) => {
              const aProb = Math.max(
                a.enrichedData?.analysis?.goalProbability?.home || 0,
                a.enrichedData?.analysis?.goalProbability?.away || 0
              );
              const bProb = Math.max(
                b.enrichedData?.analysis?.goalProbability?.home || 0,
                b.enrichedData?.analysis?.goalProbability?.away || 0
              );
              return bProb - aProb;
            });

          // Compare with previous data
          const prevKeys = prevData.map((m) => m._stableKey).join(',');
          const newKeys = newData.map((m) => m._stableKey).join(',');

          if (prevKeys === newKeys && !isInitialFetch) {
            return prevData;
          }

          // Store current data for future comparison
          previousDataRef.current = newData;
          return newData;
        });
      } else {
        console.warn('Enriched data validation failed');
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
      setError(error);
    } finally {
      setIsLoading(false);
      setIsInitialFetch(false);
    }
  }, [isInitialFetch, processMatchBatch, hasValidData]);

  const fetchUpcomingData = useCallback(async () => {
    try {
      const result = await fetchWithRetry('/api/getUpcomingData');
      if (!result?.data) throw new Error('Invalid upcoming data');

      const flattenedData = Array.isArray(result.data)
        ? result.data.flatMap((tournament) => {
            if (!tournament) return [];
            const events = tournament.events || [];
            return events.map((event) => ({
              ...event,
              tournamentName: tournament.name || 'Unknown Tournament',
              _stableKey: `${event.eventId}-${event.updateTime || Date.now()}`,
            }));
          })
        : (result.data.tournaments || []).flatMap((tournament) => {
            if (!tournament) return [];
            const events = tournament.events || [];
            return events.map((event) => ({
              ...event,
              tournamentName: tournament.name || 'Unknown Tournament',
              _stableKey: `${event.eventId}-${event.updateTime || Date.now()}`,
            }));
          });

      const filteredData = flattenedData.filter(
        (match) =>
          match.eventId &&
          match.tournamentName &&
          !match.tournamentName?.toLowerCase().includes('srl') &&
          !match.homeTeamName?.toLowerCase().includes('srl') &&
          !match.awayTeamName?.toLowerCase().includes('srl')
      );

      setUpcomingData((prevData) => {
        const prevKeys = prevData.map((m) => m._stableKey).join(',');
        const newKeys = filteredData.map((m) => m._stableKey).join(',');

        if (prevKeys === newKeys) {
          return prevData;
        }
        return filteredData;
      });
    } catch (error) {
      console.error('Error fetching upcoming data:', error);
      setError(error);
    }
  }, []);

  const pauseUpdates = useCallback(() => {
    isPausedRef.current = true;
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  const resumeUpdates = useCallback(() => {
    isPausedRef.current = false;
    if (!updateIntervalRef.current) {
      updateIntervalRef.current = setInterval(
        fetchAndEnrichLiveData,
        UPDATE_INTERVAL
      );
    }
  }, [fetchAndEnrichLiveData]);

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([fetchAndEnrichLiveData(), fetchUpcomingData()]);
      } catch (error) {
        console.error('Error in initial data fetch:', error);
        setError(error);
      }
    };

    initializeData();

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [fetchAndEnrichLiveData, fetchUpcomingData]);

  // Set up polling interval after initial fetch
  useEffect(() => {
    if (!isInitialFetch && !updateIntervalRef.current && !isPausedRef.current) {
      updateIntervalRef.current = setInterval(
        fetchAndEnrichLiveData,
        UPDATE_INTERVAL
      );
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isInitialFetch, fetchAndEnrichLiveData]);

  return {
    liveData,
    upcomingData,
    isLoading,
    isInitialFetch,
    error,
    refreshLiveData: fetchAndEnrichLiveData,
    refreshUpcomingData: fetchUpcomingData,
    pauseUpdates,
    resumeUpdates,
  };
};