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
    const analysis = event.enrichedData?.analysis;
    if (!analysis) return false;

    const homeProb = analysis.goalProbability?.home || 0;
    const awayProb = analysis.goalProbability?.away || 0;
    const confidence = analysis.recommendation?.confidence || 0;

    return homeProb > 65 || awayProb > 65 || confidence > 7;
  },

  inCart: (event, isInCart) => {
    return isInCart(event.eventId);
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

  // Log all match statuses for debugging
  console.log(
    'All Match Statuses:',
    filteredData.map((event) => ({
      eventId: event.eventId,
      status: event.matchStatus?.name,
      fullStatus: event.matchStatus,
    }))
  );

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

          // Log filter results
          console.log('Filter result:', {
            filter,
            eventId: event.eventId,
            matchStatus: event.matchStatus?.name,
            result,
          });

          return result;
        } catch (error) {
          console.error(`Error applying filter ${filter}:`, error);
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
