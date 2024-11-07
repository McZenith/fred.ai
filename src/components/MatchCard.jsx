import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ShoppingCart,
  Circle,
  TrendingUp,
  Shield,
  Target,
  Flag,
  AlertCircle,
  Users,
  Ticket,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useCart } from '../hooks/useCart';

// Utility Components
const StatComparison = ({ label, home, away, total }) => {
  const homePercent = (home / total) * 100;
  const awayPercent = (away / total) * 100;

  return (
    <div className='mb-3'>
      <div className='flex justify-between text-xs md:text-sm mb-1'>
        <span className='font-medium'>{home}</span>
        <span className='text-gray-600'>{label}</span>
        <span className='font-medium'>{away}</span>
      </div>
      <div className='flex gap-0.5 h-1.5'>
        <div
          className='bg-blue-500 rounded-l transition-all duration-500'
          style={{ width: `${homePercent}%` }}
        />
        <div
          className='bg-red-500 rounded-r transition-all duration-500'
          style={{ width: `${awayPercent}%` }}
        />
      </div>
    </div>
  );
};

const StatItem = ({ label, value, icon: Icon }) => (
  <div className='flex items-center gap-2 p-2'>
    <div className='p-2 bg-gray-100 rounded-full'>
      <Icon size={14} className='text-gray-600' />
    </div>
    <div>
      <div className='text-xs text-gray-500'>{label}</div>
      <div className='font-semibold'>{value}</div>
    </div>
  </div>
);

