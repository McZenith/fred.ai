'use client';
import { useEffect, useState } from 'react';
import { FaSearch, FaAngleDown, FaAngleUp, FaInfoCircle } from 'react-icons/fa';
import { Spinner } from '@/app/components/Spinner';

export const fetchCache = 'force-no-store';

const Home = () => {
  const [liveData, setLiveData] = useState([]);
  const [upcomingData, setUpcomingData] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByPlayTime, setSortByPlayTime] = useState('asc');
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedTournaments, setExpandedTournaments] = useState(new Set()); // Track expanded tournaments
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [activeTab, setActiveTab] = useState('live');

  // Fetch data for live matches from the API
  const fetchLiveData = () => {
    setIsLoading(true);
    fetch('/api/getData')
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

  // Fetch data for upcoming matches from the API
  const fetchUpcomingData = () => {
    setIsLoading(true);
    fetch('/api/getUpcomingData')
      .then((response) => response.json())
      .then((result) => {
        setUpcomingData(result.data.tournaments); // Access the tournaments array
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
      // Do not reset expanded tournaments on refresh
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Toggle card expansion for match details
  const toggleCard = (eventId) => {
    setExpandedCard(expandedCard === eventId ? null : eventId);
  };

  // Toggle tournament expansion
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

  // Get list of all available tournaments from liveData or upcomingData
  const availableTournaments =
    activeTab === 'live'
      ? [...new Set(liveData.map((tournament) => tournament.name))]
      : [...new Set(upcomingData.map((tournament) => tournament.name))];

  // Filter and sort live and upcoming data based on selected tournament, search term, and sorting criteria
  const filteredLiveData = liveData
    .filter(
      (tournament) =>
        (!selectedTournament || tournament.name === selectedTournament) &&
        tournament.events.some(
          (event) =>
            event.homeTeamName
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            event.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    )
    .map((tournament) => ({
      ...tournament,
      events: tournament.events
        .filter(
          (event) =>
            event.homeTeamName
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            event.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) =>
          sortByPlayTime === 'asc'
            ? a.playedSeconds.localeCompare(b.playedSeconds)
            : b.playedSeconds.localeCompare(a.playedSeconds)
        ),
    }));

  const filteredUpcomingData = upcomingData
    .filter(
      (tournament) =>
        (!selectedTournament || tournament.name === selectedTournament) &&
        tournament.events.some(
          (event) =>
            event.homeTeamName
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            event.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    )
    .map((tournament) => ({
      ...tournament,
      events: tournament.events.filter(
        (event) =>
          event.homeTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }));

  // Calculate the total number of matches for the active tab
  const totalMatches =
    activeTab === 'live'
      ? filteredLiveData.reduce(
          (sum, tournament) => sum + tournament.events.length,
          0
        )
      : filteredUpcomingData.reduce(
          (sum, tournament) => sum + tournament.events.length,
          0
        );

  return (
    <div className='bg-gradient-to-b from-blue-50 to-gray-100 min-h-screen flex items-center justify-center'>
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-5xl font-bold text-center mb-8 text-blue-700'>
          ⚽ Fred.ai
        </h1>

        {/* Tabs for Live and Upcoming Matches */}
        <div className='mb-4'>
          <button
            className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 relative mr-4 ${
              activeTab === 'live'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-100'
            }`}
            onClick={() => {
              setActiveTab('live');
              setSelectedTournament(null); // Reset tournament when switching tabs
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
              setSelectedTournament(null); // Reset tournament when switching tabs
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
        </div>

        {/* Search Input */}
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
                value={sortByPlayTime}
                onChange={(e) => setSortByPlayTime(e.target.value)}
              >
                <option value='asc'>Sort by Play Time: Ascending</option>
                <option value='desc'>Sort by Play Time: Descending</option>
              </select>
              <FaAngleDown className='w-5 h-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none' />
            </div>
          </div>

          {/* Tournament Filter Tabs */}
          <div className='flex overflow-x-auto space-x-2 py-2'>
            <button
              className={`py-2 px-4 whitespace-nowrap rounded-lg font-semibold transition-colors duration-300 ${
                !selectedTournament
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-blue-100'
              }`}
              onClick={() => {
                setSelectedTournament(null);
                setExpandedTournaments(new Set()); // Collapse all tournaments when "All Tournaments" is clicked
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
                  setExpandedTournaments(new Set([tournamentName])); // Expand the selected tournament
                }}
              >
                {tournamentName}
              </button>
            ))}
          </div>
        </div>

        {/* Displaying Matches Based on Active Tab */}
        {isLoading && activeTab === 'live' && isInitialFetch ? (
          <div className='flex justify-center items-center mt-12'>
            <Spinner className='w-12 h-12 text-blue-500' />
          </div>
        ) : (
          <div className='space-y-8'>
            {activeTab === 'live'
              ? filteredLiveData.map((tournament) => (
                  <div key={tournament.id}>
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

                    {/* Conditionally render events if the tournament is expanded */}
                    {expandedTournaments.has(tournament.name) &&
                      tournament.events.map((event) => (
                        <div
                          key={event.eventId}
                          className={`p-6 mb-4 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300 cursor-pointer`}
                          onClick={() => toggleCard(event.eventId)} // Make the card clickable
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
                                e.stopPropagation(); // Prevent the click from bubbling to the card
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
                            <p>
                              Estimated Start Time:{' '}
                              <span className='text-gray-500'>
                                {new Date(
                                  event.estimateStartTime
                                ).toLocaleString()}
                              </span>
                            </p>
                          </div>

                          {/* Expanded Section for Full Details */}
                          {expandedCard === event.eventId && (
                            <div className='mt-4'>
                              <h3 className='text-lg font-semibold mb-4 flex items-center'>
                                <FaInfoCircle className='mr-2 text-blue-500' />
                                Betting Markets
                              </h3>
                              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                {event.markets.map((market) => (
                                  <div
                                    key={market.id}
                                    className='border-t pt-4'
                                  >
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
                                          , Probability:{' '}
                                          <span className='font-semibold'>
                                            {outcome.probability}
                                          </span>
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
                ))
              : // Upcoming Matches Section
                filteredUpcomingData.map((tournament) => (
                  <div key={tournament.id}>
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

                    {/* Conditionally render events if the tournament is expanded */}
                    {expandedTournaments.has(tournament.name) &&
                      tournament.events.map((event) => (
                        <div
                          key={event.eventId}
                          className={`p-6 mb-4 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300 cursor-pointer`}
                          onClick={() => toggleCard(event.eventId)} // Make the card clickable
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
                                e.stopPropagation(); // Prevent the click from bubbling to the card
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
                            <p>Match Status: {event.matchStatus}</p>
                            <p>
                              Estimated Start Time:{' '}
                              <span className='text-gray-500'>
                                {new Date(
                                  event.estimateStartTime
                                ).toLocaleString()}
                              </span>
                            </p>
                          </div>

                          {/* Expanded Section for Full Details */}
                          {expandedCard === event.eventId && (
                            <div className='mt-4'>
                              <h3 className='text-lg font-semibold mb-4 flex items-center'>
                                <FaInfoCircle className='mr-2 text-blue-500' />
                                Betting Markets
                              </h3>
                              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                {event.markets.map((market) => (
                                  <div
                                    key={market.id}
                                    className='border-t pt-4'
                                  >
                                    <h4 className='font-semibold mb-1 text-gray-900'>
                                      {market.name}
                                    </h4>
                                    <ul className='list-disc ml-5'>
                                      {market.outcomes.map((outcome) => (
                                        <li key={outcome.id} className='mb-2'>
                                          {outcome.desc}: Odds{' '}
                                          <span className='font-semibold'>
                                            {outcome.odds}
                                          </span>
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
        )}
      </div>
    </div>
  );
};

export default Home;
