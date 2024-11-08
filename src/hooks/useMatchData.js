// hooks/useMatchData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { enrichMatch } from '@/utils/matchEnricher';

export const useMatchData = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [error, setError] = useState(null);

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

  const processMatchData = useCallback((match, initialData = null) => {
    return {
      ...match,
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
      enrichedData: {
        ...initialData?.enrichedData,
        ...match.enrichedData,
      },
    };
  }, []);

  const fetchAndEnrichLiveData = useCallback(async () => {
    if (isPausedRef.current) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/getData', { cache: 'no-store' });
      const result = await response.json();

      if (!result || !result.data) {
        console.error('Invalid data structure received:', result);
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
      } else {
        setError(new Error('Unexpected data structure received'));
        return;
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
          setLiveData(
            initialEnriched.filter(
              (match) =>
                !match.ai &&
                !match.tournamentName?.toLowerCase().includes('srl') &&
                !match.homeTeamName?.toLowerCase().includes('srl') &&
                !match.awayTeamName?.toLowerCase().includes('srl')
            )
          );
        }
        return;
      }

      const enrichedData = await Promise.all(
        flattenedData.map(async (match) => {
          const realtimeData = await enrichMatch.realtime(match);
          const initialData = liveData.find(
            (existingMatch) =>
              existingMatch.id === match.id ||
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
          const newData = sortedData.filter(
            (match) =>
              !match.ai &&
              !match.tournamentName?.toLowerCase().includes('srl') &&
              !match.homeTeamName?.toLowerCase().includes('srl') &&
              !match.awayTeamName?.toLowerCase().includes('srl')
          );

          // Only update if data has actually changed and updates aren't paused
          if (
            JSON.stringify(prevData.map((m) => m._stableKey)) ===
              JSON.stringify(newData.map((m) => m._stableKey)) ||
            isPausedRef.current
          ) {
            return prevData;
          }
          return newData;
        });
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
      setError(error);
    } finally {
      setIsLoading(false);
      setIsInitialFetch(false);
    }
  }, [isInitialFetch, liveData, processMatchData, hasValidData]);

  const fetchUpcomingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/getUpcomingData', {
        cache: 'no-store',
      });
      const result = await response.json();

      if (!result?.data) {
        console.error('Invalid upcoming data structure received:', result);
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
            !match.homeTeamName?.toLowerCase().includes('srl')
        );

        // Only update if data has actually changed
        if (
          JSON.stringify(prevData.map((m) => m._stableKey)) ===
          JSON.stringify(newData.map((m) => m._stableKey))
        ) {
          return prevData;
        }
        return newData;
      });
    } catch (error) {
      console.error('Error fetching upcoming data:', error);
      setError(error);
      setUpcomingData([]);
    } finally {
      setIsLoading(false);
    }
  }, [processMatchData]);

  // Pause updates
  const pauseUpdates = useCallback(() => {
    isPausedRef.current = true;
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  // Resume updates
  const resumeUpdates = useCallback(() => {
    isPausedRef.current = false;
    if (!updateIntervalRef.current) {
      updateIntervalRef.current = setInterval(fetchAndEnrichLiveData, 10000);
    }
  }, [fetchAndEnrichLiveData]);

  // Initial fetch
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([fetchAndEnrichLiveData(), fetchUpcomingData()]);
      } catch (error) {
        console.error('Error during initialization:', error);
        setError(error);
      }
    };

    initializeData();
  }, [fetchAndEnrichLiveData, fetchUpcomingData]);

  // Polling for live matches
  useEffect(() => {
    if (isInitialFetch) return;

    updateIntervalRef.current = setInterval(fetchAndEnrichLiveData, 10000);
    // hooks/useMatchData.js (continued)

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
  };
};