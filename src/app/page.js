'use client';
import { useEffect, useState } from 'react';
import {
  FaSearch,
  FaAngleDown,
  FaAngleUp,
  FaInfoCircle,
  FaClipboard,
} from 'react-icons/fa';
import { Spinner } from '@/app/components/Spinner';

const Home = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByTime, setSortByTime] = useState('none');
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedTournaments, setExpandedTournaments] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [copyMessage, setCopyMessage] = useState('');

  const fetchLiveData = () => {
    setIsLoading(true);
    fetch('/api/getData', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        setLiveData(result.data);
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
        setUpcomingData(result.data.tournaments);
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

  const toggleTournament = (tournamentName) => {
    setExpandedTournaments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tournamentName)) {
        newSet.delete(tournamentName);
      } else {
        newSet.add(tournamentName);
      }
      return newSet;
    });
  };

  const availableTournaments =
    activeTab === 'live'
      ? [...new Set(liveData.map((tournament) => tournament.name))]
      : [...new Set(upcomingData.map((tournament) => tournament.name))];

  // Function to filter by markets with "Over 1.5" probability > 0.7
  const filterByOver1_5Probability = (event) => {
    // Extract current score
    const currentScore = parseScore(event.setScore); // Helper function to calculate the total score

    // Check if the match has less than 2 goals and "Over 1.5" probability is > 0.7
    return (
      currentScore < 2 &&
      event.markets.some((market) =>
        market.outcomes.some(
          (outcome) => outcome.desc === 'Over 1.5' && outcome.probability > 0.7
        )
      )
    );
  };


  const filterByOver2_5Probability = (event) => {
    // Extract current score
    const currentScore = parseScore(event.setScore); // Helper function to calculate the total score

    // Check if the match has less than 2 goals and "Over 1.5" probability is > 0.7
    return (
      currentScore < 2 &&
      event.markets.some((market) =>
        market.outcomes.some(
          (outcome) => outcome.desc === 'Over 2.5' && outcome.probability > 0.7
        )
      )
    );
  };

  const filterByOver3_5Probability = (event) => {
    // Extract current score
    const currentScore = parseScore(event.setScore); // Helper function to calculate the total score

    // Check if the match has less than 2 goals and "Over 1.5" probability is > 0.7
    return (
      currentScore < 2 &&
      event.markets.some((market) =>
        market.outcomes.some(
          (outcome) => outcome.desc === 'Over 3.5' && outcome.probability > 0.7
        )
      )
    );
  };

  // Helper function to parse and sum up the score
  function parseScore(scoreString) {
    // Assuming the score is in the format "1-0", "2-2", etc.
    if (!scoreString || typeof scoreString !== 'string') return 0;

    const [homeScore, awayScore] = scoreString
      .split(':')
      .map((s) => parseInt(s.trim(), 10));

    // Sum the scores from both teams
    return (
      (isNaN(homeScore) ? 0 : homeScore) + (isNaN(awayScore) ? 0 : awayScore)
    );
  }

  const filterAndSortData = (data) => {
    let filteredData = data.filter(
      (tournament) =>
        (!selectedTournament || tournament.name === selectedTournament) &&
        tournament.events.some(
          (event) =>
            event.homeTeamName
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            event.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    if (sortByTime === 'over1.5') {
      // Filter by "Over 1.5" probability > 0.7
      filteredData = filteredData.map((tournament) => ({
        ...tournament,
        events: tournament.events.filter(filterByOver1_5Probability),
      }));
    } else if (sortByTime === 'over2.5') {
      // Filter by "Over 2.5" probability > 0.7
      filteredData = filteredData.map((tournament) => ({
        ...tournament,
        events: tournament.events.filter(filterByOver2_5Probability),
      }));
    } else if (sortByTime === 'over3.5') {
      // Filter by "Over 3.5" probability > 0.7
      filteredData = filteredData.map((tournament) => ({
        ...tournament,
        events: tournament.events.filter(filterByOver3_5Probability),
      }));
    } else if (sortByTime !== 'none') {
      // Flatten the data structure when sorting by time
      let allEvents = filteredData.flatMap((tournament) =>
        tournament.events.map((event) => ({
          ...event,
          tournamentName: tournament.name,
        }))
      );

      allEvents = allEvents.filter(
        (event) =>
          event.homeTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      allEvents.sort((a, b) => {
        const timeA = new Date(a.estimateStartTime).getTime();
        const timeB = new Date(b.estimateStartTime).getTime();
        return sortByTime === 'asc' ? timeA - timeB : timeB - timeA;
      });

      return allEvents; // Return all sorted events in a flat array
    } else {
      // Keep the tournament structure when not sorting by time
      return filteredData.map((tournament) => ({
        ...tournament,
        events: tournament.events.filter(
          (event) =>
            event.homeTeamName
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            event.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      }));
    }

    return filteredData;
  };

  const filteredLiveData = filterAndSortData(liveData);
  const filteredUpcomingData = filterAndSortData(upcomingData);

  const totalMatches =
    activeTab === 'live'
      ? Array.isArray(filteredLiveData)
        ? sortByTime !== 'none'
          ? filteredLiveData.length // When sorted by time, it's a flat array of events
          : filteredLiveData.reduce(
              (sum, tournament) => sum + (tournament.events?.length || 0),
              0
            )
        : 0
      : Array.isArray(filteredUpcomingData)
      ? sortByTime !== 'none'
        ? filteredUpcomingData.length // When sorted by time, it's a flat array of events
        : filteredUpcomingData.reduce(
            (sum, tournament) => sum + (tournament.events?.length || 0),
            0
          )
      : 0;

  const copyHomeTeams = () => {
    // Get the home team names from the currently filtered matches
    const dataToCopy = (
      activeTab === 'live' ? filteredLiveData : filteredUpcomingData
    )

      .flatMap((tournament) =>
        tournament.events.map((event) => event.homeTeamName)
      )
      .join('\n');

    console.log(dataToCopy);

    if (dataToCopy.length > 0) {
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
              setSelectedTournament(null);
              setSortByTime('none');
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
              setSelectedTournament(null);
              setSortByTime('none');
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
          <div className='flex flex-col md:flex-row items-center justify-between mb-8'>
            <div className='relative mb-4 md:mb-0 md:mr-4 flex-1'>
              <input
                type='text'
                placeholder='Search teams...'
                className='pl-12 pr-4 py-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className='w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400' />
            </div>
            <div className='relative'>
              <select
                className='pl-4 pr-10 py-3 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full md:w-auto'
                value={sortByTime}
                onChange={(e) => setSortByTime(e.target.value)}
              >
                <option value='none'>No Time Sorting</option>
                <option value='asc'>Sort by Time: Ascending</option>
                <option value='desc'>Sort by Time: Descending</option>
                <option value='over1.5'>
                  Filter by Over 1.5 (Probability)
                </option>
                <option value='over2.5'>
                  Filter by Over 2.5 (Probability)
                </option>
                <option value='over3.5'>
                  Filter by Over 3.5 (Probability)
                </option>
              </select>
              <FaAngleDown className='w-5 h-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none' />
            </div>
          </div>

          {sortByTime === 'none' && (
            <div className='flex overflow-x-auto space-x-2 py-2'>
              <button
                className={`py-2 px-4 whitespace-nowrap rounded-lg font-semibold transition-colors duration-300 ${
                  !selectedTournament
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-blue-100'
                }`}
                onClick={() => {
                  setSelectedTournament(null);
                  setExpandedTournaments(new Set());
                }}
              >
                All Tournaments
              </button>
              {availableTournaments.map((tournamentName) => (
                <button
                  key={tournamentName}
                  className={`py-2 px-4 whitespace-nowrap rounded-lg font-semibold transition-colors duration-300 ${
                    selectedTournament === tournamentName
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-blue-100'
                  }`}
                  onClick={() => {
                    setSelectedTournament(tournamentName);
                    setExpandedTournaments(new Set([tournamentName]));
                  }}
                >
                  {tournamentName}
                </button>
              ))}
            </div>
          )}
        </div>

        {sortByTime === 'none' && (
          <div>
            <h2 className='text-3xl font-semibold mb-6 text-center'>
              All Matches
            </h2>
            <div className='space-y-8'>
              {(activeTab === 'live'
                ? filteredLiveData
                : filteredUpcomingData
              ).map((tournament) => (
                <div key={tournament.name}>
                  <div
                    className='flex items-center justify-between cursor-pointer'
                    onClick={() => toggleTournament(tournament.name)}
                  >
                    <h2 className='text-3xl font-semibold mb-6'>
                      {tournament.name}
                    </h2>
                    <button>
                      {expandedTournaments.has(tournament.name) ? (
                        <FaAngleUp className='text-blue-500' />
                      ) : (
                        <FaAngleDown className='text-blue-500' />
                      )}
                    </button>
                  </div>

                  {expandedTournaments.has(tournament.name) &&
                    tournament.events.map((event) => (
                      <div
                        key={event.eventId}
                        className={`p-6 mb-4 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300 cursor-pointer`}
                        onClick={() => toggleCard(event.eventId)}
                      >
                        <div className='flex items-center justify-between'>
                          <p className='text-xl font-bold mb-2'>
                            {event.homeTeamName} vs {event.awayTeamName}
                          </p>
                          <p className='text-sm text-gray-500'>
                            Markets Available: {event.markets.length}
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
                                Status: {event.matchStatus} | Period:{' '}
                                {event.period}
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
                                  {event.playedSeconds}
                                </span>
                              </p>
                            </>
                          )}
                          <p>
                            Estimated Start Time:{' '}
                            <span className='text-gray-500'>
                              {new Date(
                                event.estimateStartTime
                              ).toLocaleString()}
                            </span>
                          </p>
                        </div>

                        {expandedCard === event.eventId && (
                          <div className='mt-4'>
                            <h3 className='text-lg font-semibold mb-4 flex items-center'>
                              <FaInfoCircle className='mr-2 text-blue-500' />
                              Betting Markets
                            </h3>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                              {event.markets.map((market) => (
                                <div key={market.id} className='border-t pt-4'>
                                  <h4 className='font-semibold mb-1 text-gray-900'>
                                    {market.name}
                                  </h4>
                                  <ul className='list-disc ml-5'>
                                    {market.outcomes.map((outcome) => (
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
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* When sorting by time, just display a header and all matches flat */}
        {sortByTime !== 'none' &&
          sortByTime !== 'over1.5' &&
          sortByTime !== 'over2.5' &&
          sortByTime !== 'over3.5' && (
            <div>
              <h2 className='text-3xl font-semibold mb-6 text-center'>
                Sorted by Time
              </h2>
              {filteredLiveData.length === 0 && isInitialFetch && isLoading && (
                <div className='flex justify-center items-center mt-12'>
                  <Spinner className='w-12 h-12 text-blue-500' />
                </div>
              )}
              <div className='space-y-8'>
                {filteredLiveData.map((event) => (
                  <div
                    key={event.eventId}
                    className='p-6 mb-4 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300 cursor-pointer'
                    onClick={() => toggleCard(event.eventId)}
                  >
                    <div className='flex items-center justify-between'>
                      <p className='text-xl font-bold mb-2'>
                        {event.homeTeamName} vs {event.awayTeamName}
                      </p>
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
                              {event.playedSeconds}
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
                    </div>

                    {expandedCard === event.eventId && (
                      <div className='mt-4'>
                        <h3 className='text-lg font-semibold mb-4 flex items-center'>
                          <FaInfoCircle className='mr-2 text-blue-500' />
                          Betting Markets
                        </h3>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                          {event.markets.map((market) => (
                            <div key={market.id} className='border-t pt-4'>
                              <h4 className='font-semibold mb-1 text-gray-900'>
                                {market.name}
                              </h4>
                              <ul className='list-disc ml-5'>
                                {market.outcomes.map((outcome) => (
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
                ))}
              </div>
            </div>
          )}

        {/* Filter by Over 1.5 (Probability > 0.7) */}
        {(sortByTime === 'over1.5' ||
          sortByTime === 'over2.5' ||
          sortByTime === 'over3.5') && (
          <div>
            <h2 className='text-3xl font-semibold mb-6 text-center'>
              Filtered by {sortByTime}
            </h2>
            <div className='space-y-8'>
              {(activeTab === 'live'
                ? filteredLiveData
                : filteredUpcomingData
              ).map((tournament) => (
                <div key={tournament.name}>
                  <h3 className='text-2xl font-bold mb-4'>{tournament.name}</h3>
                  {tournament.events.map((event) => (
                    <div
                      key={event.eventId}
                      className='p-6 mb-4 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300 cursor-pointer'
                      onClick={() => toggleCard(event.eventId)}
                    >
                      <div className='flex items-center justify-between'>
                        <p className='text-xl font-bold mb-2'>
                          {event.homeTeamName} vs {event.awayTeamName}
                        </p>
                        <p className='text-sm text-gray-500'>
                          Markets Available: {event.markets.length}
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
                              Status: {event.matchStatus} | Period:{' '}
                              {event.period}
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
                                {event.playedSeconds}
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
                      </div>

                      {expandedCard === event.eventId && (
                        <div className='mt-4'>
                          <h3 className='text-lg font-semibold mb-4 flex items-center'>
                            <FaInfoCircle className='mr-2 text-blue-500' />
                            Betting Markets
                          </h3>
                          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            {event.markets.map((market) => (
                              <div key={market.id} className='border-t pt-4'>
                                <h4 className='font-semibold mb-1 text-gray-900'>
                                  {market.name}
                                </h4>
                                <ul className='list-disc ml-5'>
                                  {market.outcomes.map((outcome) => (
                                    <li
                                      key={outcome.id}
                                      className={`mb-2 ${
                                        outcome.probability > 0.7
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
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
