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
      if (!Array.isArray(matches) || unmounting.current) {
        return;
      }

      try {
        console.debug('Processing matches batch:', matches.length);
        const enrichedMatches = matches.map(processMatch).filter(filterMatches);

        if (enrichedMatches.length > 0) {
          setSignalRData((prevData) => {
            const merged = new Map();

            // Add previous data first
            prevData.forEach((match) => merged.set(match.eventId, match));

            // Update with new matches
            enrichedMatches.forEach((match) =>
              merged.set(match.eventId, match)
            );

            // Convert to array and store in ref
            const newData = Array.from(merged.values());
            dataRef.current = newData;

            return newData;
          });

          console.debug('Updated matches:', enrichedMatches.length);
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
      setIsInitialConnecting(true);
      await signalRManager.connect(handleSignalRMatches);
      connectionAttemptsRef.current = 0;
      setIsInitialConnecting(false);
    } catch (error) {
      console.error('Error connecting to SignalR:', error);

      if (!unmounting.current) {
        connectionAttemptsRef.current++;
        const delay = Math.min(
          1000 * Math.pow(2, connectionAttemptsRef.current),
          30000
        );

        retryTimeoutRef.current = setTimeout(() => {
          if (!unmounting.current) {
            connectToSignalR();
          }
        }, delay);
      }
    }
  }, [handleSignalRMatches]);

  useEffect(() => {
    if (typeof window === 'undefined' || !signalRManager) {
      return;
    }

    unmounting.current = false;

    signalRManager.initialize((isConnected) => {
      if (!unmounting.current) {
        setIsSignalRConnected(isConnected);
        console.debug('Connection state updated:', isConnected);
      }
    });

    connectToSignalR();

    return () => {
      unmounting.current = true;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Clear data
      setSignalRData([]);
      dataRef.current = [];

      // Disconnect SignalR
      if (signalRManager) {
        signalRManager.onComponentUnmount();
      }
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

  // Add a reconnect method
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

  // Add error handling for stale data
  useEffect(() => {
    if (!isSignalRConnected && signalRData.length > 0) {
      // Clear stale data when connection is lost
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