const TimelineEvent = ({ event }) => {
  const getEventIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'shotontarget':
        return <Target className='text-green-500' size={16} />;
      case 'shotofftarget':
        return <Target className='text-gray-400' size={16} />;
      case 'corner':
        return <Flag className='text-blue-500' size={16} />;
      case 'card':
        return (
          <div
            className={`w-3 h-4 ${
              event.card === 'yellow' ? 'bg-yellow-400' : 'bg-red-600'
            } rounded-sm`}
          />
        );
      case 'throwin':
        return <Circle className='text-gray-400' size={12} />;
      case 'freekick':
        return <Circle className='text-blue-400' size={12} />;
      case 'goal_kick':
        return <Circle className='text-purple-400' size={12} />;
      default:
        return <Circle className='text-gray-400' size={12} />;
    }
  };

  return (
    <div className='flex items-center gap-3 relative pl-6 pb-4'>
      <div className='absolute left-0 top-0 bottom-0 w-px bg-gray-200' />
      <div className='absolute left-[-4px] bg-white'>
        {getEventIcon(event.type)}
      </div>
      <div className='text-xs font-medium text-gray-500 w-8'>{event.time}'</div>
      <div className='flex-1'>
        <div className='text-sm'>
          <span
            className={`font-medium ${
              event.team === 'home' ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {event.team.toUpperCase()}
          </span>
          {' - '}
          {event.name}
          {event.player?.name && (
            <span className='font-medium ml-1'>{event.player.name}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const MomentumChart = ({ data, homeTeam, awayTeam }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white p-2 shadow-lg rounded-lg border text-xs'>
          <p className='font-medium'>Minute {label}</p>
          <p className='text-blue-600'>
            {homeTeam}: {payload[0].value}
          </p>
          <p className='text-red-600'>
            {awayTeam}: {payload[1].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className='w-full h-40 mt-2'>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id='homeGradient' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='#2563eb' stopOpacity={0.2} />
              <stop offset='95%' stopColor='#2563eb' stopOpacity={0} />
            </linearGradient>
            <linearGradient id='awayGradient' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='#dc2626' stopOpacity={0.2} />
              <stop offset='95%' stopColor='#dc2626' stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray='3 3' opacity={0.1} />
          <XAxis dataKey='minute' tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type='monotone'
            dataKey='home'
            stroke='#2563eb'
            strokeWidth={2}
            fill='url(#homeGradient)'
          />
          <Area
            type='monotone'
            dataKey='away'
            stroke='#dc2626'
            strokeWidth={2}
            fill='url(#awayGradient)'
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const MarketOddsCard = ({ market, children }) => {
  return (
    <div className='p-4 bg-white rounded-lg shadow-sm border border-gray-100'>
      <div className='flex justify-between items-start mb-3'>
        <div>
          <h3 className='font-medium text-gray-900'>{market.oddstype}</h3>
          <p className='text-sm text-gray-500'>{market.oddstypeshort}</p>
        </div>
        <div className='text-xs text-gray-400'>
          {market.extra && `(${market.extra})`}
        </div>
      </div>
      <div className='grid grid-cols-3 gap-2'>
        {Object.values(market.outcomes).map((outcome, idx) => (
          <button
            key={idx}
            className='p-2 bg-gray-50 rounded text-center hover:bg-gray-100 transition-colors'
          >
            <div className='text-sm text-gray-600 mb-1'>{outcome.name}</div>
            <div className='font-bold text-gray-900'>{outcome.odds}</div>
          </button>
        ))}
      </div>
      {children}
    </div>
  );
};

const MatchCard = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const { addToCart, removeFromCart, isInCart } = useCart();

  const handleCartToggle = useCallback(() => {
    if (isInCart(event.eventId)) {
      removeFromCart(event.eventId);
    } else {
      addToCart(event);
    }
  }, [event, isInCart, removeFromCart, addToCart]);

  var analysis = event.enrichedData.analysis;
  // Data extraction from event object
  const goalProbability = analysis?.goalProbability;
  const recommendation = analysis?.recommendation;
  const momentum = analysis?.momentum;
  const stats = analysis.stats;
  const homeTeam = event.homeTeamName;
  const awayTeam = event.awayTeamName;
  const matchStatus = event.matchStatus;
  const score = event.setScore;
  const playedTime = event.playedSeconds;

  // Match situation data
  const situations = event.enrichedData.situation?.data || [];
  let details = event.enrichedData.details;
  let odds = event.enrichedData.odds;
  let h2h = event.enrichedData.h2h;
  let form = event.enrichedData.form;

  // Core metrics
  const coreStats = {
    possession: {
      home: stats?.possession?.home || 0,
      away: stats?.possession?.away || 0,
    },
    attacks: {
      home: stats?.attacks?.home || 0,
      away: stats?.attacks?.away || 0,
    },
    dangerous: {
      home: stats?.dangerous?.home || 0,
      away: stats?.dangerous?.away || 0,
    },
    shots: stats?.shots || {
      onTarget: { home: 0, away: 0 },
      offTarget: { home: 0, away: 0 },
    },
    corners: stats?.corners || { home: 0, away: 0 },
    cards: stats?.cards || {
      yellow: { home: 0, away: 0 },
      red: { home: 0, away: 0 },
    },
  };

  // Momentum trend data for chart
  const trendData =
    momentum?.trend?.map((t) => ({
      minute: t.minute,
      home: t.homeIntensity,
      away: t.awayIntensity,
    })) || [];

  // Timeline events
  const events = momentum?.timeline?.events || [];

  // Available markets
  const availableMarkets = event.markets.filter(
    (market) => market.status === 0
  );

  // Calculate total attacks for home and away
  const totalHomeAttacks = situations.reduce((acc, situation) => {
    return acc + situation.home.attack;
  }, 0);

  const totalAwayAttacks = situations.reduce((acc, situation) => {
    return acc + situation.away.attack;
  }, 0);

  return (
    <div className='w-full max-w-[1920px]'>
      <Card className='w-full bg-white shadow-lg'>
        <CardContent className='p-4 md:p-6 lg:p-8'>
          {/* Header */}
          <div className='flex justify-between items-start mb-4'>
            <div className='text-sm font-medium text-gray-600'>
              {event.sport.category.tournament.name}
              {event.round ? `  Round ${event.round}` : ''}
            </div>
            <button
              onClick={handleCartToggle}
              className={`p-2.5 rounded-full transition-colors relative ${
                isInCart(event.eventId)
                  ? 'bg-green-50 text-green-600 hover:bg-green-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShoppingCart size={18} />
              {isInCart(event.eventId) && (
                <div className='absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full'></div>
              )}
            </button>
          </div>

          {/* Teams and Score */}
          <div className='flex items-center justify-between mb-6'>
            <div className='flex-1'>
              <div className='flex flex-col items-end text-right'>
                <h3 className='text-2xl font-bold'>{homeTeam}</h3>
                <span className='text-sm text-gray-500'>{homeTeam}</span>
              </div>
            </div>

            <div className='flex flex-col items-center px-8'>
              <div className='text-4xl font-bold tracking-tight mb-1'>
                {score}
              </div>
              <div className='flex items-center gap-2 text-sm text-gray-500'>
                <Clock size={14} />
                <span>{playedTime || '0'}'</span>
              </div>
              <div className='text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2'>
                {event.matchStatus?.name}
              </div>
            </div>

            <div className='flex-1'>
              <div className='flex flex-col items-start'>
                <h3 className='text-2xl font-bold'>{awayTeam}</h3>
                <span className='text-sm text-gray-500'>{awayTeam}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 bg-gray-50 p-4 rounded-lg'>
            <StatItem
              label='Shots on Target'
              value={`${coreStats.shots.onTarget.home} - ${coreStats.shots.onTarget.away}`}
              icon={Target}
            />
            <StatItem
              label='Shots off Target'
              value={`${coreStats.shots.offTarget.home} - ${coreStats.shots.offTarget.away}`}
              icon={Target}
            />
            <StatItem
              label='Corner Kicks'
              value={`${coreStats.corners.home} - ${coreStats.corners.away}`}
              icon={Flag}
            />
            <StatItem
              label='Yellow Cards'
              value={`${coreStats.cards.yellow.home} - ${coreStats.cards.yellow.away}`}
              icon={AlertCircle}
            />
            <StatItem
              label='Total Attacks'
              value={`${coreStats.attacks.home} - ${coreStats.attacks.away}`}
              icon={Shield}
            />
            <StatItem
              label='Possession'
              value={`${coreStats.possession.home}% - ${coreStats.possession.away}%`}
              icon={Circle}
            />
          </div>

          {/* Main Stats Comparisons */}
          <div className='space-y-4 mb-6'>
            <StatComparison
              label='Possession'
              home={coreStats.possession.home}
              away={coreStats.possession.away}
              total={100}
            />
            <StatComparison
              label='Total Attacks'
              home={coreStats.attacks.home}
              away={coreStats.attacks.away}
              total={coreStats.attacks.home + coreStats.attacks.away || 1}
            />
            <StatComparison
              label='Dangerous Attacks'
              home={coreStats.dangerous.home}
              away={coreStats.dangerous.away}
              total={coreStats.dangerous.home + coreStats.dangerous.away || 1}
            />
          </div>

          {/* Momentum Chart */}
          {trendData.length > 0 && (
            <div className='mb-6'>
              <div className='flex items-center gap-2 mb-2'>
                <TrendingUp size={16} className='text-gray-600' />
                <h4 className='font-semibold'>Match Momentum</h4>
              </div>
              <div className='bg-gray-50 rounded-lg p-3'>
                <div className='flex justify-between text-xs text-gray-500 mb-2'>
                  <span className='flex items-center gap-1'>
                    <div className='w-2 h-2 rounded-full bg-blue-500'></div>
                    {homeTeam?.name}
                  </span>
                  <span className='flex items-center gap-1'>
                    {awayTeam?.name}
                    <div className='w-2 h-2 rounded-full bg-red-500'></div>
                  </span>
                </div>
                <MomentumChart
                  data={trendData}
                  homeTeam={homeTeam?.name}
                  awayTeam={awayTeam?.name}
                />
              </div>
            </div>
          )}

          {/* Match Timeline and Details */}
          <div className='flex justify-between mb-6'>
            {/* Match Timeline */}
            <div className='bg-gray-50 rounded-lg p-4 w-1/2'>
              <div className='flex items-center gap-2 mb-4'>
                <Activity size={18} className='text-gray-600' />
                <h4 className='font-semibold'>Match Timeline</h4>
              </div>
              <div className='max-h-[300px] overflow-y-auto mx-8'>
                {events.map((event, index) => (
                  <div key={index} className='px-8'>
                    <TimelineEvent key={index} event={event} />
                  </div>
                ))}
              </div>
            </div>

            {/* Details Box */}
            <div className='bg-gray-50 rounded-lg p-4 w-1/2'>
              <h4 className='font-semibold mb-2'>Match Details</h4>
              <div className='space-y-2'>
                {details?.values ? (
                  Object.entries(details.values).map(([key, detail]) => (
                    <div key={key} className='flex justify-between'>
                      <span>{detail.name}</span>
                      <span>
                        {detail.value.home} - {detail.value.away}
                      </span>
                    </div>
                  ))
                ) : (
                  <div>No details available</div>
                )}
              </div>
            </div>
          </div>

          {/* New Situations Section */}
          <div className='bg-gray-50 rounded-lg p-4 mt-4'>
            <h4 className='font-semibold mb-2'>Match Situations</h4>
            <div className='font-medium mb-2'>
              Total Attacks: Home - {totalHomeAttacks}, Away -{' '}
              {totalAwayAttacks}
            </div>
            <div className='space-y-2'>
              {situations.map((situation, index) => (
                <div key={index} className='flex justify-between'>
                  <span>Time: {situation.time}'</span>
                  <span>Home Attack: {situation.home.attack}</span>
                  <span>Away Attack: {situation.away.attack}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Probability & Analysis */}
          <div className='grid md:grid-cols-2 gap-6 mb-6'>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-blue-50 rounded-lg p-4'>
                  <div className='text-sm text-blue-600 mb-1'>
                    Home Goal Probability
                  </div>
                  <div className='text-2xl font-bold text-blue-700'>
                    {goalProbability?.home?.toFixed(1)}%
                  </div>
                </div>
                <div className='bg-red-50 rounded-lg p-4'>
                  <div className='text-sm text-red-600 mb-1'>
                    Away Goal Probability
                  </div>
                  <div className='text-2xl font-bold text-red-700'>
                    {goalProbability?.away?.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-gray-50 rounded-lg p-4'>
              <h4 className='font-semibold mb-2'>Match Analysis</h4>
              <div className='text-sm'>
                <div className='font-medium text-gray-800'>
                  {recommendation?.type}
                </div>
                <div className='text-gray-600 mt-1'>
                  Confidence: {recommendation?.confidence}/10
                </div>
                <div className='mt-2 space-y-1'>
                  {recommendation?.reasons?.map((reason, index) => (
                    <div
                      key={index}
                      className='text-gray-600 flex items-start gap-2'
                    >
                      <span>•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button
            className='w-full py-2 flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors'
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp size={16} />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                <span>Show Additional Details</span>
              </>
            )}
          </button>

          {/* Expanded Content */}
          {expanded && (
            <div className='mt-6 space-y-6'>
              {/* H2H Information */}
              {h2h && (
                <div className='space-y-4'>
                  <div className='flex items-center gap-2 mb-4'>
                    <Users size={18} className='text-gray-600' />
                    <h3 className='font-semibold'>Head to Head History</h3>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Previous Meetings */}
                    <div className='bg-white rounded-lg border border-gray-100 p-4'>
                      <h4 className='font-medium mb-3'>Previous Meetings</h4>
                      <div className='space-y-2'>
                        {/* Initialize total goals */}
                        {(() => {
                          let homeGoals = 0;
                          let awayGoals = 0;

                          // Calculate total goals
                          if (h2h.matches && h2h.matches.length > 0) {
                            h2h.matches.forEach((match) => {
                              homeGoals += match.result.home || 0;
                              awayGoals += match.result.away || 0;
                            });
                          }

                          return (
                            <>
                              {/* Display total goals above the list */}
                              <div className='mt-4'>
                                <div className='font-medium'>
                                  Total Goals: Home - {homeGoals}, Away -{' '}
                                  {awayGoals}
                                </div>
                              </div>

                              {h2h.matches?.map((match, idx) => (
                                <div
                                  key={idx}
                                  className='flex items-center justify-between text-sm'
                                >
                                  <div className='text-gray-500'>
                                    {new Date(
                                      match.time.uts * 1000
                                    ).toLocaleDateString()}
                                  </div>
                                  <div className='font-medium'>
                                    {match.result.home} - {match.result.away}
                                  </div>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Current Form */}
                    <div className='bg-white rounded-lg border border-gray-100 p-4'>
                      <h4 className='font-medium mb-3'>Current Form</h4>
                      <div className='space-y-4'>
                        {[form.home, form.away].map((team) => {
                          // Initialize counters
                          let wins = 0;
                          let draws = 0;
                          let losses = 0;

                          // Count results
                          team?.matches?.forEach((match) => {
                            if (match.result.home > match.result.away) {
                              wins++;
                            } else if (match.result.home < match.result.away) {
                              losses++;
                            } else {
                              draws++;
                            }
                          });

                          return (
                            <div key={team.team._id} className='space-y-1'>
                              <div className='text-sm text-gray-600'>
                                {team.team.name}
                              </div>
                              <div className='flex gap-1'>
                                {team.matches.map((match) => (
                                  <div
                                    key={match._id}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium
                                    ${
                                      match.result.home > match.result.away
                                        ? 'bg-green-500'
                                        : match.result.home < match.result.away
                                        ? 'bg-red-500'
                                        : 'bg-gray-500'
                                    }`}
                                  >
                                    {match.result.home > match.result.away
                                      ? 'W'
                                      : match.result.home < match.result.away
                                      ? 'L'
                                      : 'D'}
                                  </div>
                                ))}
                              </div>
                              <div className='text-sm text-gray-600'>
                                Wins: {wins}, Draws: {draws}, Losses: {losses}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {availableMarkets.length > 0 && (
                <div className='space-y-4'>
                  <div className='flex items-center gap-2 mb-4'>
                    <Ticket size={18} className='text-gray-600' />
                    <h3 className='font-semibold'>Available Markets</h3>
                  </div>
                  <div className='grid md:grid-cols-2 gap-4'>
                    {availableMarkets.map((market, index) => (
                      <MarketOddsCard key={index} market={market}>
                        <div className='probability'>
                          {market.outcomes.map((outcome) => (
                            <div
                              key={outcome.id}
                              className={
                                outcome.probability > 0.7
                                  ? 'text-green-600 font-bold'
                                  : ''
                              }
                            >
                              {outcome.desc}: {outcome.probability}
                            </div>
                          ))}
                        </div>
                      </MarketOddsCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchCard;
