import { useState, useEffect, useCallback, useRef } from 'react';
import { enrichMatch } from '@/utils/matchEnricher';
import * as signalR from '@microsoft/signalr';


export const useMatchData = () => {
  // State management
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [finishedData, setFinishedData] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [error, setError] = useState(null);

  // Refs
  const previousDataRef = useRef({ live: [], upcoming: [] });
  const updateIntervalRef = useRef(null);
  const signalRConnectionRef = useRef(null);

  // Validation callbacks
  const hasValidData = useCallback((data) => {
    return (
      Array.isArray(data) &&
      data.length > 0 &&
      data.every(
        (match) => match.enrichedData?.analysis && match.tournamentName
      )
    );
  }, []);

  const isMatchFinished = useCallback((match) => {
    const currentTime = parseInt(match.playedSeconds?.split(':')[0]);
    return currentTime >= 90;
  }, []);

  // Data processing
  const processMatchData = useCallback(async (match, initialData = null) => {
    return {
      ...match,
      enrichedData: {
        ...initialData?.enrichedData,
        ...match.enrichedData,
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

    existingData.forEach((match) => {
      mergedMap.set(match.eventId, match);
    });

    newData.forEach((newMatch) => {
      const existingMatch = mergedMap.get(newMatch.eventId);
      if (existingMatch) {
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

  // Data fetching
  const fetchAndEnrichLiveData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/getData', { cache: 'no-store' });
      const result = await response.json();

      if (!result?.data) {
        throw new Error('Invalid data received from server');
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
            (existingMatch) => existingMatch.eventId === match.eventId
          );
          return processMatchData(realtimeData, initialData);
        })
      );

      if (hasValidData(enrichedData)) {
        setLiveData((prevData) => {
          updateFinishedMatches(enrichedData);
          const filteredData = filterLiveMatches(enrichedData);

          if (
            JSON.stringify(prevData.map((m) => m._stableKey)) ===
            JSON.stringify(filteredData.map((m) => m._stableKey))
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
        throw new Error('Invalid upcoming data received from server');
      }

      let flattenedData = [];
      if (Array.isArray(result.data)) {
        flattenedData = result.data
          .filter((tournament) => tournament?.events)
          .flatMap((tournament) =>
            Array.isArray(tournament.events)
              ? tournament.events.map((event) =>
                  processMatchData({
                    ...event,
                    tournamentName: tournament.name || 'Unknown Tournament',
                  })
                )
              : []
          );
      } else if (result.data?.tournaments) {
        flattenedData = result.data.tournaments
          .filter((tournament) => tournament?.events)
          .flatMap((tournament) =>
            Array.isArray(tournament.events)
              ? tournament.events.map((event) =>
                  processMatchData({
                    ...event,
                    tournamentName: tournament.name || 'Unknown Tournament',
                  })
                )
              : []
          );
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

  // Update the cleanup effect
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        await SignalRConnectionManager.disconnect();

        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };

      cleanup();
    };
  }, []);

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

  useEffect(() => {
    if (isInitialFetch) return;

    updateIntervalRef.current = setInterval(fetchAndEnrichLiveData, 5000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isInitialFetch, fetchAndEnrichLiveData]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        if (
          signalRConnectionRef.current?.state ===
          signalR.HubConnectionState.Connected
        ) {
          try {
            await signalRConnectionRef.current.invoke('UnsubscribeFromMatches');
            await signalRConnectionRef.current.stop();
          } catch (error) {
            console.error('Error during SignalR cleanup:', error);
          }
        }

        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };

      cleanup();
    };
  }, []);

  // Control functions
  const pauseUpdates = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  const resumeUpdates = useCallback(() => {
    if (!updateIntervalRef.current) {
      updateIntervalRef.current = setInterval(fetchAndEnrichLiveData, 5000);
    }
  }, [fetchAndEnrichLiveData]);

  const clearFinishedMatches = useCallback(() => {
    setFinishedData(new Set());
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

export const getPrematchData = async (matchId) => {
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
  } catch (error) {
    console.error('Error fetching prematch data:', error);
    return undefined;
  }
};
