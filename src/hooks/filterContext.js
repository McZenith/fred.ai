import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { filterPredicates } from '@/utils/filterHelpers';

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState(['desc']);

  const toggleFilter = useCallback((filter) => {
    setActiveFilters((prev) => {
      // Handle mutually exclusive sort filters
      if (filter === 'asc' || filter === 'desc') {
        const withoutSort = prev.filter((f) => f !== 'asc' && f !== 'desc');
        return [...withoutSort, filter];
      }

      return prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter];
    });
  }, []);

  const removeFilter = useCallback((filter) => {
    setActiveFilters((prev) => {
      const newFilters = prev.filter((f) => f !== filter);
      if (
        (filter === 'asc' || filter === 'desc') &&
        !newFilters.includes('desc') &&
        !newFilters.includes('asc')
      ) {
        return [...newFilters, 'desc'];
      }
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters(['desc']);
  }, []);

  const applyFilters = useCallback(
    (data, isInCart) => {
      if (!data?.length) return [];

      let filteredData = [...data];

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter((event) => {
          const searchableFields = [
            event.homeTeamName,
            event.awayTeamName,
            event.tournamentName,
            event.enrichedData?.matchInfo?.homeTeam?.name,
            event.enrichedData?.matchInfo?.awayTeam?.name,
          ].filter(Boolean);

          return searchableFields.some((field) =>
            field.toLowerCase().includes(searchLower)
          );
        });
      }

      // Apply active filters
      filteredData = filteredData.filter((event) => {
        return activeFilters.every((filter) => {
          // Skip sort filters
          if (filter === 'asc' || filter === 'desc') {
            return true;
          }

          const predicate = filterPredicates[filter];
          if (predicate) {
            return filter === 'inCart'
              ? predicate(event, isInCart)
              : predicate(event);
          }
          return true;
        });
      });

      // Apply sorting
      if (activeFilters.includes('asc') || activeFilters.includes('desc')) {
        const sortDirection = activeFilters.includes('asc') ? 'asc' : 'desc';
        filteredData.sort((a, b) => {
          const timeA = new Date(a.estimateStartTime || 0).getTime();
          const timeB = new Date(b.estimateStartTime || 0).getTime();
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        });
      }

      return filteredData;
    },
    [searchTerm, activeFilters]
  );

  const value = {
    searchTerm,
    setSearchTerm,
    activeFilters,
    toggleFilter,
    removeFilter,
    clearFilters,
    applyFilters,
  };

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
