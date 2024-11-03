'use client';
import { useEffect, useState } from 'react';
import {
  FaSearch,
  FaAngleDown,
  FaAngleUp,
  FaInfoCircle,
  FaClipboard,
  FaTimes,
} from 'react-icons/fa';
import { Spinner } from '@/app/components/Spinner';
import { teamsObjectList } from '../utils/ratedMatch';

const Home = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState(['desc']);
  const [expandedCard, setExpandedCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [copyMessage, setCopyMessage] = useState('');

  const normalizeMatchPeriod = (period) => {
    if (!period) return null;
    // Convert all possible first half indicators to '1H'
    if (['1H', 'H1', 'FIRST_HALF', '1st', 'First Half', '1'].includes(period))
      return '1H';
    // Convert all possible second half indicators to '2H'
    if (['2H', 'H2', 'SECOND_HALF', '2nd', 'Second Half', '2'].includes(period))
      return '2H';
    return period;
  };

  const filterOptions = [
    { value: 'asc', label: 'Sort by Time: Ascending', isDefault: false },
    { value: 'desc', label: 'Sort by Time: Descending', isDefault: true },
    { value: 'over1.5', label: 'Over 1.5 (Probability)', isDefault: false },
    { value: 'over2.5', label: 'Over 2.5 (Probability)', isDefault: false },
    { value: 'over3.5', label: 'Over 3.5 (Probability)', isDefault: false },
    {
      value: 'highProbability',
      label: 'High Probability Matches',
      isDefault: false,
    },
    { value: 'firstHalf', label: 'First Half', isDefault: false },
    { value: 'secondHalf', label: 'Second Half', isDefault: false },
    { value: 'halftime', label: 'Half Time', isDefault: false },
  ];

  const fetchLiveData = () => {
    setIsLoading(true);
    fetch('/api/getData', { cache: 'no-store' })
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
    fetch('/api/getUpcomingData', { cache: 'no-store' })
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

  const toggleCard = (eventId) => {
    setExpandedCard(expandedCard === eventId ? null : eventId);
  };

  const getMatchHalf = (event) => {
    // Check for halftime first
    if (event.matchStatus === 'HT' || event.period === 'HT') return 'halftime';

    const normalizedPeriod = normalizeMatchPeriod(event.period);

    // Direct period check
    if (normalizedPeriod === '1H') return 'firstHalf';
    if (normalizedPeriod === '2H') return 'secondHalf';

    // If we don't have a clear period indicator, try to use the time
    if (event.playedSeconds) {
      const [minutes] = event.playedSeconds.split(':').map(Number);
      if (!isNaN(minutes)) {
        if (minutes <= 45) return 'firstHalf';
        if (minutes > 45) return 'secondHalf';
      }
    }

    return null;
  };

  const isHighProbabilityMatch = (homeTeam, awayTeam) => {
    return teamsObjectList?.some((team) => {
      const homeTeamExists =
        typeof homeTeam === 'string' && homeTeam.includes(team.homeTeam);
      const awayTeamExists =
        typeof awayTeam === 'string' && awayTeam.includes(team.awayTeam);
      const teamHomeExists =
        typeof team.homeTeam === 'string' && team.homeTeam.includes(homeTeam);
      const teamAwayExists =
        typeof team.awayTeam === 'string' && team.awayTeam.includes(awayTeam);

      return (
        (homeTeamExists || teamHomeExists) && (awayTeamExists || teamAwayExists)
      );
    });
  };

  const filterHighProbabilityMatches = (event) => {
    const highProbabilityOutcome = event.markets.some((market) =>
      market.outcomes.some(
        (outcome) =>
          outcome.probability > 0.7 &&
          isHighProbabilityMatch(event.homeTeamName, event.awayTeamName)
      )
    );
    return highProbabilityOutcome;
  };

  const parseScore = (scoreString) => {
    if (!scoreString || typeof scoreString !== 'string') return 0;
    const [homeScore, awayScore] = scoreString
      .split(':')
      ?.map((s) => parseInt(s.trim(), 10));
    return (
      (isNaN(homeScore) ? 0 : homeScore) + (isNaN(awayScore) ? 0 : awayScore)
    );
  };

  const filterAndSortData = (data) => {
    if (!data) return [];

    let filteredData = data.filter(
      (event) =>
        event.homeTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    activeFilters.forEach((filter) => {
      switch (filter) {
        case 'highProbability':
          filteredData = filteredData.filter(filterHighProbabilityMatches);
          break;

        case 'firstHalf':
        case 'secondHalf':
        case 'halftime':
          filteredData = filteredData.filter((event) => {
            const half = getMatchHalf(event);
            // Debug logging
            console.log('Event:', {
              teams: `${event.homeTeamName} vs ${event.awayTeamName}`,
              period: event.period,
              normalizedPeriod: normalizeMatchPeriod(event.period),
              playedTime: event.playedSeconds,
              detectedHalf: half,
              expectedHalf: filter,
              matched: half === filter,
            });
            return half === filter;
          });
          break;

        case 'over1.5':
        case 'over2.5':
        case 'over3.5':
          const threshold = filter.slice(4);
          filteredData = filteredData.filter((event) => {
            const currentScore = parseScore(event.setScore);
            return (
              currentScore < 2 &&
              event.markets.some((market) =>
                market.outcomes.some(
                  (outcome) =>
                    outcome.desc === `Over ${threshold}` &&
                    outcome.probability > 0.7
                )
              )
            );
          });
          break;
      }
    });

    if (activeFilters.includes('asc') || activeFilters.includes('desc')) {
      const sortDirection = activeFilters.includes('asc') ? 'asc' : 'desc';
      filteredData.sort((a, b) => {
        const timeA = new Date(a.estimateStartTime).getTime();
        const timeB = new Date(b.estimateStartTime).getTime();
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      });
    }

    return filteredData;
  };

  const toggleFilter = (filterValue) => {
    setActiveFilters((prev) => {
      if (filterValue === 'asc' || filterValue === 'desc') {
        const withoutSorting = prev.filter((f) => f !== 'asc' && f !== 'desc');
        return prev.includes(filterValue)
          ? [...withoutSorting, 'desc']
          : [...withoutSorting, filterValue];
      }

      // Handle half-time filters mutual exclusivity
      if (['firstHalf', 'secondHalf', 'halftime'].includes(filterValue)) {
        const withoutHalfFilters = prev.filter(
          (f) => !['firstHalf', 'secondHalf', 'halftime'].includes(f)
        );
        return prev.includes(filterValue)
          ? withoutHalfFilters
          : [...withoutHalfFilters, filterValue];
      }

      return prev.includes(filterValue)
        ? prev.filter((f) => f !== filterValue)
        : [...prev, filterValue];
    });
  };

  const removeFilter = (filterValue) => {
    setActiveFilters((prev) => {
      const newFilters = prev.filter((f) => f !== filterValue);
      const hasSortFilter = newFilters.some((f) => f === 'asc' || f === 'desc');
      if (!hasSortFilter && (filterValue === 'asc' || filterValue === 'desc')) {
        return [...newFilters, 'desc'];
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setActiveFilters(['desc']); // Reset to default desc filter
  };

  const getOver1_5Market = (event) => {
    if (!Array.isArray(event.markets)) return null;

    const market = event.markets.find((market) =>
      market.outcomes.some((outcome) => outcome.desc === 'Over 1.5')
    );

    if (market) {
      const outcome = market.outcomes.find(
        (outcome) => outcome.desc === 'Over 1.5'
      );

      if (outcome && outcome.probability > 0.7) {
        return {
          marketName: market.name,
          odds: outcome.odds,
          probability: outcome.probability,
        };
      }
    }

    return null;
  };

  const copyHomeTeams = () => {
    const dataToCopy = (
      activeTab === 'live'
        ? filterAndSortData(liveData)
        : filterAndSortData(upcomingData)
    )
      ?.map((event) => event.homeTeamName)
      .join('\n');

    if (dataToCopy?.length > 0) {
      navigator.clipboard
        .writeText(dataToCopy)
        .then(() => {
          setCopyMessage('Home teams copied!');
          setTimeout(() => setCopyMessage(''), 3000);
        })
        .catch(() => setCopyMessage('Failed to copy.'));
    } else {
      setCopyMessage('No matches to copy.');
      setTimeout(() => setCopyMessage(''), 3000);
    }
  };

  const filteredData =
    activeTab === 'live'
      ? filterAndSortData(liveData)
      : filterAndSortData(upcomingData);

  const totalMatches = filteredData?.length || 0;

  return (
    <div className='bg-gradient-to-b from-blue-50 to-gray-100 min-h-screen flex items-center justify-center'>
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-5xl font-bold text-center mb-8 text-blue-700'>
          ⚽ Fred.ai
        </h1>

        <div className='mb-4'>
          <button
            className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 relative mr-4 ${
              activeTab === 'live'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-100'
            }`}
            onClick={() => {
              setActiveTab('live');
              fetchLiveData();
            }}
          >
            Live Matches
            {activeTab === 'live' && totalMatches > 0 && (
              <span className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-full'>
                {totalMatches}
              </span>
            )}
          </button>
          <button
            className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 relative ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-100'
            }`}
            onClick={() => {
              setActiveTab('upcoming');
              fetchUpcomingData();
            }}
          >
            Upcoming Matches
            {activeTab === 'upcoming' && totalMatches > 0 && (
              <span className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-full'>
                {totalMatches}
              </span>
            )}
          </button>
          <button
            onClick={copyHomeTeams}
            className='py-2 px-4 rounded-lg font-semibold transition-colors duration-300 relative mr-4 ml-4 bg-blue-600 text-white'
          >
            <FaClipboard className='mr-2 inline' />
            Copy Home Teams
          </button>
          {copyMessage && (
            <p className='mt-2 text-sm text-green-500'>{copyMessage}</p>
          )}
        </div>

        <div className='bg-white rounded-xl shadow-xl p-8 mb-8'>
          <div className='flex flex-col space-y-4'>
            <div className='relative flex-1'>
              <input
                type='text'
                placeholder='Search teams...'
                className='pl-12 pr-4 py-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className='w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400' />
            </div>

            <div className='flex flex-wrap gap-2'>
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter(option.value)}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    activeFilters.includes(option.value)
                      ? 'bg-blue-600 text-white'
                      : option.isDefault
                      ? 'bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${
                    option.isDefault && !activeFilters.includes(option.value)
                      ? 'ring-2 ring-blue-200'
                      : ''
                  }`}
                >
                  {option.isDefault &&
                    !activeFilters.includes(option.value) && (
                      <span className='text-xs font-semibold text-blue-500 mr-1'>
                        (Default){' '}
                      </span>
                    )}
                  {option.label}
                </button>
              ))}
            </div>

            {activeFilters.length > 0 && (
              <div className='flex flex-wrap gap-2 mt-4'>
                <span className='text-sm text-gray-500'>Active Filters:</span>
                {activeFilters.map((filter) => (
                  <span
                    key={filter}
                    className='inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm'
                  >
                    {filterOptions.find((opt) => opt.value === filter)?.label}
                    <button
                      onClick={() => removeFilter(filter)}
                      className='ml-2 hover:text-blue-900'
                    >
                      <FaTimes className='w-3 h-3' />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearFilters}
                  className='text-sm text-red-600 hover:text-red-800'
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        <div className='space-y-8'>
          {isLoading && isInitialFetch ? (
            <div className='flex justify-center items-center mt-12'>
              <Spinner className='w-12 h-12 text-blue-500' />
            </div>
          ) : (
            filteredData?.map((event) => {
              const over1_5Market = getOver1_5Market(event);
              const highProbability = isHighProbabilityMatch(
                event.homeTeamName,
                event.awayTeamName
              );
              const matchHalf = getMatchHalf(event);
              const cardClass = `p-6 mb-4 rounded-lg shadow-lg ${
                highProbability
                  ? 'bg-green-100 border-2 border-green-500'
                  : 'bg-white'
              } hover:shadow-xl transition-shadow duration-300 cursor-pointer`;

              return (
                <div
                  key={event.eventId}
                  className={cardClass}
                  onClick={() => toggleCard(event.eventId)}
                >
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-xl font-bold mb-2'>
                        {event.homeTeamName} vs {event.awayTeamName}
                      </p>
                      <p className='text-sm text-gray-600'>
                        Tournament: {event.tournamentName}
                      </p>
                      {matchHalf && (
                        <span className='inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium mt-1'>
                          {matchHalf === 'firstHalf'
                            ? '1st Half'
                            : matchHalf === 'secondHalf'
                            ? '2nd Half'
                            : 'Half Time'}
                        </span>
                      )}
                    </div>
                    <p className='text-sm text-gray-500'>
                      Markets Available: {event.markets?.length}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCard(event.eventId);
                      }}
                      className='focus:outline-none text-blue-500'
                    >
                      {expandedCard === event.eventId ? (
                        <FaAngleUp className='w-6 h-6' />
                      ) : (
                        <FaAngleDown className='w-6 h-6' />
                      )}
                    </button>
                  </div>

                  <div className='text-sm text-gray-700 mb-4'>
                    {activeTab === 'live' && (
                      <>
                        <p>
                          Status: {event.matchStatus} | Period: {event.period}
                        </p>
                        <p>
                          Score:{' '}
                          <span className='text-blue-600 font-semibold'>
                            {event.setScore}
                          </span>
                        </p>
                        <p>
                          Played Time:{' '}
                          <span className='text-blue-600 font-semibold'>
                            {event.playedSeconds || '0:00'}
                          </span>
                        </p>
                      </>
                    )}
                    <p>
                      Estimated Start Time:{' '}
                      <span className='text-gray-500'>
                        {new Date(event.estimateStartTime).toLocaleString()}
                      </span>
                    </p>
                    {over1_5Market && (
                      <p className='text-sm text-blue-600 font-semibold mb-4'>
                        Market: {over1_5Market.marketName} | Odds:{' '}
                        {over1_5Market.odds} | Probability:{' '}
                        {over1_5Market.probability}
                      </p>
                    )}
                  </div>

                  {expandedCard === event.eventId && (
                    <div className='mt-4'>
                      <h3 className='text-lg font-semibold mb-4 flex items-center'>
                        <FaInfoCircle className='mr-2 text-blue-500' />
                        Betting Markets
                      </h3>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        {event.markets?.map((market) => (
                          <div key={market.id} className='border-t pt-4'>
                            <h4 className='font-semibold mb-1 text-gray-900'>
                              {market.name}
                            </h4>
                            <ul className='list-disc ml-5'>
                              {market.outcomes?.map((outcome) => (
                                <li
                                  key={outcome.id}
                                  className={`mb-2 ${
                                    outcome.probability > 0.6
                                      ? 'text-blue-600 font-semibold'
                                      : ''
                                  }`}
                                >
                                  {outcome.desc}: Odds{' '}
                                  <span className='font-semibold'>
                                    {outcome.odds}
                                  </span>
                                  <>
                                    , Probability:{' '}
                                    <span className='font-semibold'>
                                      {outcome.probability}
                                    </span>
                                  </>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;