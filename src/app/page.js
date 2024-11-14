'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useTransition,
  useRef,
} from 'react';
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

// Optimized MatchCard wrapper with height preservation
const StableMatchCard = React.memo(({ event }) => {
  const cardRef = useRef(null);
  const [minHeight, setMinHeight] = useState('auto');
  
  // Set initial height after first render
  React.useEffect(() => {
    if (cardRef.current) {
      const height = cardRef.current.getBoundingClientRect().height;
      setMinHeight(`${height}px`);
    }
  }, []);

  // Create a stable key for the match data that only changes when important data changes
  const stableKey = useMemo(() => {
    return JSON.stringify({
      score: event.setScore,
      time: event.playedSeconds,
      status: event.matchStatus?.name,
      stats: event.enrichedData?.analysis?.stats,
      momentum: event.enrichedData?.analysis?.momentum?.trend,
      timeline: event.enrichedData?.analysis?.momentum?.timeline
    });
  }, [event]);

  return (
    <div ref={cardRef} style={{ minHeight }} className="transition-all duration-300">
      <MatchCard event={event} stableKey={stableKey} />
    </div>
  );
}, (prev, next) => {
  // Custom comparison function
  if (prev.event === next.event) return true;
  
  // Compare only essential fields
  const essentialFieldsEqual = 
    prev.event.setScore === next.event.setScore &&
    prev.event.playedSeconds === next.event.playedSeconds &&
    prev.event.matchStatus?.name === next.event.matchStatus?.name &&
    JSON.stringify(prev.event.enrichedData?.analysis?.stats) === 
    JSON.stringify(next.event.enrichedData?.analysis?.stats) &&
    JSON.stringify(prev.event.enrichedData?.analysis?.momentum?.trend) ===
    JSON.stringify(next.event.enrichedData?.analysis?.momentum?.trend);

  return essentialFieldsEqual;
});

const MatchList = React.memo(({ matches }) => {
  // Create stable reference for the match list
  const stableMatches = useMemo(() => matches, [matches]);

  return (
    <div className='space-y-4 transition-opacity duration-200'>
      {stableMatches.map((event) => (
        <StableMatchCard key={`${event.eventId}`} event={event} />
      ))}
    </div>
  );
});

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
  const [isPaused, setIsPaused] = useState(false);

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
    pauseUpdates,
    resumeUpdates,
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

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const newState = !prev;
      if (newState) {
        pauseUpdates();
      } else {
        resumeUpdates();
      }
      return newState;
    });
  }, [pauseUpdates, resumeUpdates]);

  // Stabilize filtered data
  const filteredData = useMemo(() => {
    const sourceData = activeTab === 'live' ? liveData : upcomingData;
    let filtered = sourceData;

    if (showCartOnly) {
      filtered = filtered.filter((event) => isInCart(event.eventId));
    }

    return applyFilters(filtered, isInCart);
  }, [activeTab, liveData, upcomingData, showCartOnly, isInCart, applyFilters]);

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

        {error && matches.length === 0 && <ErrorMessage error={error} />}

        <HeaderControls
          activeTab={activeTab}
          totalMatches={filteredData?.length || 0}
          onTabChange={handleTabChange}
          onCopyHomeTeams={copyHomeTeams}
          copyMessage={copyMessage}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
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

          {showMatchList && (
            <React.Suspense fallback={null}>
              <MatchList matches={filteredData} />
            </React.Suspense>
          )}

          <LoadingOverlay show={isLoading && !isInitialFetch} />
        </div>
      </div>
    </div>
  );
};

// Wrap the entire app with providers and Suspense
const Home = () => (
  <CartProvider>
    <FilterProvider>
      <React.Suspense fallback={null}>
        <HomeContent />
      </React.Suspense>
    </FilterProvider>
  </CartProvider>
);

export default Home;