'use client';

import { useState } from 'react';
import { MatchCard } from '@/components/MatchCard';
import { HeaderControls } from '@/components/HeaderControls';
import { FilterBar } from '@/components/FilterBar';
import { Spinner } from './components/Spinner';
import { useCart } from '@/hooks/useCart';
import { useMatchData } from '@/hooks/useMatchData';
import { useMarketTypes } from '@/hooks/useMarketTypes';
import {
  isHighProbabilityMatch,
  getMatchHalf,
  parseScore,
  debug,
} from '@/utils/matchHelpers';
import { teamsObjectList } from '@/utils/ratedMatch';

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState(['desc']);
  const [expandedCard, setExpandedCard] = useState(null);
  const [activeTab, setActiveTab] = useState('live');
  const [copyMessage, setCopyMessage] = useState('');

  const { marketTypes } = useMarketTypes();
  const {
    liveData,
    upcomingData,
    isLoading,
    isInitialFetch,
    fetchLiveData,
    fetchUpcomingData,
  } = useMatchData();
  const {
    cart,
    showCartOnly,
    setShowCartOnly,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,
  } = useCart();

  const toggleCard = (eventId) => {
    setExpandedCard(expandedCard === eventId ? null : eventId);
  };

  // Add handleTabChange function
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'live') {
      fetchLiveData();
    } else {
      fetchUpcomingData();
    }
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

  const filterAndSortData = (data) => {
    if (!data) return [];

    let filteredData = data.filter(
      (event) =>
        event.homeTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (showCartOnly) {
      filteredData = filteredData.filter((event) => isInCart(event.eventId));
    }

    // Handle half filters first
    const hasHalfFilter = activeFilters.some((filter) =>
      ['firstHalf', 'secondHalf', 'halftime'].includes(filter)
    );

    if (hasHalfFilter) {
      filteredData = filteredData.filter((event) => {
        const currentHalf = getMatchHalf(event);
        debug.logMatchDetails(event);
        return activeFilters.includes(currentHalf);
      });
    }

    // Handle other filters
    filteredData = filteredData.filter((event) => {
      return activeFilters.every((filter) => {
        switch (filter) {
          case 'firstHalf':
          case 'secondHalf':
          case 'halftime':
            // Already handled above
            return true;

          case 'highProbability':
            return event.markets.some((market) =>
              market.outcomes.some(
                (outcome) =>
                  outcome.probability > 0.7 &&
                  isHighProbabilityMatch(
                    event.homeTeamName,
                    event.awayTeamName,
                    teamsObjectList
                  )
              )
            );

          case 'inCart':
            return isInCart(event.eventId);

          case 'over1.5':
          case 'over2.5':
          case 'over3.5':
            const threshold = filter.slice(4);
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

          default:
            return true;
        }
      });
    });

    // Handle sorting
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

        <HeaderControls
          activeTab={activeTab}
          totalMatches={totalMatches}
          onTabChange={handleTabChange}
          cart={cart}
          showCartOnly={showCartOnly}
          setShowCartOnly={setShowCartOnly}
          clearCart={clearCart}
          onCopyHomeTeams={copyHomeTeams}
          copyMessage={copyMessage}
        />

        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeFilters={activeFilters}
          toggleFilter={(filter) => {
            const newFilters = activeFilters.includes(filter)
              ? activeFilters.filter((f) => f !== filter)
              : [...activeFilters, filter];
            setActiveFilters(newFilters);
          }}
          removeFilter={(filter) => {
            setActiveFilters(activeFilters.filter((f) => f !== filter));
          }}
          clearFilters={() => setActiveFilters(['desc'])}
        />

        <div className='space-y-8'>
          {isLoading && isInitialFetch ? (
            <div className='flex justify-center items-center mt-12'>
              <Spinner className='w-12 h-12 text-blue-500' />
            </div>
          ) : (
            filteredData?.map((event) => (
              <MatchCard
                key={event.eventId}
                event={event}
                isExpanded={expandedCard === event.eventId}
                onToggle={toggleCard}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                isInCart={isInCart}
                activeTab={activeTab}
                highProbability={isHighProbabilityMatch(
                  event.homeTeamName,
                  event.awayTeamName,
                  teamsObjectList
                )}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;