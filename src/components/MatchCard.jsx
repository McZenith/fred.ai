import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useTransition,
} from 'react';
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
  Activity,
  Users,
  Ticket,
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

  // Optimized StatItem with transition handling
  const StatItem = React.memo(({ label, value, icon: Icon, prevValue }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
      if (value !== prevValue) {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setDisplayValue(value);
          setIsTransitioning(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [value, prevValue]);

    return (
      <div className='flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300'>
        <div className='p-2.5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg'>
          <Icon size={18} className='text-gray-700' />
        </div>
        <div>
          <div className='text-sm font-medium text-gray-500'>{label}</div>
          <div
            className={`text-lg font-semibold text-gray-900 transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {displayValue}
          </div>
        </div>
      </div>
    );
  });

  // Optimized StatComparison with smooth transitions
  const StatComparison = React.memo(
    ({ label, home, away, total, prevHome, prevAway }) => {
      const [displayValues, setDisplayValues] = useState({ home, away });
      const [isTransitioning, setIsTransitioning] = useState(false);

      useEffect(() => {
        if (home !== prevHome || away !== prevAway) {
          setIsTransitioning(true);
          const timer = setTimeout(() => {
            setDisplayValues({ home, away });
            setIsTransitioning(false);
          }, 300);
          return () => clearTimeout(timer);
        }
      }, [home, away, prevHome, prevAway]);

      const homePercent = (displayValues.home / total) * 100;
      const awayPercent = (displayValues.away / total) * 100;

      return (
        <div className='bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300'>
          <div className='flex justify-between text-sm mb-3'>
            <span className='font-semibold text-blue-600'>
              {displayValues.home}
            </span>
            <span className='font-medium text-gray-600'>{label}</span>
            <span className='font-semibold text-red-600'>
              {displayValues.away}
            </span>
          </div>
          <div className='flex gap-0.5 h-2.5'>
            <div
              className='bg-gradient-to-r from-blue-600 to-blue-400 rounded-l-full transition-all duration-500'
              style={{
                width: `${homePercent}%`,
                opacity: isTransitioning ? 0 : 1,
              }}
            />
            <div
              className='bg-gradient-to-r from-red-400 to-red-600 rounded-r-full transition-all duration-500'
              style={{
                width: `${awayPercent}%`,
                opacity: isTransitioning ? 0 : 1,
              }}
            />
          </div>
        </div>
      );
    }
  );

  // Optimized TimelineEvent with transition effects
  const TimelineEvent = React.memo(({ event, isNew = false }) => {
    const [show, setShow] = useState(!isNew);

    useEffect(() => {
      if (isNew) {
        const timer = setTimeout(() => setShow(true), 50);
        return () => clearTimeout(timer);
      }
    }, [isNew]);

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
      <div
        className={`flex items-center gap-4 relative pl-8 pb-5 group transition-all duration-300 ${
          show
            ? 'opacity-100 transform translate-y-0'
            : 'opacity-0 transform -translate-y-2'
        }`}
      >
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
  });

  // Optimized MomentumChart with smooth transitions
  const MomentumChart = React.memo(({ data, homeTeam, awayTeam, prevData }) => {
    const [displayData, setDisplayData] = useState(data);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
      if (JSON.stringify(data) !== JSON.stringify(prevData)) {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setDisplayData(data);
          setIsTransitioning(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [data, prevData]);

    const CustomTooltip = React.memo(({ active, payload, label }) => {
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
    });

    return (
      <div
        className={`w-full h-48 mt-4 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <ResponsiveContainer>
          <AreaChart
            data={displayData}
            style={{ width: '100%', height: '100%' }}
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
              isAnimationActive={false}
            />
            <Area
              type='monotone'
              dataKey='away'
              stroke='#ef4444'
              strokeWidth={2}
              fill='url(#awayGradient)'
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  });

  // DetailStats with transition effects
  const DetailStats = React.memo(({ details, prevDetails }) => {
    const [displayValues, setDisplayValues] = useState(
      () => details?.values || {}
    );
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
      if (
        JSON.stringify(details?.values) !== JSON.stringify(prevDetails?.values)
      ) {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setDisplayValues(details?.values || {});
          setIsTransitioning(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [details, prevDetails]);

    const relevantStats = useMemo(() => {
      return Object.entries(displayValues || {}).filter(
        ([key, value]) =>
          !key.includes('period') &&
          (value?.value?.home !== '' || value?.value?.away !== '')
      );
    }, [displayValues]);

    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {relevantStats?.map(([key, stat]) => (
          <div
            key={key}
            className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100
              transition-all duration-300 hover:shadow-md ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
          >
            <h4 className='text-sm font-medium text-gray-500 mb-2'>
              {stat.name}
            </h4>
            <div className='flex justify-between items-center'>
              <span className='text-lg font-semibold text-blue-600 transition-all duration-300'>
                {stat.value?.home || '0'}
              </span>
              <span className='text-lg font-semibold text-red-600 transition-all duration-300'>
                {stat.value?.away || '0'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  });
  // SituationTimeline with optimized updates
  const SituationTimeline = React.memo(({ situations, prevSituations }) => {
    const [displayData, setDisplayData] = useState([]);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const timelineData = useMemo(() => {
      return (
        situations?.map((situation) => ({
          minute: situation.time,
          homeAttacks: situation.home.attackcount,
          homeDangerous: situation.home.dangerouscount,
          homeSafe: situation.home.safecount,
          awayAttacks: situation.away.attackcount,
          awayDangerous: situation.away.dangerouscount,
          awaySafe: situation.away.safecount,
        })) || []
      );
    }, [situations]);

    useEffect(() => {
      if (JSON.stringify(situations) !== JSON.stringify(prevSituations)) {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setDisplayData(timelineData);
          setIsTransitioning(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [situations, prevSituations, timelineData]);

    const CustomTooltip = React.memo(({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className='bg-white p-3 shadow-lg rounded-xl border border-gray-100'>
            <p className='font-medium text-gray-900 mb-2'>Minute {label}</p>
            <div className='space-y-1 text-sm'>
              <p className='text-blue-600'>Home Attacks: {payload[0].value}</p>
              <p className='text-blue-800'>
                Home Dangerous: {payload[1].value}
              </p>
              <p className='text-red-600'>Away Attacks: {payload[2].value}</p>
              <p className='text-red-800'>Away Dangerous: {payload[3].value}</p>
            </div>
          </div>
        );
      }
      return null;
    });

    return (
      <div className='space-y-6'>
        <div className='bg-white rounded-xl border p-6'>
          <h4 className='font-semibold text-gray-900 mb-4'>
            Match Situations Timeline
          </h4>
          <div
            className={`h-[300px] transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <ResponsiveContainer>
              <AreaChart
                style={{ width: '100%', height: '100%' }}
                data={displayData}
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
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type='monotone'
                  dataKey='homeAttacks'
                  stroke='#3b82f6'
                  fill='url(#homeAttackGradient)'
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type='monotone'
                  dataKey='homeDangerous'
                  stroke='#1d4ed8'
                  fill='none'
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type='monotone'
                  dataKey='awayAttacks'
                  stroke='#ef4444'
                  fill='url(#awayAttackGradient)'
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type='monotone'
                  dataKey='awayDangerous'
                  stroke='#b91c1c'
                  fill='none'
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  });

  // CurrentForm with optimized updates
  const CurrentForm = React.memo(({ team, prevTeam }) => {
    const [displayTeam, setDisplayTeam] = useState(team);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
      if (JSON.stringify(team) !== JSON.stringify(prevTeam)) {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setDisplayTeam(team);
          setIsTransitioning(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [team, prevTeam]);

    const formStats = useMemo(() => {
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let totalGoals = 0;

      if (displayTeam?.matches) {
        displayTeam.matches.forEach((match) => {
          totalGoals += match.result.home;
          if (match.result.home > match.result.away) wins++;
          else if (match.result.home < match.result.away) losses++;
          else draws++;
        });
      }

      const averageGoals = displayTeam.matches?.length
        ? (totalGoals / displayTeam.matches.length).toFixed(2)
        : 0;

      return { wins, draws, losses, totalGoals, averageGoals };
    }, [displayTeam]);

    const getResultClass = useCallback((result) => {
      switch (result) {
        case 'W':
          return 'bg-gradient-to-br from-green-500 to-green-600';
        case 'L':
          return 'bg-gradient-to-br from-red-500 to-red-600';
        default:
          return 'bg-gradient-to-br from-gray-500 to-gray-600';
      }
    }, []);

    return (
      <Card
        className={`p-5 space-y-4 transition-all duration-300 hover:shadow-lg ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <h4 className='font-semibold text-gray-900'>
              {displayTeam?.team?.name || 'Unknown Team'}
            </h4>
            <p className='text-sm text-gray-500'>
              Avg Goals: {formStats.averageGoals} per match
            </p>
          </div>
          <div className='text-right text-sm'>
            <div className='font-medium text-gray-900'>
              {displayTeam?.matches?.length} matches
            </div>
            <div className='text-gray-500'>
              {formStats.wins}W - {formStats.draws}D - {formStats.losses}L
            </div>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          {displayTeam.matches?.map((match, index) => (
            <div
              key={`${match._id}-${index}`}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm
                transition-all duration-300 hover:scale-105 ${getResultClass(
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
            {displayTeam.matches?.map((match, index) => (
              <div
                key={`${match._id}-list-${index}`}
                className='flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300'
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
  });

  // Export wrapper components
  export {
    StatItem,
    StatComparison,
    TimelineEvent,
    MomentumChart,
    DetailStats,
    SituationTimeline,
    CurrentForm,
  };

  // Market odds card with transition effects
  const MarketOddsCard = React.memo(({ market, children, prevMarket }) => {
    const [displayMarket, setDisplayMarket] = useState(market);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
      if (JSON.stringify(market) !== JSON.stringify(prevMarket)) {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setDisplayMarket(market);
          setIsTransitioning(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [market, prevMarket]);

    const getProbabilityColor = useCallback((probability) => {
      const prob = parseFloat(probability);
      if (prob >= 0.7) {
        return 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300';
      }
      return 'hover:bg-gray-50 hover:border-gray-300';
    }, []);

    const formatProbability = useCallback((probability) => {
      return (parseFloat(probability) * 100).toFixed(1) + '%';
    }, []);

    return (
      <Card
        className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className='p-5'>
          <div className='flex justify-between items-start mb-4'>
            <div className='space-y-1'>
              <h3 className='font-semibold text-gray-900'>
                {displayMarket.desc}
              </h3>
              <p className='text-sm text-gray-500'>{displayMarket.name}</p>
            </div>
            {displayMarket.farNearOdds !== 0 && (
              <Badge
                variant='secondary'
                className={`text-xs ${
                  displayMarket.farNearOdds === 1
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {displayMarket.farNearOdds === 1 ? 'Favorite' : 'Underdog'}
              </Badge>
            )}
          </div>

          <div className='grid grid-cols-3 gap-3'>
            {displayMarket.outcomes
              ?.filter((outcome) => outcome.isActive === 1)
              ?.map((outcome, idx) => (
                <Button
                  key={`${outcome.id}-${idx}`}
                  variant='outline'
                  className={`flex flex-col items-center p-3 h-auto transition-all duration-300
                    ${getProbabilityColor(outcome.probability)}`}
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
  });

  // Main MatchCard Component with optimized updates
  const MatchCard = ({ event }) => {
    const cardRef = useRef(null);
    const prevEventRef = useRef(event);
    const [prevScore, setPrevScore] = useState(event.setScore);
    const [scoreOpacity, setScoreOpacity] = useState(1);
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('prediction');
    const [isPending, startTransition] = useTransition();
    const { addToCart, removeFromCart, isInCart, getSelectedTeamType } =
      useCart();
    const [selectedTeamType, setSelectedTeamType] = useState(
      getSelectedTeamType(event.eventId)
    );

    const prevValuesRef = useRef({
      stats: event?.enrichedData?.analysis?.stats,
      momentum: event?.enrichedData?.analysis?.momentum,
      timeline: event?.enrichedData?.timeline,
      situation: event?.enrichedData?.situation,
      details: event?.enrichedData?.details,
      markets: event?.markets,
    });

    const {
      analysis,
      stats,
      momentum,
      h2h,
      form,
      tournament,
      coreMetrics,
      trendData,
    } = useMemo(() => {
      const analysis = event?.enrichedData?.analysis;
      const stats = analysis?.stats;
      const momentum = analysis?.momentum;
      return {
        analysis,
        stats,
        momentum,
        h2h: event?.enrichedData?.h2h,
        form: event?.enrichedData?.form,
        tournament: event?.enrichedData?.tournament,
        coreMetrics: {
          possession: {
            total:
              (stats?.possession?.home || 0) + (stats?.possession?.away || 0),
            home: stats?.possession?.home || 0,
            away: stats?.possession?.away || 0,
          },
          attacks: {
            total: (stats?.attacks?.home || 0) + (stats?.attacks?.away || 0),
            home: stats?.attacks?.home || 0,
            away: stats?.attacks?.away || 0,
          },
          dangerous: {
            total:
              (stats?.dangerous?.home || 0) + (stats?.dangerous?.away || 0),
            home: stats?.dangerous?.home || 0,
            away: stats?.dangerous?.away || 0,
          },
        },
        trendData:
          momentum?.trend?.map((t) => ({
            minute: t.minute,
            home: t.homeIntensity,
            away: t.awayIntensity,
          })) || [],
      };
    }, [event?.enrichedData]);

    useEffect(() => {
      if (prevScore !== event.setScore) {
        setScoreOpacity(0);
        const timer = setTimeout(() => {
          setPrevScore(event.setScore);
          setScoreOpacity(1);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [event.setScore, prevScore]);

    useEffect(() => {
      prevValuesRef.current = {
        stats: event?.enrichedData?.analysis?.stats,
        momentum: event?.enrichedData?.analysis?.momentum,
        timeline: event?.enrichedData?.timeline,
        situation: event?.enrichedData?.situation,
        details: event?.enrichedData?.details,
        markets: event?.markets,
      };
      prevEventRef.current = event;
    }, [event]);

    const handleToggle = useCallback(() => {
      startTransition(() => {
        if (isInCart(event.eventId)) {
          removeFromCart(event.eventId);
        } else {
          addToCart(event);
        }
      });
    }, [event.eventId, isInCart, addToCart, removeFromCart]);

    const details = event.enrichedData?.details;
    const [homeGoals, awayGoals] = event.setScore
      ? event.setScore?.split(':')?.map(Number)
      : [0, 0];

    const getValue = (statName) => (team) => (eventData) => {
      const value = parseInt(
        eventData.enrichedData?.details?.values?.['110']?.value?.[team]
      );
      return isNaN(value) ? null : value;
    };

    const homePossession = getValue('Ball possession')('home')(event) ?? 50;
    const awayPossession = getValue('Ball possession')('away')(event) ?? 50;
    const prevHomePossession =
      getValue('Ball possession')('home')(prevEventRef.current) ?? 50;
    const prevAwayPossession =
      getValue('Ball possession')('away')(prevEventRef.current) ?? 50;

    const scoreDisplay = (
      <div
        className='flex flex-col items-center px-8 transition-opacity duration-300'
        style={{ opacity: scoreOpacity }}
      >
        <div className='text-5xl font-bold tracking-tighter mb-2 bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent'>
          {prevScore}
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
    );

    const HeaderSection = (
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
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleTeamSelect('home')}
              className={`relative transition-all duration-300 ${
                selectedTeamType === 'home'
                  ? 'bg-blue-50 text-blue-600 hover:bg-red-50 hover:text-red-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <div className='flex items-center gap-2'>
                <ShoppingCart size={16} />
                <span>Home</span>
              </div>
              {selectedTeamType === 'home' && (
                <span className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white animate-pulse' />
              )}
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={() => handleTeamSelect('away')}
              className={`relative transition-all duration-300 ${
                selectedTeamType === 'away'
                  ? 'bg-red-50 text-red-600 hover:bg-red-50 hover:text-red-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <div className='flex items-center gap-2'>
                <ShoppingCart size={16} />
                <span>Away</span>
              </div>
              {selectedTeamType === 'away' && (
                <span className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white animate-pulse' />
              )}
            </Button>
          </div>
        </div>

        <div className='flex items-center justify-between gap-4 p-6 bg-white rounded-xl shadow-sm min-h-[180px]'>
          <div className='flex-1 text-right space-y-2'>
            <h3 className='text-3xl font-bold text-gray-900 transition-all duration-300'>
              {event.homeTeamName}
            </h3>
            <span className='text-sm text-gray-500'>Home</span>
          </div>

          {scoreDisplay}

          <div className='flex-1 space-y-2'>
            <h3 className='text-3xl font-bold text-gray-900 transition-all duration-300'>
              {event.awayTeamName}
            </h3>
            <span className='text-sm text-gray-500'>Away</span>
          </div>
        </div>
      </div>
    );

    const StatisticsSection = (
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 min-h-[120px]'>
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
          value={`${stats?.corners?.home || 0} - ${stats?.corners?.away || 0}`}
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
          value={`${homePossession}% - ${awayPossession}%`}
          icon={Circle}
        />
      </div>
    );

    const tabContent = {
      prediction: (
        <PredictionTab
          details={details}
          prevDetails={prevValuesRef.current?.details}
          liveMarkets={event?.markets}
          prevMarkets={prevValuesRef.current?.markets}
          market={event}
          h2h={h2h}
          form={form}
          homeGoals={homeGoals}
          awayGoals={awayGoals}
          events={event?.enrichedData?.timeline?.complete?.events}
          homeTeam={event.homeTeamName}
          awayTeam={event.awayTeamName}
          tournament={event.sport.category.tournament.name}
        />
      ),
      stats: (
        <div className='space-y-4'>
          <StatComparison
            label='Possession'
            home={homePossession}
            away={awayPossession}
            total={100}
            prevHome={prevHomePossession}
            prevAway={prevAwayPossession}
          />
          <StatComparison
            label='Total Attacks'
            home={coreMetrics.attacks.home}
            away={coreMetrics.attacks.away}
            total={coreMetrics.attacks.total || 1}
            prevHome={prevValuesRef.current?.stats?.attacks?.home}
            prevAway={prevValuesRef.current?.stats?.attacks?.away}
          />
          <StatComparison
            label='Dangerous Attacks'
            home={coreMetrics.dangerous.home}
            away={coreMetrics.dangerous.away}
            total={coreMetrics.dangerous.total || 1}
            prevHome={prevValuesRef.current?.stats?.dangerous?.home}
            prevAway={prevValuesRef.current?.stats?.dangerous?.away}
          />
          {/* Add other comparisons */}
        </div>
      ),
      momentum: momentum?.trend && (
        <div className='bg-white rounded-xl border p-6'>
          <div className='flex items-center gap-2 mb-4'>
            <TrendingUp size={20} className='text-gray-600' />
            <h4 className='font-semibold text-gray-900'>Match Momentum</h4>
          </div>
          <MomentumChart
            data={trendData}
            prevData={prevValuesRef.current?.momentum?.trend}
            homeTeam={event.homeTeamName}
            awayTeam={event.awayTeamName}
          />
        </div>
      ),
      timeline: (
        <div className='bg-white rounded-xl border p-6'>
          <div className='flex items-center gap-2 mb-4'>
            <Activity size={20} className='text-gray-600' />
            <h4 className='font-semibold text-gray-900'>Match Timeline</h4>
          </div>
          <ScrollArea className='h-[400px]'>
            <div className='pr-4'>
              {momentum?.timeline?.events?.map((event, index) => (
                <TimelineEvent key={`timeline-${index}`} event={event} />
              ))}
            </div>
          </ScrollArea>
        </div>
      ),
      analysis: (
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
            <h4 className='font-semibold text-gray-900 mb-4'>Match Analysis</h4>
            <div className='space-y-4'>
              <div className='font-medium text-gray-900'>
                {analysis?.recommendation?.type}
              </div>
              <div className='text-sm text-gray-600'>
                Confidence: {analysis?.recommendation?.confidence}/10
              </div>
              <div className='space-y-2'>
                {analysis?.recommendation?.reasons?.map((reason, index) => (
                  <div
                    key={`reason-${index}`}
                    className='flex items-start gap-2 text-sm text-gray-600'
                  >
                    <span>•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      details: (
        <div className='space-y-8'>
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Activity size={20} className='text-gray-600' />
              <h3 className='font-semibold text-gray-900'>Match Details</h3>
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
      ),
      prediction: (
        <div className='space-y-8'>
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Activity size={20} className='text-gray-600' />
              <h3 className='font-semibold text-gray-900'>Match Prediction</h3>
            </div>
            <PredictionTab
              details={details}
              liveMarkets={event?.markets}
              market={event}
              h2h={h2h}
              form={event?.enrichedData?.form}
              homeGoals={homeGoals}
              awayGoals={awayGoals}
              events={event?.enrichedData?.timeline?.complete?.events}
              homeTeam={event.homeTeamName}
              awayTeam={event.awayTeamName}
              tournament={event.sport.category.tournament.name}
            />
          </div>
        </div>
      ),
      // Add other tab content similarly
    };

    const handleTeamSelect = (teamType) => {
      if (isInCart(event.eventId)) {
        if (getSelectedTeamType(event.eventId) === teamType) {
          removeFromCart(event.eventId);
          setSelectedTeamType(null);
        } else {
          removeFromCart(event.eventId);
          addToCart(event, teamType);
          setSelectedTeamType(teamType);
        }
      } else {
        addToCart(event, teamType);
        setSelectedTeamType(teamType);
      }
    };

    return (
      <div className='w-full max-w-[1920px] mx-auto p-4'>
        <Card
          className='bg-white shadow-xl rounded-2xl overflow-hidden'
          ref={cardRef}
        >
          {HeaderSection}
          <CardContent className='p-6'>
            {StatisticsSection}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='w-full'
            >
              <TabsList className='mb-6 sticky top-[72px] bg-white/80 backdrop-blur-sm z-40'>
                <TabsTrigger value='prediction'>Prediction</TabsTrigger>
                <TabsTrigger value='stats'>Match Stats</TabsTrigger>
                <TabsTrigger value='momentum'>Momentum</TabsTrigger>
                <TabsTrigger value='timeline'>Timeline</TabsTrigger>
                <TabsTrigger value='analysis'>Analysis</TabsTrigger>
                <TabsTrigger value='details'>Details</TabsTrigger>
              </TabsList>

              <div className='transition-all duration-300 min-h-[400px]'>
                {Object.entries(tabContent)?.map(([key, content]) => (
                  <TabsContent key={key} value={key} forceMount>
                    <div
                      className={`transition-opacity duration-300 ${
                        activeTab === key ? 'opacity-100' : 'opacity-0 hidden'
                      }`}
                    >
                      {content}
                    </div>
                  </TabsContent>
                ))}
              </div>
            </Tabs>

            <div className='mt-8'>
              <Button
                variant='ghost'
                className='w-full transition-colors duration-300'
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

            {expanded && (
              <div className='mt-6 space-y-8 transition-all duration-500'>
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
                                key={`h2h-${idx}`}
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
                        {[form.home, form.away]?.map((team, idx) => (
                          <CurrentForm
                            key={`form-${idx}`}
                            team={team}
                            prevTeam={
                              prevEventRef.current?.enrichedData?.form?.[
                                idx === 0 ? 'home' : 'away'
                              ]
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tournament Table with optimized updates */}
                {tournament && (
                  <div className='transition-all duration-300'>
                    <TournamentTable
                      tournament={tournament}
                      prevTournament={
                        prevEventRef.current?.enrichedData?.tournament
                      }
                    />
                  </div>
                )}

                {/* Markets Section with smooth transitions */}
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
                        ?.map((market, index) => (
                          <MarketOddsCard
                            key={`market-${index}`}
                            market={market}
                            prevMarket={prevEventRef.current?.markets?.[index]}
                          />
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

  // Optimized comparison function for the memo wrapper
  const arePropsEqual = (prevProps, nextProps) => {
    if (prevProps.event === nextProps.event) return true;

    // Define essential fields to compare
    const essentialFields = [
      'setScore',
      'playedSeconds',
      'matchStatus.name',
      'enrichedData.analysis.stats',
      'enrichedData.analysis.momentum.trend',
      'enrichedData.analysis.momentum.timeline',
      'enrichedData.details.values',
      'markets',
    ];

    // Helper function to safely get nested values
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((acc, part) => acc?.[part], obj);
    };

    // Compare all essential fields
    return essentialFields.every((field) => {
      const prevValue = getNestedValue(prevProps.event, field);
      const nextValue = getNestedValue(nextProps.event, field);

      // Special comparison for arrays and objects
      if (typeof prevValue === 'object' && prevValue !== null) {
        return JSON.stringify(prevValue) === JSON.stringify(nextValue);
      }

      return prevValue === nextValue;
    });
  };

  // Custom hook for transition handling
  const useDataTransition = (currentValue, previousValue, delay = 300) => {
    const [displayValue, setDisplayValue] = useState(currentValue);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
      if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setDisplayValue(currentValue);
          setIsTransitioning(false);
        }, delay);
        return () => clearTimeout(timer);
      }
    }, [currentValue, previousValue, delay]);

    return [displayValue, isTransitioning];
  };

  // Export the optimized components
  export default React.memo(MatchCard, arePropsEqual);
  export { useDataTransition };