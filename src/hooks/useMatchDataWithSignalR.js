import { useState, useCallback, useEffect, useRef } from 'react';
import signalRManager from '../utils/SignalRConnectionManager';
import { enrichMatch } from '@/utils/matchEnricher';

export const useMatchDataWithSignalR = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [finishedData, setFinishedData] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [error, setError] = useState(null);
  const previousDataRef = useRef({ live: [], upcoming: [] });
  const updateIntervalRef = useRef(null);
  const isPausedRef = useRef(false);
  const dataFetchingRef = useRef(false);
  const connectionAttemptsRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const unmounting = useRef(false);
  const dataRef = useRef([]);

  const processMatch = useCallback((match) => {
    if (!match?.matchId) {
      console.debug('Invalid match data received:', match);
      return null;
    }

    try {
      return {
        eventId: match.matchId,
        matchId: match.matchId,
        tournamentName:
          match.matchInfo?.tournament?.name || 'Unknown Tournament',
        homeTeamName: match.coreData?.teams?.home?.name,
        awayTeamName: match.coreData?.teams?.away?.name,
        setScore: match.statistics?.score,
        playedSeconds: match.timeline?.matchTime?.seconds?.toString() || '0',
        matchStatus: match.matchInfo?.status,
        enrichedData: match.enrichedData || {},
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error processing match:', error);
      return null;
    }
  }, []);

  const filterMatches = useCallback((match) => {
    if (!match) return false;

    const isValidMatch =
      match.tournamentName && match.homeTeamName && match.awayTeamName;
    const isSRLMatch =
      match.tournamentName?.toLowerCase().includes('srl') ||
      match.homeTeamName?.toLowerCase().includes('srl') ||
      match.awayTeamName?.toLowerCase().includes('srl');

    return isValidMatch && !isSRLMatch;
  }, []);

  const handleSignalRMatches = useCallback(
    (matches) => {
      if (!Array.isArray(matches) || unmounting.current) return;

      try {
        const enrichedMatches = matches
          .map(processMatch)
          .filter(filterMatches)
          .map((match) => ({
            ...match,
            _stableKey: JSON.stringify({
              id: match.eventId,
              score: match.setScore,
              time: match.playedSeconds,
              status: match.matchStatus?.name,
            }),
          }));

        if (enrichedMatches.length > 0) {
          setLiveData((prevData) => {
            const merged = new Map();
            prevData.forEach((match) => merged.set(match.eventId, match));
            enrichedMatches.forEach((match) =>
              merged.set(match.eventId, match)
            );
            const newData = Array.from(merged.values());
            dataRef.current = newData;
            return newData;
          });
        }
      } catch (error) {
        console.error('Error handling SignalR matches:', error);
      }
    },
    [processMatch, filterMatches]
  );

  const connectToSignalR = useCallback(async () => {
    if (unmounting.current || !signalRManager) return;

    try {
      setIsInitialFetch(true);
      await signalRManager.connect(handleSignalRMatches);
      connectionAttemptsRef.current = 0;
    } catch (error) {
      if (!unmounting.current) {
        connectionAttemptsRef.current++;
        const delay = Math.min(
          1000 * Math.pow(2, connectionAttemptsRef.current),
          30000
        );
        retryTimeoutRef.current = setTimeout(connectToSignalR, delay);
      }
    } finally {
      setIsInitialFetch(false);
    }
  }, [handleSignalRMatches]);

  useEffect(() => {
    if (typeof window === 'undefined' || !signalRManager) return;

    unmounting.current = false;
    signalRManager.initialize(setIsSignalRConnected);
    connectToSignalR();

    return () => {
      unmounting.current = true;
      clearTimeout(retryTimeoutRef.current);
      setLiveData([]);
      dataRef.current = [];
      signalRManager.onComponentUnmount();
    };
  }, [connectToSignalR]);

  const fetchAndEnrichLiveData = useCallback(async () => {
    if (isPausedRef.current || dataFetchingRef.current) return;

    dataFetchingRef.current = true;
    try {
      const response = await fetch('/api/getData', { cache: 'no-store' });
      const result = await response.json();

      if (!result?.data) throw new Error('Invalid data received from server');

      const flattenedData =
        result.data.tournaments?.flatMap(
          (tournament) =>
            tournament.events?.map((event) => ({
              ...event,
              tournamentName: tournament.name,
            })) || []
        ) || [];

      const enrichedData = await Promise.all(
        flattenedData.map(async (match) => {
          const realtimeData = await enrichMatch.realtime(match);
          const initialData = previousDataRef.current.live.find(
            (existing) => existing.eventId === match.eventId
          );
          return processMatchData(realtimeData, initialData);
        })
      );

      if (hasValidData(enrichedData)) {
        setLiveData((prevData) => {
          if (isPausedRef.current) return prevData;
          const filteredData = filterLiveMatches(enrichedData);
          const mergedData = mergeMatchData(prevData, filteredData);
          previousDataRef.current.live = mergedData;
          return mergedData;
        });
      }
    } catch (error) {
      setError(error);
    } finally {
      dataFetchingRef.current = false;
      setIsInitialFetch(false);
    }
  }, [
    isSignalRConnected,
    processMatchData,
    hasValidData,
    mergeMatchData,
    filterLiveMatches,
  ]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([fetchAndEnrichLiveData()]);
      } catch (error) {
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [fetchAndEnrichLiveData]);

  return {
    liveData,
    isLoading,
    isSignalRConnected,
    isInitialFetch,
    error,
    refreshLiveData: fetchAndEnrichLiveData,
    pauseUpdates: () => {
      isPausedRef.current = true;
      signalRManager.disconnect();
    },
    resumeUpdates: () => {
      isPausedRef.current = false;
      connectToSignalR();
    },
    reconnectSignalR: connectToSignalR,
    clearFinishedMatches: () => setFinishedData(new Set()),
  };
};
