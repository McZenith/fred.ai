import { useState, useEffect } from 'react';

export const useMarketTypes = () => {
  const [marketTypes, setMarketTypes] = useState([]);
  const [isLoadingMarketTypes, setIsLoadingMarketTypes] = useState(true);

  const fetchMarketTypes = async () => {
    try {
      const response = await fetch('/api/getSportMonkCoreTypes', {
        cache: 'no-store',
      });
      const result = await response.json();

      if (result.data) {
        // Group market types by model_type for easier access
        const groupedTypes = result.data.types.reduce((acc, type) => {
          if (!acc[type.model_type]) {
            acc[type.model_type] = [];
          }
          acc[type.model_type].push(type);
          return acc;
        }, {});

        setMarketTypes(groupedTypes);
      }
    } catch (error) {
      console.error('Error fetching market types:', error);
    } finally {
      setIsLoadingMarketTypes(false);
    }
  };

  useEffect(() => {
    fetchMarketTypes();
  }, []);

  return { marketTypes, isLoadingMarketTypes };
};
