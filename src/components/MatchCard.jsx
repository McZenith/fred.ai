import React from 'react';
import {
  FaClock,
  FaFutbol,
  FaChartLine,
  FaMapMarkerAlt,
  FaChartBar,
  FaExclamationTriangle,
  FaPercent,
  FaRunning,
  FaShieldAlt,
  FaExchangeAlt,
  FaFlag,
  FaBan,
  FaMedkit,
  FaTrophy,
  FaCalendarAlt,
  FaHashtag,
  FaStore,
  FaCheck,
  FaSortAmountDown,
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

// Extracted Components
const StatusBar = ({ event, isEventInCart, handleCartAction }) => (
  <div className='bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-2 rounded-t-lg flex justify-between items-center'>
    <div className='flex items-center space-x-4'>
      <span className='flex items-center bg-gray-700 px-2 py-1 rounded'>
        <FaClock className='mr-2 text-yellow-400' /> {event.matchStatus}
      </span>
      <span className='text-yellow-400 font-mono'>{event.playedSeconds}</span>
      {event.fixtureVenue?.name && (
        <span className='text-gray-300 text-sm flex items-center'>
          <FaMapMarkerAlt className='mr-1' /> {event.fixtureVenue.name}
        </span>
      )}
    </div>
    <CartButton isEventInCart={isEventInCart} onClick={handleCartAction} />
  </div>
);

const CartButton = ({ isEventInCart, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
      isEventInCart
        ? 'bg-red-500 hover:bg-red-600'
        : 'bg-blue-500 hover:bg-blue-600'
    }`}
  >
    {isEventInCart ? 'Remove' : 'Add to Cart'}
  </button>
);

const TeamDisplay = ({ teamName, position, isLikelyToScore, align }) => (
  <div className={`col-span-3 text-${align}`}>
    <h3
      className={`text-sm font-bold text-gray-900 flex items-center ${
        align === 'right' ? 'justify-end' : ''
      }`}
    >
      {align === 'left' && teamName}
      {isLikelyToScore && (
        <span
          className={`${
            align === 'left' ? 'ml-1' : 'mr-1'
          } text-xs bg-green-100 text-green-800 px-1 rounded-full flex items-center`}
        >
          <FaFutbol className='mr-1 text-xs' /> Score
        </span>
      )}
      {align === 'right' && teamName}
    </h3>
    <div className='text-xs text-gray-500'>Pos: {position || '-'}</div>
  </div>
);

export const MatchCard = ({
  event,
  isExpanded,
  onToggle,
  onAddToCart,
  onRemoveFromCart,
  isInCart,
  enrichedStats,
  activeTab,
}) => {
  // Memoize frequently used values
  const isEventInCart = React.useMemo(
    () => isInCart?.(event.eventId) || false,
    [isInCart, event.eventId]
  );
  const details = React.useMemo(
    () => event.enrichedData?.details?.values || {},
    [event.enrichedData?.details?.values]
  );
  const isLive = activeTab === 'live';

  // Memoize complex calculations
  const calculateGoalProbability = React.useCallback(() => {
    if (!isLive) return null;

    const homeScore = {
      attacks: parseInt(details.attackperiodpercentage?.value?.home || 0, 10),
      dangerous: parseInt(
        details.dangerousperiodpercentage?.value?.home || 0,
        10
      ),
      possession: parseInt(details['110']?.value?.home || 0, 10),
      shots: parseInt(details['125']?.value?.home || 0, 10),
      momentum:
        details.attackperiod?.value?.home > details.attackperiod?.value?.away,
    };

    const awayScore = {
      attacks: parseInt(details.attackperiodpercentage?.value?.away || 0, 10),
      dangerous: parseInt(
        details.dangerousperiodpercentage?.value?.away || 0,
        10
      ),
      possession: parseInt(details['110']?.value?.away || 0, 10),
      shots: parseInt(details['125']?.value?.away || 0, 10),
      momentum:
        details.attackperiod?.value?.away > details.attackperiod?.value?.home,
    };

    // Weight different factors
    const calculateTeamScore = (stats) =>
      stats.attacks * 0.2 +
      stats.dangerous * 0.3 +
      stats.possession * 0.2 +
      stats.shots * 0.2 +
      (stats.momentum ? 10 : 0);

    const homeTotal = calculateTeamScore(homeScore);
    const awayTotal = calculateTeamScore(awayScore);

    if (homeTotal > awayTotal + 15) return 'home';
    if (awayTotal > homeTotal + 15) return 'away';
    return null;
  }, [isLive, details]);

  // Memoize derived values
  const likelyToScore = React.useMemo(
    () => calculateGoalProbability(),
    [calculateGoalProbability]
  );

  const isHighProbability = React.useMemo(() => {
    if (!isLive) return false;

    const hasLikelyScorer = likelyToScore !== null;

    // Safe number parsing
    const currentGoals =
      event.setScore
        ?.split(':')
        ?.reduce(
          (a, b) => (parseInt(a, 10) || 0) + (parseInt(b, 10) || 0),
          0
        ) || 0;

    const isOverOneGoal = currentGoals > 1;
    const isFirstHalf = event.matchStatus === 'H1';

    const over1_5Market = event.markets?.find(
      (m) => m.desc === 'Over/Under' && m.specifier === 'total=1.5'
    );
    const over1_5Probability = over1_5Market?.outcomes?.[0]?.probability
      ? parseFloat(over1_5Market.outcomes[0].probability) * 100
      : 0;
    const isHighOver1_5Probability = over1_5Probability > 70;

    return (
      hasLikelyScorer &&
      isOverOneGoal &&
      isFirstHalf &&
      isHighOver1_5Probability
    );
  }, [event, likelyToScore, isLive]);

  // Memoize goal timeline
  const goalTimeline = React.useMemo(() => {
    const goals = event.goals || [];
    return [...goals].sort((a, b) => a.time - b.time);
  }, [event.goals]);

  // Handlers
  const handleCartAction = React.useCallback(
    (e) => {
      e.stopPropagation();
      isEventInCart ? onRemoveFromCart(event.eventId) : onAddToCart(event);
    },
    [isEventInCart, onRemoveFromCart, onAddToCart, event]
  );

  const handleToggle = React.useCallback(() => {
    onToggle(event.eventId);
  }, [onToggle, event.eventId]);

  // Group markets by type
  const groupedMarkets = React.useMemo(() => {
    return (
      event.markets?.reduce((acc, market) => {
        const type = market.desc;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(market);
        return acc;
      }, {}) || {}
    );
  }, [event.markets]);

  return (
    <div
      className={`relative bg-white rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl ${
        isHighProbability
          ? 'border-l-4 border-green-500'
          : isEventInCart
          ? 'border-l-4 border-blue-500'
          : ''
      }`}
    >
      <StatusBar
        event={event}
        isEventInCart={isEventInCart}
        handleCartAction={handleCartAction}
      />

      <div className='p-3' onClick={handleToggle}>
        {/* Tournament Info */}
        <TournamentInfo event={event} />

        {/* Teams & Score */}
        <div className='grid grid-cols-7 gap-2 mb-3 bg-gray-50 p-2 rounded-lg'>
          <TeamDisplay
            teamName={event.homeTeamName}
            position={enrichedStats?.tablePosition?.home}
            isLikelyToScore={likelyToScore === 'home'}
            align='left'
          />

          <ScoreDisplay
            score={event.setScore}
            goals={event.goals}
            goalTimeline={goalTimeline}
          />

          <TeamDisplay
            teamName={event.awayTeamName}
            position={enrichedStats?.tablePosition?.away}
            isLikelyToScore={likelyToScore === 'away'}
            align='right'
          />
        </div>

        {/* Goal Timeline */}
        {event.goals && event.goals.length > 0 && (
          <div className='mt-2 p-2 bg-gray-50 rounded-lg'>
            <h4 className='text-xs font-semibold text-gray-700 mb-2 flex items-center'>
              <FaSortAmountDown className='mr-1' /> Goal Timeline
            </h4>
            <div className='space-y-1'>
              {goalTimeline.map((goal, index) => (
                <div
                  key={index}
                  className={`text-xs flex items-center ${
                    goal.team === 'home' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`
                    flex items-center space-x-2 
                    ${goal.team === 'home' ? 'text-green-600' : 'text-blue-600'}
                  `}
                  >
                    {goal.team === 'home' && (
                      <>
                        <FaFutbol className='text-xs' />
                        <span>{goal.time}'</span>
                        <span>{goal.scorer || 'Goal'}</span>
                      </>
                    )}
                    {goal.team === 'away' && (
                      <>
                        <span>{goal.scorer || 'Goal'}</span>
                        <span>{goal.time}'</span>
                        <FaFutbol className='text-xs' />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Stats Grid - More compact */}
        {isLive && (
          <div className='space-y-2'>
            {/* Ball Control - Now First */}
            <div className='bg-green-50 p-2 rounded-lg'>
              <h4 className='text-xs font-semibold text-green-800 mb-2'>
                Ball Control & Form
              </h4>
              <div className='grid grid-cols-3 gap-2'>
                {/* Left column - Home stats */}
                <div className='space-y-1 text-right'>
                  <div className='text-xs font-medium text-gray-600'>
                    W{enrichedStats?.form?.home?.wins || 0}D
                    {enrichedStats?.form?.home?.draws || 0}L
                    {enrichedStats?.form?.home?.losses || 0}
                  </div>
                  <div className='text-xs'>
                    {details.ballsafeperiodpercentage?.value?.home || 0}% Safe
                  </div>
                  <div className='text-xs'>
                    {details.attackperiodpercentage?.value?.home || 0}% Att
                  </div>
                </div>

                {/* Middle column - H2H */}
                <div className='text-center'>
                  <div className='text-xs font-medium text-gray-600 mb-1'>
                    H2H
                  </div>
                  <div className='text-xs'>
                    {enrichedStats?.h2h?.home || 0}-
                    {enrichedStats?.h2h?.draws || 0}-
                    {enrichedStats?.h2h?.away || 0}
                  </div>
                </div>

                {/* Right column - Away stats */}
                <div className='space-y-1 text-left'>
                  <div className='text-xs font-medium text-gray-600'>
                    W{enrichedStats?.form?.away?.wins || 0}D
                    {enrichedStats?.form?.away?.draws || 0}L
                    {enrichedStats?.form?.away?.losses || 0}
                  </div>
                  <div className='text-xs'>
                    {details.ballsafeperiodpercentage?.value?.away || 0}% Safe
                  </div>
                  <div className='text-xs'>
                    {details.attackperiodpercentage?.value?.away || 0}% Att
                  </div>
                </div>
              </div>
            </div>

            {/* Period Stats - Now Second */}
            <div className='bg-blue-50 p-2 rounded-lg'>
              <h4 className='text-xs font-semibold text-blue-800 mb-2'>
                Period Stats
              </h4>
              <div className='grid grid-cols-4 gap-2 text-xs'>
                {[
                  {
                    label: 'FK',
                    home: details.freekicksperiod?.value?.home || 0,
                    away: details.freekicksperiod?.value?.away || 0,
                  },
                  {
                    label: 'GK',
                    home: details.goalkicksperiod?.value?.home || 0,
                    away: details.goalkicksperiod?.value?.away || 0,
                  },
                  {
                    label: 'TI',
                    home: details.throwinsperiod?.value?.home || 0,
                    away: details.throwinsperiod?.value?.away || 0,
                  },
                  {
                    label: 'OFF',
                    home: details.offsidesperiod?.value?.home || 0,
                    away: details.offsidesperiod?.value?.away || 0,
                  },
                ].map(({ label, home, away }) => (
                  <div key={label} className='text-center'>
                    <div className='text-gray-600 mb-1'>{label}</div>
                    <div className='font-medium'>
                      {home}-{away}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className='mt-4 border-t pt-4 space-y-6'>
            {/* All Markets Section */}
            <div className='space-y-4'>
              <h4 className='font-semibold text-gray-700 flex items-center'>
                <FaStore className='mr-2' /> All Markets
              </h4>

              {Object.entries(groupedMarkets).map(([marketType, markets]) => (
                <div key={marketType} className='bg-gray-50 p-4 rounded-lg'>
                  <h5 className='font-medium mb-3 flex items-center'>
                    <FaChartLine className='mr-2' /> {marketType}
                  </h5>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {markets.map((market) => (
                      <div
                        key={`${market.id}-${market.specifier || ''}`}
                        className={`bg-white p-3 rounded shadow-sm ${
                          market.status !== 0 ? 'opacity-50' : ''
                        }`}
                      >
                        <div className='flex justify-between items-center mb-2'>
                          <span className='text-sm text-gray-600'>
                            {market.specifier
                              ? `${marketType} ${
                                  market.specifier.split('=')[1]
                                }`
                              : marketType}
                          </span>
                          {market.status !== 0 && (
                            <span className='text-xs bg-red-100 text-red-800 px-2 py-1 rounded'>
                              {market.suspendedReason || 'Suspended'}
                            </span>
                          )}
                        </div>
                        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                          {market.outcomes.map((outcome) => (
                            <div
                              key={outcome.id}
                              className='text-center p-2 bg-gray-50 rounded'
                            >
                              <div className='text-sm font-medium'>
                                {outcome.desc}
                              </div>
                              <div className='text-lg font-bold text-blue-600'>
                                {outcome.odds}
                              </div>
                              <div className='text-xs text-gray-500'>
                                {(
                                  parseFloat(outcome.probability) * 100
                                ).toFixed(1)}
                                %
                              </div>
                              {outcome.isWinning && (
                                <div className='text-xs text-green-600 mt-1'>
                                  <FaCheck className='inline mr-1' /> Won
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Match Info */}
            <div className='bg-gray-50 p-4 rounded-lg'>
              <h5 className='font-medium mb-2 flex items-center'>
                <FaCalendarAlt className='mr-2' /> Match Information
              </h5>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <p className='text-gray-600 flex items-center'>
                    <FaTrophy className='mr-2' /> Tournament:
                  </p>
                  <p className='font-medium'>
                    {event.sport?.category?.tournament?.name}
                  </p>
                </div>
                <div>
                  <p className='text-gray-600 flex items-center'>
                    <FaClock className='mr-2' />{' '}
                    {isLive ? 'Started:' : 'Starts:'}
                  </p>
                  <p className='font-medium'>
                    {formatDistanceToNow(new Date(event.estimateStartTime), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {event.fixtureId && (
                  <div>
                    <p className='text-gray-600 flex items-center'>
                      <FaHashtag className='mr-2' /> Fixture ID:
                    </p>
                    <p className='font-medium'>{event.fixtureId}</p>
                  </div>
                )}
                <div>
                  <p className='text-gray-600 flex items-center'>
                    <FaStore className='mr-2' /> Markets Available:
                  </p>
                  <p className='font-medium'>{event.totalMarketSize}</p>
                </div>
              </div>
            </div>

            {/* Detailed Stats Section - Only for live matches */}
            {isLive && (
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h4 className='font-semibold mb-3 text-gray-700 flex items-center'>
                    <FaChartBar className='mr-2' /> Period Stats
                  </h4>
                  <div className='space-y-2'>
                    {[
                      {
                        label: 'Free Kicks',
                        icon: <FaFutbol />,
                        value: details.freekicksperiod?.value,
                      },
                      {
                        label: 'Goal Kicks',
                        icon: <FaFutbol />,
                        value: details.goalkicksperiod?.value,
                      },
                      {
                        label: 'Throw-ins',
                        icon: <FaExchangeAlt />,
                        value: details.throwinsperiod?.value,
                      },
                      {
                        label: 'Offsides',
                        icon: <FaFlag />,
                        value: details.offsidesperiod?.value,
                      },
                      {
                        label: 'Fouls',
                        icon: <FaBan />,
                        value: details.foulsperiod?.value,
                      },
                      {
                        label: 'Injuries',
                        icon: <FaMedkit />,
                        value: details.injuriesperiod?.value,
                      },
                    ].map(
                      ({ label, icon, value }) =>
                        value && (
                          <div
                            key={label}
                            className='flex justify-between items-center'
                          >
                            <span className='text-sm text-gray-600 flex items-center'>
                              <span className='mr-2'>{icon}</span> {label}
                            </span>
                            <div className='font-medium'>
                              {value.home || '0'} - {value.away || '0'}
                            </div>
                          </div>
                        )
                    )}
                  </div>
                </div>

                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h4 className='font-semibold mb-3 text-gray-700 flex items-center'>
                    <FaShieldAlt className='mr-2' /> Ball Control
                  </h4>
                  <div className='space-y-2'>
                    {[
                      {
                        label: 'Ball Safe',
                        icon: <FaShieldAlt />,
                        value: details.ballsafepercentage?.value,
                        period: details.ballsafeperiod?.value,
                      },
                      {
                        label: 'Attack',
                        icon: <FaRunning />,
                        value: details.attackpercentage?.value,
                        period: details.attackperiod?.value,
                      },
                      {
                        label: 'Dangerous',
                        icon: <FaExclamationTriangle />,
                        value: details.dangerousattackpercentage?.value,
                        period: details.dangerousperiod?.value,
                      },
                    ].map(
                      ({ label, icon, value, period }) =>
                        value && (
                          <div key={label} className='space-y-1'>
                            <div className='flex justify-between items-center'>
                              <span className='text-sm text-gray-600 flex items-center'>
                                <span className='mr-2'>{icon}</span> {label}
                              </span>
                              <div className='font-medium flex items-center'>
                                <FaPercent className='mr-1 text-xs' />
                                {value.home} - {value.away}
                              </div>
                            </div>
                            {period && (
                              <div className='text-xs text-gray-500 flex justify-between'>
                                <span>Period: {period.home || '0'}</span>
                                <span>Period: {period.away || '0'}</span>
                              </div>
                            )}
                          </div>
                        )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Additional extracted components
const TournamentInfo = ({ event }) => (
  <div className='text-xs text-gray-600 mb-2 flex items-center justify-between'>
    <div className='flex items-center'>
      <FaTrophy className='mr-1 text-yellow-600' />
      {event.sport?.category?.tournament?.name}
    </div>
    <div className='flex items-center space-x-2'>
      <span className='text-green-600'>
        1X2: {event.markets?.[0]?.outcomes?.[0]?.odds || '-'}
      </span>
      <span className='text-blue-600'>
        O1.5:{' '}
        {event.markets?.find(
          (m) => m.desc === 'Over/Under' && m.specifier === 'total=1.5'
        )?.outcomes?.[0]?.odds || '-'}
      </span>
    </div>
  </div>
);

const ScoreDisplay = ({ score, goals, goalTimeline }) => (
  <div className='col-span-1 flex flex-col items-center justify-center'>
    <div className='text-xl font-bold text-gray-800'>{score}</div>
    {goals && goals.length > 0 && (
      <div className='text-[10px] text-gray-500 mt-1'>
        {goalTimeline.map((goal, index) => (
          <div key={index} className='flex items-center justify-center'>
            <span>{goal.time}' </span>
            <FaFutbol className='mx-1 text-[8px]' />
            <span>{goal.team === 'home' ? 'H' : 'A'}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);
