// hooks/useMatchData.js
import { useState, useEffect } from 'react';
import { enrichMatch } from '@/utils/matchEnricher';

export const useMatchData = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [error, setError] = useState(null);

  const hasValidData = (data) => {
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
  };

  const fetchAndEnrichLiveData = async () => {
    setIsLoading(true);
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
          flattenedData.map(async (match) => {
            const [initialData, realtimeData] = await Promise.all([
              enrichMatch.initial(match),
              enrichMatch.realtime(match),
            ]);

            return {
              ...match,
              enrichedData: {
                ...initialData?.enrichedData,
                ...realtimeData?.enrichedData,
              },
            };
          })
        );

        // Only update if we have valid enriched data
        if (hasValidData(initialEnriched)) {
          setLiveData(initialEnriched);
          setIsLoading(false);
        }
        return;
      }

      // Realtime enrichment
      const enrichedData = await Promise.all(
        flattenedData.map(async (match) => {
          const realtimeData = await enrichMatch.realtime(match);
          const initialData = liveData.find(
            (existingMatch) =>
              existingMatch.id === match.id ||
              existingMatch.matchId === match.matchId
          );

          return {
            ...realtimeData,
            enrichedData: {
              ...initialData?.enrichedData,
              ...realtimeData.enrichedData,
            },
          };
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

      // Only update if we have valid sorted data
      if (hasValidData(sortedData)) {
        setLiveData(sortedData);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
      setError(error);
      setIsLoading(false);
    } finally {
      setIsInitialFetch(false);
    }
  };

  const fetchUpcomingData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/getUpcomingData', {
        cache: 'no-store',
      });
      const result = await response.json();

      if (!result?.data) {
        console.error('Invalid upcoming data structure received:', result);
        setError(new Error('Invalid upcoming data received from server'));
        setUpcomingData([]); // Set empty array as fallback
        return;
      }

      // Handle different possible data structures consistently
      let flattenedData = [];

      // Safely handle array structure
      if (Array.isArray(result.data) && result.data.length > 0) {
        flattenedData = result.data
          .filter((tournament) => tournament && tournament.events)
          .flatMap((tournament) => {
            return Array.isArray(tournament.events)
              ? tournament.events.map((event) => ({
                  ...event,
                  tournamentName: tournament.name || 'Unknown Tournament',
                }))
              : [];
          });
      }
      // Safely handle object structure
      else if (result.data?.tournaments) {
        flattenedData = (result.data.tournaments || [])
          .filter((tournament) => tournament && tournament.events)
          .flatMap((tournament) => {
            return Array.isArray(tournament.events)
              ? tournament.events.map((event) => ({
                  ...event,
                  tournamentName: tournament.name || 'Unknown Tournament',
                }))
              : [];
          });
      }

      setUpcomingData(flattenedData);
    } catch (error) {
      console.error('Error fetching upcoming data:', error);
      setError(error);
      setUpcomingData([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

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
