import React, { useState } from 'react';

import {
  Card,
  CardContent,
  ScrollArea,
  Tabs,
  Badge,
  Button,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Card';
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
import TournamentTable from './TournamentTable';
import PredictionTab from './PredictionTab';
// Utility Components
const StatComparison = ({ label, home, away, total }) => {
  const homePercent = (home / total) * 100;
  const awayPercent = (away / total) * 100;

  return (
    <div className='bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300'>
      <div className='flex justify-between text-sm mb-3'>
        <span className='font-semibold text-blue-600'>{home}</span>
        <span className='font-medium text-gray-600'>{label}</span>
        <span className='font-semibold text-red-600'>{away}</span>
      </div>
      <div className='flex gap-0.5 h-2.5'>
        <div
          className='bg-gradient-to-r from-blue-600 to-blue-400 rounded-l-full transition-all duration-500'
          style={{ width: `${homePercent}%` }}
        />
        <div
          className='bg-gradient-to-r from-red-400 to-red-600 rounded-r-full transition-all duration-500'
          style={{ width: `${awayPercent}%` }}
        />
      </div>
    </div>
  );
};

const StatItem = ({ label, value, icon: Icon }) => (
  <div className='flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300'>
    <div className='p-2.5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg'>
      <Icon size={18} className='text-gray-700' />
    </div>
    <div>
      <div className='text-sm font-medium text-gray-500'>{label}</div>
      <div className='text-lg font-semibold text-gray-900'>{value}</div>
    </div>
  </div>
);

const TimelineEvent = ({ event }) => {
  const getEventIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'shotontarget':
        return <Target className='text-green-500' size={18} />;
      case 'shotofftarget':
        return <Target className='text-gray-400' size={18} />;
      case 'corner':
        return <Flag className='text-blue-500' size={18} />;
      case 'card':
        return (
          <div
            className={`w-3.5 h-4.5 ${
              event.card === 'yellow'
                ? 'bg-gradient-to-br from-yellow-400 to-yellow-500'
                : 'bg-gradient-to-br from-red-500 to-red-600'
            } rounded-sm shadow-sm`}
          />
        );
      default:
        return <Circle className='text-gray-400' size={14} />;
    }
  };

  return (
    <div className='flex items-center gap-4 relative pl-8 pb-5 group'>
      <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-gray-300 group-hover:from-blue-200 group-hover:to-blue-300 transition-colors duration-300' />
      <div className='absolute left-[-8px] bg-white p-1 rounded-full shadow-sm border border-gray-100 group-hover:border-blue-200 transition-colors duration-300'>
        {getEventIcon(event.type)}
      </div>
      <div className='text-sm font-medium text-gray-500 w-12'>
        {event.time}'
      </div>
      <div className='flex-1'>
        <div className='text-sm group-hover:text-gray-900 transition-colors duration-300'>
          <span
            className={`font-semibold ${
              event.team === 'home' ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {event.team.toUpperCase()}
          </span>
          {' - '}
          {event.name}
          {event.player?.name && (
            <span className='font-medium ml-1 text-gray-700'>
              {event.player.name}
            </span>
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
        <div className='bg-white p-3 shadow-lg rounded-xl border border-gray-100 text-sm'>
          <p className='font-medium text-gray-900 mb-2'>Minute {label}</p>
          <div className='space-y-1.5'>
            <p className='text-blue-600 flex items-center gap-2'>
              <span className='w-2 h-2 rounded-full bg-blue-500'></span>
              {homeTeam}: {payload[0].value}
            </p>
            <p className='text-red-600 flex items-center gap-2'>
              <span className='w-2 h-2 rounded-full bg-red-500'></span>
              {awayTeam}: {payload[1].value}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className='w-full h-48 mt-4'>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
        >
          <defs>
            <linearGradient id='homeGradient' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='#3b82f6' stopOpacity={0.3} />
              <stop offset='95%' stopColor='#3b82f6' stopOpacity={0} />
            </linearGradient>
            <linearGradient id='awayGradient' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='#ef4444' stopOpacity={0.3} />
              <stop offset='95%' stopColor='#ef4444' stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray='3 3' opacity={0.15} />
          <XAxis
            dataKey='minute'
            tick={{ fontSize: 12 }}
            tickLine={false}
            stroke='#9ca3af'
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            stroke='#9ca3af'
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type='monotone'
            dataKey='home'
            stroke='#3b82f6'
            strokeWidth={2}
            fill='url(#homeGradient)'
          />
          <Area
            type='monotone'
            dataKey='away'
            stroke='#ef4444'
            strokeWidth={2}
            fill='url(#awayGradient)'
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Continue with Batch 2...

// ... Previous Batch 1 code remains the same ...

// Supporting Components
const MarketOddsCard = ({ market, children }) => {
  const getProbabilityColor = (probability) => {
    const prob = parseFloat(probability);
    if (prob >= 0.7) {
      // 70% or higher
      return 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300';
    }
    return 'hover:bg-gray-50 hover:border-gray-300';
  };

  const formatProbability = (probability) => {
    return (parseFloat(probability) * 100).toFixed(1) + '%';
  };

  return (
    <Card className='bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300'>
      <div className='p-5'>
        <div className='flex justify-between items-start mb-4'>
          <div className='space-y-1'>
            <h3 className='font-semibold text-gray-900'>{market.desc}</h3>
            <p className='text-sm text-gray-500'>{market.name}</p>
          </div>
          {market.farNearOdds !== 0 && (
            <Badge
              variant='secondary'
              className={`text-xs ${
                market.farNearOdds === 1
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {market.farNearOdds === 1 ? 'Favorite' : 'Underdog'}
            </Badge>
          )}
        </div>

        <div className='grid grid-cols-3 gap-3'>
          {market.outcomes
            .filter((outcome) => outcome.isActive === 1)
            .map((outcome, idx) => (
              <Button
                key={idx}
                variant='outline'
                className={`flex flex-col items-center p-3 h-auto transition-all ${getProbabilityColor(
                  outcome.probability
                )}`}
              >
                <div className='text-sm text-gray-600 mb-1 text-center'>
                  {outcome.desc}
                </div>
                <div className='font-bold text-gray-900'>{outcome.odds}</div>
                <div
                  className={`text-xs mt-1 ${
                    parseFloat(outcome.probability) >= 0.7
                      ? 'text-green-600 font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  {formatProbability(outcome.probability)}
                </div>
              </Button>
            ))}
        </div>

        {children && (
          <div className='mt-4 pt-4 border-t border-gray-100'>{children}</div>
        )}
      </div>
    </Card>
  );
};

const DetailStats = ({ details }) => {
  // Filter out period-specific stats and empty values
  const relevantStats = Object.entries(details?.values || {}).filter(
    ([key, value]) =>
      !key.includes('period') &&
      (value.value.home !== '' || value.value.away !== '')
  );

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {relevantStats.map(([key, stat]) => (
        <div
          key={key}
          className='bg-white p-4 rounded-xl shadow-sm border border-gray-100'
        >
          <h4 className='text-sm font-medium text-gray-500 mb-2'>
            {stat.name}
          </h4>
          <div className='flex justify-between items-center'>
            <span className='text-lg font-semibold text-blue-600'>
              {stat.value.home}
            </span>
            <span className='text-lg font-semibold text-red-600'>
              {stat.value.away}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const SituationTimeline = ({ situations }) => {
  const timelineData =
    situations?.map((situation) => ({
      minute: situation.time,
      homeAttacks: situation.home.attackcount,
      homeDangerous: situation.home.dangerouscount,
      homeSafe: situation.home.safecount,
      awayAttacks: situation.away.attackcount,
      awayDangerous: situation.away.dangerouscount,
      awaySafe: situation.away.safecount,
    })) || [];

  return (
    <div className='space-y-6'>
      <div className='bg-white rounded-xl border p-6'>
        <h4 className='font-semibold text-gray-900 mb-4'>
          Match Situations Timeline
        </h4>
        <div className='h-[300px]'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart
              data={timelineData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id='homeAttackGradient'
                  x1='0'
                  y1='0'
                  x2='0'
                  y2='1'
                >
                  <stop offset='5%' stopColor='#3b82f6' stopOpacity={0.3} />
                  <stop offset='95%' stopColor='#3b82f6' stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id='awayAttackGradient'
                  x1='0'
                  y1='0'
                  x2='0'
                  y2='1'
                >
                  <stop offset='5%' stopColor='#ef4444' stopOpacity={0.3} />
                  <stop offset='95%' stopColor='#ef4444' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' opacity={0.15} />
              <XAxis
                dataKey='minute'
                tick={{ fontSize: 12 }}
                tickLine={false}
                stroke='#9ca3af'
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                stroke='#9ca3af'
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className='bg-white p-3 shadow-lg rounded-xl border border-gray-100'>
                        <p className='font-medium text-gray-900 mb-2'>
                          Minute {label}
                        </p>
                        <div className='space-y-1 text-sm'>
                          <p className='text-blue-600'>
                            Home Attacks: {payload[0].value}
                          </p>
                          <p className='text-blue-800'>
                            Home Dangerous: {payload[1].value}
                          </p>
                          <p className='text-red-600'>
                            Away Attacks: {payload[2].value}
                          </p>
                          <p className='text-red-800'>
                            Away Dangerous: {payload[3].value}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type='monotone'
                dataKey='homeAttacks'
                stroke='#3b82f6'
                fill='url(#homeAttackGradient)'
                strokeWidth={2}
              />
              <Area
                type='monotone'
                dataKey='homeDangerous'
                stroke='#1d4ed8'
                fill='none'
                strokeWidth={2}
              />
              <Area
                type='monotone'
                dataKey='awayAttacks'
                stroke='#ef4444'
                fill='url(#awayAttackGradient)'
                strokeWidth={2}
              />
              <Area
                type='monotone'
                dataKey='awayDangerous'
                stroke='#b91c1c'
                fill='none'
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const CurrentForm = ({ team }) => {
  // Initialize counters
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let totalGoals = 0;

  // Count results
  if (team?.matches) {
    team.matches.forEach((match) => {
      totalGoals += match.result.home;
      if (match.result.home > match.result.away) wins++;
      else if (match.result.home < match.result.away) losses++;
      else draws++;
    });
  }

  const averageGoals = team.matches?.length
    ? (totalGoals / team.matches.length).toFixed(2)
    : 0;

  const getResultClass = (result) => {
    switch (result) {
      case 'W':
        return 'bg-gradient-to-br from-green-500 to-green-600';
      case 'L':
        return 'bg-gradient-to-br from-red-500 to-red-600';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };

  return (
    <Card className='p-5 space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h4 className='font-semibold text-gray-900'>
            {team?.team?.name || 'Unknown Team'}
          </h4>
          <p className='text-sm text-gray-500'>
            Avg Goals: {averageGoals} per match
          </p>
        </div>
        <div className='text-right text-sm'>
          <div className='font-medium text-gray-900'>
            {team?.matches?.length} matches
          </div>
          <div className='text-gray-500'>
            {wins}W - {draws}D - {losses}L
          </div>
        </div>
      </div>

      <div className='flex flex-wrap gap-2'>
        {team.matches?.map((match) => (
          <div
            key={match._id}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm
              ${getResultClass(
                match.result.home > match.result.away
                  ? 'W'
                  : match.result.home < match.result.away
                  ? 'L'
                  : 'D'
              )}`}
            title={`${match.result.home} - ${match.result.away}`}
          >
            {match.result.home > match.result.away
              ? 'W'
              : match.result.home < match.result.away
              ? 'L'
              : 'D'}
          </div>
        ))}
      </div>

      <ScrollArea className='h-[200px] w-full rounded-md'>
        <div className='space-y-2'>
          {team.matches?.map((match) => (
            <div
              key={match._id}
              className='flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors'
            >
              <div className='text-gray-600'>
                {new Date(match.time.uts * 1000).toLocaleDateString()}
              </div>
              <div className='font-medium text-gray-900'>
                {match.result.home} - {match.result.away}
              </div>
              <div className='text-gray-600'>
                {match.result.home > match.result.away ? '(Home)' : '(Away)'}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

// Continue with Batch 3...

// ... Previous Batches' code remains the same ...

const MatchCard = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const { addToCart, removeFromCart, isInCart } = useCart();

  const handleToggle = () => {
    if (isInCart(event.eventId)) {
      removeFromCart(event.eventId);
    } else {
      addToCart(event);
    }
  };

  // Data extraction and calculations
  const analysis = event.enrichedData?.analysis;
  const stats = analysis?.stats;
  const momentum = analysis?.momentum;
  const h2h = event.enrichedData?.h2h;
  const form = event.enrichedData?.form;
  const tournament = event.enrichedData?.tournament;

  // Core metrics calculations
  const coreMetrics = {
    possession: {
      total: (stats?.possession?.home || 0) + (stats?.possession?.away || 0),
      home: stats?.possession?.home || 0,
      away: stats?.possession?.away || 0,
    },
    attacks: {
      total: (stats?.attacks?.home || 0) + (stats?.attacks?.away || 0),
      home: stats?.attacks?.home || 0,
      away: stats?.attacks?.away || 0,
    },
    dangerous: {
      total: (stats?.dangerous?.home || 0) + (stats?.dangerous?.away || 0),
      home: stats?.dangerous?.home || 0,
      away: stats?.dangerous?.away || 0,
    },
  };

  const trendData =
    momentum?.trend?.map((t) => ({
      minute: t.minute,
      home: t.homeIntensity,
      away: t.awayIntensity,
    })) || [];

  return (
    <div className='w-full max-w-[1920px] mx-auto p-4'>
      <Card className='bg-white shadow-xl rounded-2xl overflow-hidden'>
        {/* Header Section */}
        <div className='p-6 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b'>
          <div className='flex justify-between items-center mb-6'>
            <div className='space-y-1'>
              <h2 className='text-xl font-semibold text-gray-900'>
                {event.sport.category.tournament.name}
              </h2>
              {event.round && (
                <Badge variant='secondary' className='text-sm'>
                  Round {event.round}
                </Badge>
              )}
            </div>
            <Button
              variant='outline'
              size='icon'
              onClick={handleToggle}
              className={`rounded-full p-3 relative transition-all duration-300 ${
                isInCart(event.eventId)
                  ? 'bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-green-50 hover:text-green-600'
              }`}
              title={
                isInCart(event.eventId) ? 'Remove from cart' : 'Add to cart'
              }
            >
              <ShoppingCart
                size={20}
                className={`transition-transform duration-300 ${
                  isInCart(event.eventId) ? 'scale-110' : 'scale-100'
                }`}
              />
              {isInCart(event.eventId) && (
                <span className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white animate-pulse' />
              )}
            </Button>
          </div>

          {/* Score Section */}
          <div className='flex items-center justify-between gap-4 p-6 bg-white rounded-xl shadow-sm'>
            <div className='flex-1 text-right space-y-2'>
              <h3 className='text-3xl font-bold text-gray-900'>
                {event.homeTeamName}
              </h3>
              <span className='text-sm text-gray-500'>Home</span>
            </div>

            <div className='flex flex-col items-center px-8'>
              <div className='text-5xl font-bold tracking-tighter mb-2 bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent'>
                {event.setScore}
              </div>
              <div className='flex items-center gap-2 px-4 py-1.5 bg-white rounded-full shadow-sm border border-gray-200'>
                <Clock size={14} className='text-gray-500' />
                <span className='text-sm font-medium text-gray-700'>
                  {event.playedSeconds || '0'}'
                </span>
              </div>
              <div className='mt-3 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium'>
                {event.matchStatus?.name}
              </div>
            </div>

            <div className='flex-1 space-y-2'>
              <h3 className='text-3xl font-bold text-gray-900'>
                {event.awayTeamName}
              </h3>
              <span className='text-sm text-gray-500'>Away</span>
            </div>
          </div>
        </div>

        <CardContent className='p-6'>
          {/* Quick Stats Grid */}
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8'>
            <StatItem
              label='Shots on Target'
              value={`${stats?.shots?.onTarget?.home || 0} - ${
                stats?.shots?.onTarget?.away || 0
              }`}
              icon={Target}
            />
            <StatItem
              label='Shots off Target'
              value={`${stats?.shots?.offTarget?.home || 0} - ${
                stats?.shots?.offTarget?.away || 0
              }`}
              icon={Target}
            />
            <StatItem
              label='Corner Kicks'
              value={`${stats?.corners?.home || 0} - ${
                stats?.corners?.away || 0
              }`}
              icon={Flag}
            />
            <StatItem
              label='Yellow Cards'
              value={`${stats?.cards?.yellow?.home || 0} - ${
                stats?.cards?.yellow?.away || 0
              }`}
              icon={AlertCircle}
            />
            <StatItem
              label='Total Attacks'
              value={`${coreMetrics.attacks.home} - ${coreMetrics.attacks.away}`}
              icon={Shield}
            />
            <StatItem
              label='Possession'
              value={`${coreMetrics.possession.home}% - ${coreMetrics.possession.away}%`}
              icon={Circle}
            />
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue='stats' className='w-full'>
            <TabsList className='mb-6'>
              <TabsTrigger value='stats'>Match Stats</TabsTrigger>
              <TabsTrigger value='momentum'>Momentum</TabsTrigger>
              <TabsTrigger value='timeline'>Timeline</TabsTrigger>
              <TabsTrigger value='analysis'>Analysis</TabsTrigger>
              <TabsTrigger value='details'>Details</TabsTrigger>
              <TabsTrigger value='prediction'>Prediction</TabsTrigger>
            </TabsList>

            <TabsContent value='details'>
              <div className='space-y-8'>
                <div className='space-y-4'>
                  <div className='flex items-center gap-2'>
                    <Activity size={20} className='text-gray-600' />
                    <h3 className='font-semibold text-gray-900'>
                      Match Details
                    </h3>
                  </div>
                  <DetailStats details={event.enrichedData?.details} />
                </div>

                <div className='space-y-4'>
                  <div className='flex items-center gap-2'>
                    <TrendingUp size={20} className='text-gray-600' />
                    <h3 className='font-semibold text-gray-900'>
                      Situation Analysis
                    </h3>
                  </div>
                  <SituationTimeline
                    situations={event.enrichedData?.situation?.data}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value='prediction'>
              <div className='space-y-8'>
                <div className='space-y-4'>
                  <div className='flex items-center gap-2'>
                    <Activity size={20} className='text-gray-600' />
                    <h3 className='font-semibold text-gray-900'>
                      Match Prediction
                    </h3>
                  </div>
                  <PredictionTab
                    details={event.enrichedData?.details}
                    h2h={event.enrichedData?.h2h}
                    form={event.enrichedData?.form}
                    currentScore={event.setScore}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value='stats'>
              <div className='space-y-4'>
                <StatComparison
                  label='Possession'
                  home={coreMetrics.possession.home}
                  away={coreMetrics.possession.away}
                  total={coreMetrics.possession.total || 100}
                />
                <StatComparison
                  label='Total Attacks'
                  home={coreMetrics.attacks.home}
                  away={coreMetrics.attacks.away}
                  total={coreMetrics.attacks.total || 1}
                />
                <StatComparison
                  label='Dangerous Attacks'
                  home={coreMetrics.dangerous.home}
                  away={coreMetrics.dangerous.away}
                  total={coreMetrics.dangerous.total || 1}
                />
              </div>
            </TabsContent>

            <TabsContent value='momentum'>
              {momentum?.trend && (
                <div className='bg-white rounded-xl border p-6'>
                  <div className='flex items-center gap-2 mb-4'>
                    <TrendingUp size={20} className='text-gray-600' />
                    <h4 className='font-semibold text-gray-900'>
                      Match Momentum
                    </h4>
                  </div>
                  <MomentumChart
                    data={trendData}
                    homeTeam={event.homeTeamName}
                    awayTeam={event.awayTeamName}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value='timeline'>
              <div className='bg-white rounded-xl border p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <Activity size={20} className='text-gray-600' />
                  <h4 className='font-semibold text-gray-900'>
                    Match Timeline
                  </h4>
                </div>
                <ScrollArea className='h-[400px]'>
                  <div className='pr-4'>
                    {momentum?.timeline?.events.map((event, index) => (
                      <TimelineEvent key={index} event={event} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value='analysis'>
              <div className='grid md:grid-cols-2 gap-6'>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='bg-blue-50 rounded-xl p-4'>
                      <div className='text-sm text-blue-600 mb-1'>
                        Home Goal Probability
                      </div>
                      <div className='text-2xl font-bold text-blue-700'>
                        {analysis?.goalProbability?.home?.toFixed(1)}%
                      </div>
                    </div>
                    <div className='bg-red-50 rounded-xl p-4'>
                      <div className='text-sm text-red-600 mb-1'>
                        Away Goal Probability
                      </div>
                      <div className='text-2xl font-bold text-red-700'>
                        {analysis?.goalProbability?.away?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className='bg-white rounded-xl border p-6'>
                  <h4 className='font-semibold text-gray-900 mb-4'>
                    Match Analysis
                  </h4>
                  <div className='space-y-4'>
                    <div className='font-medium text-gray-900'>
                      {analysis?.recommendation?.type}
                    </div>
                    <div className='text-sm text-gray-600'>
                      Confidence: {analysis?.recommendation?.confidence}/10
                    </div>
                    <div className='space-y-2'>
                      {analysis?.recommendation?.reasons?.map(
                        (reason, index) => (
                          <div
                            key={index}
                            className='flex items-start gap-2 text-sm text-gray-600'
                          >
                            <span>•</span>
                            <span>{reason}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Expand/Collapse Button */}
          <div className='mt-8'>
            <Button
              variant='ghost'
              className='w-full'
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className='mr-2' />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className='mr-2' />
                  Show Additional Details
                </>
              )}
            </Button>
          </div>

          {/* Expanded Content */}
          {expanded && (
            <div className='mt-6 space-y-8'>
              {/* H2H Information */}
              {h2h && (
                <div className='space-y-6'>
                  <div className='flex items-center gap-2'>
                    <Users size={20} className='text-gray-600' />
                    <h3 className='font-semibold text-gray-900'>
                      Head to Head History
                    </h3>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='bg-white rounded-xl border p-6'>
                      <h4 className='font-medium text-gray-900 mb-4'>
                        Previous Meetings
                      </h4>
                      <ScrollArea className='h-[300px]'>
                        <div className='space-y-3 pr-4'>
                          {h2h.matches?.map((match, idx) => (
                            <div
                              key={idx}
                              className='flex items-center justify-between py-2 border-b border-gray-100 last:border-0'
                            >
                              <div className='text-sm text-gray-500'>
                                {new Date(
                                  match.time.uts * 1000
                                ).toLocaleDateString()}
                              </div>
                              <div className='font-medium text-gray-900'>
                                {match.result.home} - {match.result.away}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className='space-y-6'>
                      {[form.home, form.away].map((team, idx) => (
                        <CurrentForm key={idx} team={team} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tournament Table */}
              {tournament && <TournamentTable tournament={tournament} />}

              {/* Markets Section */}
              {event.markets.length > 0 && (
                <div className='space-y-6'>
                  <div className='flex items-center gap-2'>
                    <Ticket size={20} className='text-gray-600' />
                    <h3 className='font-semibold text-gray-900'>
                      Available Markets
                    </h3>
                  </div>
                  <div className='grid md:grid-cols-2 gap-6'>
                    {event.markets
                      .filter((market) => market.status === 0)
                      .map((market, index) => (
                        <MarketOddsCard key={index} market={market} />
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
