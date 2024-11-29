import { useState, useEffect, useCallback, useRef } from 'react';
import { enrichMatch } from '@/utils/matchEnricher';

export const useMatchData = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [finishedData, setFinishedData] = useState(new Set()); // Track finished match IDs
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [error, setError] = useState(null);
  const previousDataRef = useRef({ live: [], upcoming: [] });
  const updateIntervalRef = useRef(null);
  const isPausedRef = useRef(false);

  const hasValidData = useCallback((data) => {
    return (
      Array.isArray(data) &&
      data.length > 0 &&
      data.every(
        (match) =>
          match.enrichedData &&
          match.enrichedData.analysis &&
          match.tournamentName
      )
    );
  }, []);

  const isMatchFinished = useCallback((match) => {
    const currentTime = parseInt(match.playedSeconds?.split(':')[0]);
    return currentTime >= 90;
  }, []);

  const processMatchData = useCallback(async (match, initialData = null) => {
    let prematchMarketData = [];
    const getPrematchData = async (matchId) => {
      try {
        const today = new Date();
        const eventId = `${today.toISOString().split('T')[0]}:${matchId}`;
        const queryString = Object.entries({ matchId: eventId })
          .map(([key, value]) => `${key}=${value}`)
          .join('&');

        const result = await fetch(`/api/match/prematchdata?${queryString}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!result.ok) {
          throw new Error(`HTTP error! status: ${result.status}`);
        }

        const data = await result.json();
        return data.match || undefined;
      } catch (error) {}
    };

    if (isInitialFetch) {
      const prematchData = await getPrematchData(
        match.eventId || match.matchId
      ); // Fetch prematch data
      prematchMarketData = prematchData?.markets || []; // Extract market data
    }

    return {
      ...match,
      enrichedData: {
        ...initialData?.enrichedData,
        ...match.enrichedData,
        prematchMarketData: prematchMarketData, // Store prematchMarketData in enrichedData
      },
      _stableKey: JSON.stringify({
        id: match.eventId || match.matchId,
        score: match.setScore,
        time: match.playedSeconds,
        status: match.matchStatus?.name,
        analysis: {
          stats: match.enrichedData?.analysis?.stats,
          momentum: match.enrichedData?.analysis?.momentum?.trend,
          timeline: match.enrichedData?.analysis?.momentum?.timeline,
        },
      }),
    };
  }, []);

  const mergeMatchData = useCallback((existingData, newData) => {
    const mergedMap = new Map();

    // First, add all existing data to the map
    existingData.forEach((match) => {
      mergedMap.set(match.eventId, match);
    });

    // Then merge in new data, preserving existing enrichedData where needed
    newData.forEach((newMatch) => {
      const existingMatch = mergedMap.get(newMatch.eventId);
      if (existingMatch) {
        // Preserve certain enriched data fields that shouldn't be overwritten
        const preservedData = {
          h2h: existingMatch.enrichedData?.h2h,
          form: existingMatch.enrichedData?.form,
          tournament: existingMatch.enrichedData?.tournament,
          details: existingMatch.enrichedData?.details,
          phrases: existingMatch.enrichedData?.phrases,
          matchInfo: existingMatch.enrichedData?.matchInfo,
          odds: existingMatch.enrichedData?.odds,
          squads: existingMatch.enrichedData?.squads,
        };

        mergedMap.set(newMatch.eventId, {
          ...newMatch,
          enrichedData: {
            ...preservedData,
            ...newMatch.enrichedData,
          },
        });
      } else {
        mergedMap.set(newMatch.eventId, newMatch);
      }
    });

    return Array.from(mergedMap.values());
  }, []);

  const updateFinishedMatches = useCallback(
    (matches) => {
      const newFinished = new Set();
      matches.forEach((match) => {
        if (isMatchFinished(match)) {
          newFinished.add(match.eventId || match.matchId);
        }
      });

      if (newFinished.size > 0) {
        setFinishedData((prev) => new Set([...prev, ...newFinished]));
      }
    },
    [isMatchFinished]
  );

  const filterLiveMatches = useCallback(
    (matches) => {
      return matches.filter(
        (match) =>
          !match.ai &&
          !match.tournamentName?.toLowerCase().includes('srl') &&
          !match.homeTeamName?.toLowerCase().includes('srl') &&
          !match.awayTeamName?.toLowerCase().includes('srl') &&
          match.tournamentName &&
          match.enrichedData?.h2h &&
          match.enrichedData?.form &&
          match.enrichedData?.tournament &&
          match.enrichedData?.details &&
          match.enrichedData?.phrases &&
          match.enrichedData?.situation &&
          match.enrichedData?.timeline &&
          match.enrichedData?.matchInfo &&
          match.enrichedData?.odds &&
          match.enrichedData?.squads &&
          !isMatchFinished(match) &&
          !finishedData.has(match.eventId || match.matchId)
      );
    },
    [isMatchFinished, finishedData]
  );

  const fetchAndEnrichLiveData = useCallback(async () => {
    if (isPausedRef.current) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/getData', { cache: 'no-store' });
      const result = await response.json();

      if (!result || !result.data) {
        setError(new Error('Invalid data received from server'));
        return;
      }

      let flattenedData = [];
      if (Array.isArray(result.data)) {
        flattenedData = result.data.flatMap((tournament) => {
          if (tournament.events && Array.isArray(tournament.events)) {
            return tournament.events.map((event) => ({
              ...event,
              tournamentName: tournament.name,
            }));
          }
          return [];
        });
      } else if (result.data.tournaments) {
        flattenedData = result.data.tournaments.flatMap((tournament) => {
          if (tournament.events && Array.isArray(tournament.events)) {
            return tournament.events.map((event) => ({
              ...event,
              tournamentName: tournament.name,
            }));
          }
          return [];
        });
      }

      if (isInitialFetch) {
        const initialEnriched = await Promise.all(
          flattenedData.map(async (match) => {
            const [initialData, realtimeData] = await Promise.all([
              enrichMatch.initial(match),
              enrichMatch.realtime(match),
            ]);
            return processMatchData({
              ...match,
              enrichedData: {
                ...initialData?.enrichedData,
                ...realtimeData?.enrichedData,
              },
            });
          })
        );

        if (hasValidData(initialEnriched)) {
          updateFinishedMatches(initialEnriched);
          const filteredData = filterLiveMatches(initialEnriched);
          setLiveData(filteredData);
          previousDataRef.current.live = filteredData;
        }
        return;
      }

      const enrichedData = await Promise.all(
        flattenedData.map(async (match) => {
          const realtimeData = await enrichMatch.realtime(match);
          const initialData = previousDataRef.current.live.find(
            (existingMatch) =>
              existingMatch.eventId === match.eventId ||
              existingMatch.matchId === match.matchId
          );
          return processMatchData(realtimeData, initialData);
        })
      );

      const sortedData = enrichedData.sort((a, b) => {
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

      if (hasValidData(sortedData)) {
        setLiveData((prevData) => {
          updateFinishedMatches(sortedData);
          const filteredData = filterLiveMatches(sortedData);

          // Only update if data has actually changed and updates aren't paused
          if (
            JSON.stringify(prevData.map((m) => m._stableKey)) ===
              JSON.stringify(filteredData.map((m) => m._stableKey)) ||
            isPausedRef.current
          ) {
            return prevData;
          }

          const mergedData = mergeMatchData(prevData, filteredData);
          previousDataRef.current.live = mergedData;
          return mergedData;
        });
      }
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
      setIsInitialFetch(false);
    }
  }, [
    isInitialFetch,
    processMatchData,
    hasValidData,
    mergeMatchData,
    filterLiveMatches,
    updateFinishedMatches,
  ]);

  const fetchUpcomingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/getUpcomingData', {
        cache: 'no-store',
      });
      const result = await response.json();

      if (!result?.data) {
        setError(new Error('Invalid upcoming data received from server'));
        setUpcomingData([]);
        return;
      }

      let flattenedData = [];
      if (Array.isArray(result.data)) {
        flattenedData = result.data
          .filter((tournament) => tournament && tournament.events)
          .flatMap((tournament) => {
            return Array.isArray(tournament.events)
              ? tournament.events.map((event) =>
                  processMatchData({
                    ...event,
                    tournamentName: tournament.name || 'Unknown Tournament',
                  })
                )
              : [];
          });
      } else if (result.data?.tournaments) {
        flattenedData = (result.data.tournaments || [])
          .filter((tournament) => tournament && tournament.events)
          .flatMap((tournament) => {
            return Array.isArray(tournament.events)
              ? tournament.events.map((event) =>
                  processMatchData({
                    ...event,
                    tournamentName: tournament.name || 'Unknown Tournament',
                  })
                )
              : [];
          });
      }

      setUpcomingData((prevData) => {
        const newData = flattenedData.filter(
          (match) =>
            !match.ai &&
            !match.tournamentName?.toLowerCase().includes('srl') &&
            !match.homeTeamName?.toLowerCase().includes('srl') &&
            !match.awayTeamName?.toLowerCase().includes('srl')
        );

        if (
          JSON.stringify(prevData.map((m) => m._stableKey)) ===
          JSON.stringify(newData.map((m) => m._stableKey))
        ) {
          return prevData;
        }

        const mergedData = mergeMatchData(prevData, newData);
        previousDataRef.current.upcoming = mergedData;
        return mergedData;
      });
    } catch (error) {
      setError(error);
      setUpcomingData([]);
    } finally {
      setIsLoading(false);
    }
  }, [processMatchData, mergeMatchData]);

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
      updateIntervalRef.current = setInterval(fetchAndEnrichLiveData, 10000);
    }
  }, [fetchAndEnrichLiveData]);

  const clearFinishedMatches = useCallback(() => {
    setFinishedData(new Set());
  }, []);

  // Initial fetch
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([fetchAndEnrichLiveData(), fetchUpcomingData()]);
      } catch (error) {
        setError(error);
      }
    };

    initializeData();
  }, [fetchAndEnrichLiveData, fetchUpcomingData]);

  // Polling for live matches
  useEffect(() => {
    if (isInitialFetch) return;

    updateIntervalRef.current = setInterval(fetchAndEnrichLiveData, 10000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isInitialFetch, fetchAndEnrichLiveData]);

  // Add cleanup for component unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

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
    clearFinishedMatches,
  };
};