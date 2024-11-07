'use client';

import { useState, useCallback, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import MatchCard from '@/components/MatchCard';
import { HeaderControls } from '@/components/HeaderControls';
import { FilterBar } from '@/components/FilterBar';
import { Spinner } from './components/Spinner';
import { useMatchData } from '@/hooks/useMatchData';
import { CartProvider, useCart } from '@/hooks/useCart';
import { FilterProvider, useFilter } from '@/hooks/filterContext';

const MatchCardSkeleton = () => (
  <div className='animate-pulse bg-white rounded-xl shadow-lg p-4 space-y-4'>
    <div className='flex justify-between'>
      <div className='h-4 bg-gray-200 rounded w-1/3'></div>
      <div className='h-4 bg-gray-200 rounded w-8'></div>
    </div>
    <div className='flex justify-between items-center'>
      <div className='w-1/3 space-y-2'>
        <div className='h-6 bg-gray-200 rounded'></div>
        <div className='h-4 bg-gray-200 rounded w-2/3'></div>
      </div>
      <div className='space-y-2'>
        <div className='h-8 bg-gray-200 rounded w-16'></div>
        <div className='h-4 bg-gray-200 rounded w-12 mx-auto'></div>
      </div>
      <div className='w-1/3 space-y-2'>
        <div className='h-6 bg-gray-200 rounded'></div>
        <div className='h-4 bg-gray-200 rounded w-2/3 ml-auto'></div>
      </div>
    </div>
  </div>
);

const MatchList = ({ matches }) => {
  return matches.map((event, index) => (
    <div
      key={event.eventId}
      className='opacity-0 animate-fadeIn'
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'forwards',
      }}
    >
      <MatchCard event={event} />
    </div>
  ));
};

const HomeContent = () => {
  const [activeTab, setActiveTab] = useState('live');
  const [copyMessage, setCopyMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { isInCart, showCartOnly } = useCart();
  const { applyFilters } = useFilter();

  const {
    liveData,
    upcomingData,
    isLoading,
    isInitialFetch,
    error,
    refreshLiveData,
    refreshUpcomingData,
  } = useMatchData();

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

  const filteredData = useMemo(() => {
    setIsProcessing(true);
    const sourceData = activeTab === 'live' ? liveData : upcomingData;

    // First apply cart filter if showCartOnly is true
    let filtered = sourceData;
    if (showCartOnly) {
      filtered = filtered.filter((event) => isInCart(event.eventId));
    }

    // Then apply other filters
    const result = applyFilters(filtered, isInCart);
    setIsProcessing(false);
    return result;
  }, [activeTab, liveData, upcomingData, applyFilters, isInCart, showCartOnly]);

  const copyHomeTeams = useCallback(() => {
    const dataToCopy = filteredData
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
  }, [filteredData]);

  const totalMatches = filteredData?.length || 0;

  // Only show skeleton loading for initial fetch
  const showSkeletonLoader = isInitialFetch;

  // Show spinner for real-time updates
  const showSpinner = !isInitialFetch && isLoading;

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
          onCopyHomeTeams={copyHomeTeams}
          copyMessage={copyMessage}
        />

        <FilterBar />

        <div className='space-y-4 mt-4 relative'>
          {/* Spinner for real-time updates */}
          {showSpinner && (
            <div className='absolute top-0 right-0 mt-4 mr-4'>
              <Spinner className='w-6 h-6 text-blue-500' />
            </div>
          )}

          {showSkeletonLoader ? (
            <div className='space-y-4'>
              {[...Array(3)].map((_, i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              {showCartOnly
                ? 'No matches in cart'
                : 'No matches found for the selected filters'}
            </div>
          ) : (
            <MatchList matches={filteredData} />
          )}
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  return (
    <CartProvider>
      <FilterProvider>
        <HomeContent />
      </FilterProvider>
    </CartProvider>
  );
};

export default Home;