import { useState, useCallback, useEffect, useRef } from 'react';
import signalRManager from '../utils/SignalRConnectionManager';

export const useSignalRConnection = () => {
  const [signalRData, setSignalRData] = useState([]);
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const [isInitialConnecting, setIsInitialConnecting] = useState(true);
  const unmounting = useRef(false);
  const dataRef = useRef([]);
  const retryTimeoutRef = useRef(null);
  const connectionAttemptsRef = useRef(0);
  const isUpdatingRef = useRef(false);

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
      if (
        !Array.isArray(matches) ||
        unmounting.current ||
        isUpdatingRef.current
      )
        return;

      try {
        isUpdatingRef.current = true;
        console.debug('Processing matches batch:', matches.length);
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
          setSignalRData((prevData) => {
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
      } finally {
        isUpdatingRef.current = false;
      }
    },
    [processMatch, filterMatches]
  );

  const connectToSignalR = useCallback(async () => {
    if (unmounting.current || !signalRManager) return;

    try {
      setIsInitialConnecting(true);
      await signalRManager.connect(handleSignalRMatches);
      connectionAttemptsRef.current = 0;
    } catch (error) {
      console.error('Error connecting to SignalR:', error);
      if (!unmounting.current) {
        connectionAttemptsRef.current++;
        const delay = Math.min(
          1000 * Math.pow(2, connectionAttemptsRef.current),
          30000
        );
        retryTimeoutRef.current = setTimeout(connectToSignalR, delay);
      }
    } finally {
      setIsInitialConnecting(false);
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
      setSignalRData([]);
      dataRef.current = [];
      signalRManager.onComponentUnmount();
    };
  }, [connectToSignalR]);

  const pauseUpdates = useCallback(async () => {
    if (signalRManager) {
      console.debug('Pausing SignalR updates');
      await signalRManager.disconnect();
    }
  }, []);

  const resumeUpdates = useCallback(async () => {
    if (signalRManager && !unmounting.current) {
      console.debug('Resuming SignalR updates');
      try {
        await connectToSignalR();
      } catch (error) {
        console.error('Error resuming updates:', error);
      }
    }
  }, [connectToSignalR]);

  const reconnect = useCallback(async () => {
    if (signalRManager && !unmounting.current) {
      console.debug('Manually reconnecting SignalR');
      try {
        await signalRManager.disconnect();
        await connectToSignalR();
      } catch (error) {
        console.error('Error during manual reconnection:', error);
      }
    }
  }, [connectToSignalR]);

  useEffect(() => {
    if (!isSignalRConnected && signalRData.length > 0) {
      setSignalRData([]);
      dataRef.current = [];
    }
  }, [isSignalRConnected]);

  return {
    signalRData,
    isSignalRConnected,
    isInitialConnecting,
    pauseUpdates,
    resumeUpdates,
    reconnect,
  };
};
