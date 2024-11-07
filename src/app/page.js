'use client';

import { useState, useCallback, useMemo } from 'react';
import MatchCard from '@/components/MatchCard';
import { HeaderControls } from '@/components/HeaderControls';
import { FilterBar } from '@/components/FilterBar';
import { Spinner } from './components/Spinner';
import { useMatchData } from '@/hooks/useMatchData';
import { isHighProbabilityMatch } from '@/utils/matchHelpers';
import { useCart } from '@/hooks/useCart';

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState(['desc']);
  const [activeTab, setActiveTab] = useState('live');
  const [copyMessage, setCopyMessage] = useState('');

  const {
    liveData,
    upcomingData,
    isLoading,
    isInitialFetch,
    error,
    refreshLiveData,
    refreshUpcomingData,
  } = useMatchData();

  const {
    cart,
    showCartOnly,
    setShowCartOnly,
    clearCart,
    addToCart,
    removeFromCart,
    isInCart,
  } = useCart();

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      if (tab === 'live') {
        refreshLiveData();
      } else {
        refreshUpcomingData();
      }
    },
    [refreshLiveData, refreshUpcomingData]
  );

  const copyHomeTeams = useCallback(() => {
    const dataToCopy = (
      activeTab === 'live'
        ? filterAndSortData(liveData)
        : filterAndSortData(upcomingData)
    )
      ?.map((event) => event.homeTeamName)
      .join('\n');

    if (!dataToCopy?.length) {
      setCopyMessage('No matches to copy.');
      setTimeout(() => setCopyMessage(''), 3000);
      return;
    }

    navigator.clipboard
      .writeText(dataToCopy)
      .then(() => {
        setCopyMessage('Home teams copied!');
        setTimeout(() => setCopyMessage(''), 3000);
      })
      .catch(() => {
        setCopyMessage('Failed to copy.');
        setTimeout(() => setCopyMessage(''), 3000);
      });
  }, [activeTab, liveData, upcomingData]);

  const filterAndSortData = useCallback(
    (data) => {
      if (!data?.length) return [];

      let filteredData = data.filter((event) => {
        const teamNames = [
          event.homeTeamName?.toLowerCase(),
          event.awayTeamName?.toLowerCase(),
          event.enrichedData?.matchInfo?.homeTeam?.name?.toLowerCase(),
          event.enrichedData?.matchInfo?.awayTeam?.name?.toLowerCase(),
          event.tournamentName?.toLowerCase(),
        ].filter(Boolean);

        return teamNames.some((name) =>
          name.includes(searchTerm.toLowerCase())
        );
      });

      if (showCartOnly) {
        filteredData = filteredData.filter((event) => isInCart(event.eventId));
      }

      // Handle filters
      filteredData = filteredData.filter((event) => {
        return activeFilters.every((filter) => {
          switch (filter) {
            case 'desc':
            case 'asc':
              return true;
            case 'highProbability':
              return isHighProbabilityMatch(event);
            case 'hasOdds':
              return event.enrichedData?.odds?.markets?.length > 0;
            case 'inCart':
              return isInCart(event.eventId);
            default:
              return true;
          }
        });
      });

      // Sort data
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
    [searchTerm, showCartOnly, isInCart, activeFilters]
  );

  const filteredData = useMemo(
    () =>
      activeTab === 'live'
        ? filterAndSortData(liveData)
        : filterAndSortData(upcomingData),
    [activeTab, filterAndSortData, liveData, upcomingData]
  );

  const totalMatches = filteredData?.length || 0;

  return (
    <div className='bg-gradient-to-b from-blue-50 to-gray-100 min-h-screen'>
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-5xl font-bold text-center mb-8 text-blue-700'>
          ⚽ Fred.ai
        </h1>

        {error && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4'>
            <span className='block sm:inline'>
              Error loading matches: {error.message}
            </span>
          </div>
        )}

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
            setActiveFilters((prev) =>
              prev.includes(filter)
                ? prev.filter((f) => f !== filter)
                : [...prev, filter]
            );
          }}
          removeFilter={(filter) => {
            setActiveFilters((prev) => prev.filter((f) => f !== filter));
          }}
          clearFilters={() => setActiveFilters(['desc'])}
        />

        <div className='space-y-4 mt-4'>
          {isLoading && isInitialFetch ? (
            <div className='flex justify-center items-center mt-12'>
              <Spinner className='w-12 h-12 text-blue-500' />
            </div>
          ) : (
            filteredData?.map((event) => (
              <MatchCard
                key={event.eventId}
                event={event}
                onAddToCart={() => addToCart(event)}
                onRemoveFromCart={() => removeFromCart(event.eventId)}
                isInCart={isInCart(event.eventId)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;