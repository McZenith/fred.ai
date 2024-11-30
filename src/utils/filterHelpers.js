// Filter predicates for match events
export const filterPredicates = {
  firstHalf: (event) => {
    // Get the status from matchStatus.name
    const status = event.matchStatus || '';

    return status === 'H1';
  },

  secondHalf: (event) => {
    // Get the status from matchStatus.name
    const status = event.matchStatus || '';

    return status === 'H2';
  },

  halftime: (event) => {
    const status = event.matchStatus || '';
    return status === 'HT';
  },

  highProbability: (event) => {
    const analysis = event.enrichedData?.details?.values;
    if (!analysis) return false;
    //&& event.enrichedData?.prematchMarketData
    return Object.keys(analysis).length > 10;
  },

  inCart: (event, isInCart) => {
    return isInCart(event.eventId);
  },

  'over0.5': (event) => {
    const [homeScore, awayScore] = (event.setScore || '0:0')
      .split(':')
      .map(Number);
    return homeScore + awayScore > 0.5;
  },

  'over1.5': (event) => {
    const [homeScore, awayScore] = (event.setScore || '0:0')
      .split(':')
      .map(Number);
    return homeScore + awayScore > 1.5;
  },

  'over2.5': (event) => {
    const [homeScore, awayScore] = (event.setScore || '0:0')
      .split(':')
      .map(Number);
    return homeScore + awayScore > 2.5;
  },

  'over3.5': (event) => {
    const [homeScore, awayScore] = (event.setScore || '0:0')
      .split(':')
      .map(Number);
    return homeScore + awayScore > 3.5;
  },
};

export const applyFilters = (data, activeFilters, searchTerm, isInCart) => {
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
        try {
          const result =
            filter === 'inCart' ? predicate(event, isInCart) : predicate(event);

    
          return result;
        } catch (error) {
          return true;
        }
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
};
