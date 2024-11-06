// hooks/useMatchData.js
import { useState, useEffect } from 'react';
import { enrichMatch } from '@/utils/matchEnricher';

export const useMatchData = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [error, setError] = useState(null);

  const fetchAndEnrichLiveData = async () => {
    try {
      const response = await fetch('/api/getData', { cache: 'no-store' });
      const result = await response.json();

      // Add error handling for missing data
      if (!result || !result.data) {
        console.error('Invalid data structure received:', result);
        setError(new Error('Invalid data received from server'));
        return;
      }

      // Handle different possible data structures
      let flattenedData = [];
      if (Array.isArray(result.data)) {
        // If data is an array of tournaments
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
        // If data has a tournaments property
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
        console.error('Unexpected data structure:', result);
        setError(new Error('Unexpected data structure received'));
        return;
      }

      // Initial enrichment on first load
      if (isInitialFetch) {
        const initialEnriched = await Promise.all(
          flattenedData.map((match) => enrichMatch.initial(match))
        );
        setLiveData(initialEnriched);
      }

      // Realtime enrichment
      const enrichedData = await Promise.all(
        flattenedData.map((match) => enrichMatch.realtime(match))
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

      setLiveData(sortedData);
    } catch (error) {
      console.error('Error fetching live data:', error);
      setError(error);
    } finally {
      setIsLoading(false);
      setIsInitialFetch(false);
    }
  };

  const fetchUpcomingData = async () => {
    try {
      const response = await fetch('/api/getUpcomingData', {
        cache: 'no-store',
      });
      const result = await response.json();

      // Add error handling for missing data
      if (!result || !result.data) {
        console.error('Invalid upcoming data structure received:', result);
        setError(new Error('Invalid upcoming data received from server'));
        return;
      }

      let flattenedData = [];
      if (result.data.tournaments) {
        flattenedData = result.data.tournaments.flatMap((tournament) => {
          if (tournament.events && Array.isArray(tournament.events)) {
            return tournament.events.map((event) => ({
              ...event,
              tournamentName: tournament.name,
            }));
          }
          return [];
        });
      } else if (Array.isArray(result.data)) {
        flattenedData = result.data.flatMap((tournament) => {
          if (tournament.events && Array.isArray(tournament.events)) {
            return tournament.events.map((event) => ({
              ...event,
              tournamentName: tournament.name,
            }));
          }
          return [];
        });
      }

      setUpcomingData(flattenedData);
    } catch (error) {
      console.error('Error fetching upcoming data:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchAndEnrichLiveData(), fetchUpcomingData()]);
      } catch (error) {
        console.error('Error during initialization:', error);
        setError(error);
      }
    };

    initializeData();
  }, []);

  // Polling for live matches
  useEffect(() => {
    if (isInitialFetch) return;

    const intervalId = setInterval(() => {
      fetchAndEnrichLiveData();
    }, 10000); // Every 10 seconds

    return () => clearInterval(intervalId);
  }, [isInitialFetch]);

  return {
    liveData,
    upcomingData,
    isLoading,
    isInitialFetch,
    error,
    refreshLiveData: fetchAndEnrichLiveData,
    refreshUpcomingData: fetchUpcomingData,
  };
};
