import { useState, useEffect } from 'react';

export const useMatchData = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);

  const fetchLiveData = () => {
    setIsLoading(true);
    return fetch('/api/getData', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        const flattenedData = result.data.flatMap((tournament) =>
          tournament.events.map((event) => ({
            ...event,
            tournamentName: tournament.name,
          }))
        );
        setLiveData(flattenedData);
        setIsLoading(false);
        setIsInitialFetch(false);
      })
      .catch((error) => {
        console.error('Error fetching live data:', error);
        setIsLoading(false);
      });
  };

  const fetchUpcomingData = () => {
    setIsLoading(true);
    return fetch('/api/getUpcomingData', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        const flattenedData = result.data.tournaments.flatMap((tournament) =>
          tournament.events.map((event) => ({
            ...event,
            tournamentName: tournament.name,
          }))
        );
        setUpcomingData(flattenedData);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching upcoming data:', error);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchLiveData();
    fetchUpcomingData();

    const intervalId = setInterval(() => {
      fetchLiveData();
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return {
    liveData,
    upcomingData,
    isLoading,
    isInitialFetch,
    fetchLiveData,
    fetchUpcomingData,
  };
};
