'use client';

import { useState, useCallback, useMemo } from 'react';
import { MatchCard } from '@/components/MatchCard';
import { HeaderControls } from '@/components/HeaderControls';
import { FilterBar } from '@/components/FilterBar';
import { Spinner } from './components/Spinner';
import { useMatchData } from '@/hooks/useMatchData';
import { isHighProbabilityMatch, getMatchHalf } from '@/utils/matchHelpers';
import { useCart } from '@/hooks/useCart';

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState(['desc']);
  const [expandedCard, setExpandedCard] = useState(null);
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

  const toggleCard = useCallback((eventId) => {
    setExpandedCard((prev) => (prev === eventId ? null : eventId));
  }, []);

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

      // Handle half filters first
      const hasHalfFilter = activeFilters.some((filter) =>
        ['firstHalf', 'secondHalf', 'halftime'].includes(filter)
      );

      if (hasHalfFilter) {
        filteredData = filteredData.filter((event) => {
          const currentHalf = getMatchHalf(event);
          return activeFilters.includes(currentHalf);
        });
      }

      // Handle other filters
      filteredData = filteredData.filter((event) => {
        return activeFilters.every((filter) => {
          switch (filter) {
            case 'desc':
            case 'asc':
              return true;

            case 'firstHalf':
              return event.matchStatus === 'H1';

            case 'secondHalf':
              return event.matchStatus === 'H2';

            case 'halftime':
              return event.matchStatus === 'HT';

            case 'highProbability': {
              const goalProb = event.enrichedData?.analysis?.goalProbability;
              return goalProb && (goalProb.home > 0.6 || goalProb.away > 0.6);
            }

            case 'highMomentum': {
              const momentum = event.enrichedData?.analysis?.momentum?.recent;
              if (!momentum) return false;
              const totalMomentum = momentum.home + momentum.away;
              return totalMomentum > 10; // Adjust threshold as needed
            }

            case 'hasOdds':
              return event.enrichedData?.odds?.markets?.length > 0;

            case 'inCart':
              return cart.some((item) => item.eventId === event.eventId);

            case 'over1.5':
            case 'over2.5':
            case 'over3.5': {
              if (!event.markets?.length) return false;

              const total = filter.slice(4);
              const overMarket = event.markets.find(
                (m) =>
                  m.desc === 'Over/Under' && m.specifier === `total=${total}`
              );

              const probability = overMarket?.outcomes?.[0]?.probability
                ? parseFloat(overMarket.outcomes[0].probability) * 100
                : 0;

              return probability > 70;
            }

            default:
              return true;
          }
        });
      });

      // Enhanced sorting logic
      if (activeFilters.includes('asc') || activeFilters.includes('desc')) {
        const sortDirection = activeFilters.includes('asc') ? 'asc' : 'desc';

        filteredData.sort((a, b) => {
          // Primary sort by goal probability
          const probA = Math.max(
            a.enrichedData?.analysis?.goalProbability?.home || 0,
            a.enrichedData?.analysis?.goalProbability?.away || 0
          );
          const probB = Math.max(
            b.enrichedData?.analysis?.goalProbability?.home || 0,
            b.enrichedData?.analysis?.goalProbability?.away || 0
          );

          if (probA !== probB) {
            return sortDirection === 'asc' ? probA - probB : probB - probA;
          }

          // Secondary sort by momentum
          const momentumA = a.enrichedData?.analysis?.momentum?.recent;
          const momentumB = b.enrichedData?.analysis?.momentum?.recent;

          if (momentumA && momentumB) {
            const totalMomentumA = momentumA.home + momentumA.away;
            const totalMomentumB = momentumB.home + momentumB.away;
            if (totalMomentumA !== totalMomentumB) {
              return sortDirection === 'asc'
                ? totalMomentumA - totalMomentumB
                : totalMomentumB - totalMomentumA;
            }
          }

          // Tertiary sort by time
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

  const getPlayerGoalProbabilities = useCallback((event) => {
    const marketOdds = event.enrichedData?.odds?.markets || [];
    const squadInfo = event.enrichedData?.squads;

    return marketOdds
      .filter(
        (market) =>
          market.desc?.includes('Goalscorer') && market.outcomes?.length > 0
      )
      .flatMap((market) =>
        market.outcomes
          .filter(
            (outcome) => outcome.isActive === 1 && outcome.probability > 0
          )
          .map((outcome) => {
            const playerName = outcome.desc.split(' & ')[0];
            const playerInfo = squadInfo?.players?.find(
              (p) => p.name === playerName
            );

            return {
              playerName,
              probability: parseFloat(outcome.probability),
              odds: parseFloat(outcome.odds),
              position: playerInfo?.position,
              teamId: playerInfo?.teamId,
              stats: playerInfo?.statistics,
            };
          })
      )
      .reduce((acc, curr) => {
        const existing = acc.find((p) => p.playerName === curr.playerName);
        if (!existing || existing.probability < curr.probability) {
          return [...acc.filter((p) => p.playerName !== curr.playerName), curr];
        }
        return acc;
      }, [])
      .sort((a, b) => b.probability - a.probability);
  }, []);

  return (
    <div className='bg-gradient-to-b from-blue-50 to-gray-100 min-h-screen flex items-center justify-center'>
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
          toggleFilter={useCallback((filter) => {
            setActiveFilters((prev) =>
              prev.includes(filter)
                ? prev.filter((f) => f !== filter)
                : [...prev, filter]
            );
          }, [])}
          removeFilter={useCallback((filter) => {
            setActiveFilters((prev) => prev.filter((f) => f !== filter));
          }, [])}
          clearFilters={useCallback(() => setActiveFilters(['desc']), [])}
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
                event={{
                  ...event,
                  enrichedData: {
                    ...event.enrichedData,
                    teamStats: {
                      home: event.enrichedData?.teams?.home,
                      away: event.enrichedData?.teams?.away,
                    },
                    phrases: event.enrichedData?.phrases,
                    timeline: event.enrichedData?.timeline,
                    odds: event.enrichedData?.odds,
                    squads: event.enrichedData?.squads,
                  },
                }}
                isExpanded={expandedCard === event.eventId}
                onToggle={toggleCard}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                isInCart={isInCart}
                activeTab={activeTab}
                highProbability={isHighProbabilityMatch(event)}
                playerProbabilities={getPlayerGoalProbabilities(event)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;