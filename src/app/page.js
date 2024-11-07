'use client';

import React, { useState, useCallback, useMemo, useTransition } from 'react';
import { CartProvider, useCart } from '@/hooks/useCart';
import { FilterProvider, useFilter } from '@/hooks/filterContext';
import { useMatchData } from '@/hooks/useMatchData';
import MatchCard from '@/components/MatchCard';
import { HeaderControls } from '@/components/HeaderControls';
import { FilterBar } from '@/components/FilterBar';
import { Spinner } from './components/Spinner';

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

const MatchList = React.memo(({ matches }) => (
  <div className='space-y-4 transition-opacity duration-200'>
    {matches.map((event) => (
      <div key={event.eventId}>
        <MatchCard event={event} />
      </div>
    ))}
  </div>
));

MatchList.displayName = 'MatchList';

const LoadingOverlay = ({ show }) =>
  show ? (
    <div className='fixed bottom-4 right-4 bg-white rounded-full shadow-lg p-2 transition-opacity duration-200'>
      <Spinner className='w-6 h-6 text-blue-500' />
    </div>
  ) : null;

const ErrorMessage = ({ error }) =>
  error ? (
    <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 transition-opacity duration-200'>
      <span className='block sm:inline'>
        Error loading matches: {error.message}
      </span>
    </div>
  ) : null;

const HomeContent = () => {
  const [activeTab, setActiveTab] = useState('live');
  const [copyMessage, setCopyMessage] = useState('');
  const [isPending, startTransition] = useTransition();

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
      startTransition(() => {
        setActiveTab(tab);
        if (tab === 'live') {
          refreshLiveData();
        } else {
          refreshUpcomingData();
        }
      });
    },
    [refreshLiveData, refreshUpcomingData]
  );

  const filteredData = useMemo(() => {
    const sourceData = activeTab === 'live' ? liveData : upcomingData;
    let filtered = sourceData;

    if (showCartOnly) {
      filtered = filtered.filter((event) => isInCart(event.eventId));
    }

    return applyFilters(filtered, isInCart);
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

  const showSkeletons = isInitialFetch || isPending;
  const showNoMatches = !showSkeletons && filteredData.length === 0;
  const showMatchList = !showSkeletons && filteredData.length > 0;

  return (
    <div className='bg-gradient-to-b from-blue-50 to-gray-100 min-h-screen'>
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-5xl font-bold text-center mb-8 text-blue-700'>
          ⚽ Fred.ai
        </h1>

        <ErrorMessage error={error} />

        <HeaderControls
          activeTab={activeTab}
          totalMatches={filteredData?.length || 0}
          onTabChange={handleTabChange}
          onCopyHomeTeams={copyHomeTeams}
          copyMessage={copyMessage}
        />

        <FilterBar />

        <div className='mt-4'>
          {showSkeletons && (
            <div className='space-y-4'>
              {[...Array(3)].map((_, i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          )}

          {showNoMatches && (
            <div className='text-center py-8 text-gray-500'>
              {showCartOnly
                ? 'No matches in cart'
                : 'No matches found for the selected filters'}
            </div>
          )}

          {showMatchList && <MatchList matches={filteredData} />}

          <LoadingOverlay show={isLoading && !isInitialFetch} />
        </div>
      </div>
    </div>
  );
};

const Home = () => (
  <CartProvider>
    <FilterProvider>
      <HomeContent />
    </FilterProvider>
  </CartProvider>
);

export default Home;
