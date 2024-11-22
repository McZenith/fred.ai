import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp,
  Activity,
  Goal,
  ChevronUp,
  Percent,
  Clock,
  Scale,
  ArrowDown,
  ArrowUp,
  Minus,
} from 'lucide-react';
import PropTypes from 'prop-types';

// Utility function to get market values
const getMarketValue = (markets, outcome, specifier = null) => {
  // For total goals markets
  const market = markets?.find((m) => {
    if (specifier) {
      return m.id === '18' || (m.id === '19' && m.specifier === specifier);
    }
    // For team totals
    if (outcome.team === 'home') {
      return m.id === '19' && m.specifier === outcome.specifier;
    }
    if (outcome.team === 'away') {
      return m.id === '20' && m.specifier === outcome.specifier;
    }
    // For BTTS
    if (outcome.type === 'btts') {
      return m.id === '29';
    }
    return false;
  });

  let probability = null;
  let odds = null;

  if (market) {
    const outcomeObj = market.outcomes.find((o) => {
      if (outcome.type === 'btts') {
        return o.desc === 'Yes';
      }
      return o.desc === outcome.desc;
    });

    if (outcomeObj) {
      probability = parseFloat(outcomeObj.probability);
      odds = parseFloat(outcomeObj.odds);
    }
  }

  return { odds, probability };
};

// Utility function to calculate difference
const calculateDiff = (current, previous) => {
  if (!current || !previous) return null;
  return ((current - previous) / previous) * 100;
};

// Utility function to render trend arrows
const renderTrend = (diff) => {
  if (diff === null) return <Minus className='w-4 h-4 text-gray-400' />;

  if (diff > 0) {
    return (
      <div className='flex items-center text-green-600'>
        <ArrowUp className='w-4 h-4' />
        <span className='text-xs ml-1'>({diff.toFixed(1)}%)</span>
      </div>
    );
  }

  return (
    <div className='flex items-center text-red-600'>
      <ArrowDown className='w-4 h-4' />
      <span className='text-xs ml-1'>({Math.abs(diff).toFixed(1)}%)</span>
    </div>
  );
};

// Base OddsComparison component for 1X2
const OddsComparison1X2 = ({ markets, currentOdds, homeTeam, awayTeam }) => {
  const market = markets?.find((m) => m.id === '1');
  const findPreMatchOdds = (market) => {
    if (!market) return null;

    return {
      home: market.outcomes.find((o) => o.desc === 'Home')?.odds || '-',
      draw: market.outcomes.find((o) => o.desc === 'Draw')?.odds || '-',
      away: market.outcomes.find((o) => o.desc === 'Away')?.odds || '-',
    };
  };

  const preMatchOdds = findPreMatchOdds(market);

  const getOddsDifference = (current, previous) => {
    if (!current || !previous || current === '-' || previous === '-')
      return null;
    return (
      ((parseFloat(current) - parseFloat(previous)) / parseFloat(previous)) *
      100
    );
  };

  const renderOddChange = (current, previous) => {
    const diff = getOddsDifference(current, previous);
    if (diff === null) return <Minus className='w-4 h-4 text-gray-400' />;

    if (diff > 0) {
      return (
        <div className='flex items-center text-green-600'>
          <ArrowUp className='w-4 h-4' />
          <span className='text-xs ml-1'>({diff.toFixed(1)}%)</span>
        </div>
      );
    }

    return (
      <div className='flex items-center text-red-600'>
        <ArrowDown className='w-4 h-4' />
        <span className='text-xs ml-1'>({Math.abs(diff).toFixed(1)}%)</span>
      </div>
    );
  };

  return (
    <div className='grid grid-cols-3 gap-4 mb-6'>
      {/* Home Win Card */}
      <div className='p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200'>
        <div className='text-sm font-medium text-blue-900 mb-2'>
          {homeTeam || 'Home'} Win
        </div>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-blue-700'>Pre-match</span>
            <span className='font-semibold text-blue-900'>
              {preMatchOdds?.home || '-'}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-blue-700'>Current</span>
            <span className='font-bold text-blue-900'>
              {currentOdds?.home || '-'}
            </span>
          </div>
          <div className='flex justify-end'>
            {renderOddChange(currentOdds?.home, preMatchOdds?.home)}
          </div>
        </div>
      </div>

      {/* Draw Card */}
      <div className='p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200'>
        <div className='text-sm font-medium text-gray-900 mb-2'>Draw</div>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-gray-600'>Pre-match</span>
            <span className='font-semibold text-gray-900'>
              {preMatchOdds?.draw || '-'}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-gray-600'>Current</span>
            <span className='font-bold text-gray-900'>
              {currentOdds?.draw || '-'}
            </span>
          </div>
          <div className='flex justify-end'>
            {renderOddChange(currentOdds?.draw, preMatchOdds?.draw)}
          </div>
        </div>
      </div>

      {/* Away Win Card */}
      <div className='p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200'>
        <div className='text-sm font-medium text-red-900 mb-2'>
          {awayTeam || 'Away'} Win
        </div>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-red-700'>Pre-match</span>
            <span className='font-semibold text-red-900'>
              {preMatchOdds?.away || '-'}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-red-700'>Current</span>
            <span className='font-bold text-red-900'>
              {currentOdds?.away || '-'}
            </span>
          </div>
          <div className='flex justify-end'>
            {renderOddChange(currentOdds?.away, preMatchOdds?.away)}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdditionalMarketsComparison = ({ prematchMarkets, liveMarkets }) => {
  const outcomes = [
    // Team totals - Home
    {
      name: 'Home Over 1.5',
      team: 'home',
      specifier: 'total=1.5',
      desc: 'Over 1.5',
    },
    {
      name: 'Home Over 2.5',
      team: 'home',
      specifier: 'total=2.5',
      desc: 'Over 2.5',
    },
    // Team totals - Away
    {
      name: 'Away Over 1.5',
      team: 'away',
      specifier: 'total=1.5',
      desc: 'Over 1.5',
    },
    {
      name: 'Away Over 2.5',
      team: 'away',
      specifier: 'total=2.5',
      desc: 'Over 2.5',
    },
    // Match totals
    {
      name: 'Over/Under 1.5',
      specifier: 'total=1.5',
      desc: 'Over/Under 1.5',
    },
    {
      name: 'Over/Under 2.5',
      specifier: 'total=2.5',
      desc: 'Over/Under 2.5',
    },
    // BTTS
    {
      name: 'Both Teams to Score',
      type: 'btts',
      desc: 'Yes',
    },
  ];

  return (
    <div className='bg-white rounded-lg shadow-sm border border-gray-100'>
      <div className='p-4 border-b border-gray-100'>
        <div className='flex items-center gap-2'>
          <TrendingUp className='text-blue-600' size={20} />
          <h3 className='text-lg font-semibold text-gray-900'>
            Market Analysis
          </h3>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b'>
                Market
              </th>
              <th className='px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b'>
                Pre-Match
              </th>
              <th className='px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b'>
                Live
              </th>
              <th className='px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b'>
                Change
              </th>
              <th className='px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b'>
                Pre Prob%
              </th>
              <th className='px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b'>
                Live Prob%
              </th>
              <th className='px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b'>
                Prob Change
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200'>
            {outcomes.map((outcome, idx) => {
              const pre = getMarketValue(prematchMarkets, outcome);
              const live = getMarketValue(liveMarkets, outcome);
              const isTeamTotal =
                outcome.team === 'home' || outcome.team === 'away';
              const isHomeMarket = outcome.team === 'home';

              return (
                <tr
                  key={idx}
                  className={`
                  hover:bg-gray-50 
                  ${
                    isTeamTotal
                      ? isHomeMarket
                        ? 'bg-blue-50/30'
                        : 'bg-red-50/30'
                      : ''
                  }
                `}
                >
                  <td className='px-4 py-3 text-sm font-medium text-gray-900'>
                    {outcome.name}
                  </td>
                  <td className='px-4 py-3 text-center text-sm text-gray-600'>
                    {pre.odds?.toFixed(2) || '-'}
                  </td>
                  <td className='px-4 py-3 text-center text-sm font-medium text-gray-900'>
                    {live.odds?.toFixed(2) || '-'}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    {renderTrend(calculateDiff(live.odds, pre.odds))}
                  </td>
                  <td className='px-4 py-3 text-center text-sm text-gray-600'>
                    {(pre.probability * 100)?.toFixed(1) || '-'}
                  </td>
                  <td className='px-4 py-3 text-center text-sm font-medium text-gray-900'>
                    {(live.probability * 100)?.toFixed(1) || '-'}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    {renderTrend(
                      calculateDiff(live.probability, pre.probability)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className='p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100'>
        <div className='p-3 bg-blue-50 rounded-lg'>
          <div className='flex items-center gap-2 mb-1'>
            <TrendingUp className='w-4 h-4 text-blue-600' />
            <div className='text-sm font-medium text-gray-900'>
              Value Markets
            </div>
          </div>
          <div className='text-xs text-gray-600'>
            Probability up, odds increased
          </div>
        </div>

        <div className='p-3 bg-green-50 rounded-lg'>
          <div className='flex items-center gap-2 mb-1'>
            <ArrowUp className='w-4 h-4 text-green-600' />
            <div className='text-sm font-medium text-gray-900'>
              Strong Movement
            </div>
          </div>
          <div className='text-xs text-gray-600'>Odds changed &gt;10%</div>
        </div>

        <div className='p-3 bg-red-50 rounded-lg'>
          <div className='flex items-center gap-2 mb-1'>
            <ArrowDown className='w-4 h-4 text-red-600' />
            <div className='text-sm font-medium text-gray-900'>High Risk</div>
          </div>
          <div className='text-xs text-gray-600'>Largest probability drops</div>
        </div>
      </div>
    </div>
  );
};

const PredictionTab = ({
  details,
  liveMarkets,
  market,
  tournament,
  h2h,
  form,
  homeGoals = 0,
  awayGoals = 0,
  events = [],
  homeTeam,
  awayTeam,
}) => {
  // Initial state with comprehensive stats structure
  const [predictions, setPredictions] = useState({
    home: 50,
    away: 50,
    stats: {
      home: {
        goals: 50,
        momentum: 'neutral',
        advantageCount: 0,
      },
      away: {
        goals: 50,
        momentum: 'neutral',
        advantageCount: 0,
      },
    },
  });

  // Helper to format game time with period indication
  const formatGameTime = (minutes, injuryTime, periodNumber = 1) => {
    const period = minutes <= 45 ? '1H' : '2H';
    const adjustedMinutes = minutes > 45 ? minutes - 45 : minutes;

    if (injuryTime) {
      return `${period} ${adjustedMinutes}+${injuryTime}'`;
    }
    return `${period} ${adjustedMinutes}'`;
  };

  // Get current match time
  const getCurrentMatchTime = () => {
    if (!events.length) return '';
    const lastEvent = [...events].reverse().find((event) => event.time !== -1);
    if (!lastEvent) return '';
    return formatGameTime(lastEvent.time, lastEvent.injurytime);
  };

  // Get live odds
  const getLiveOdds = () => {
    const market = liveMarkets?.['0']?.outcomes;
    if (!market) return null;

    return {
      home: market.find((o) => o.desc === 'Home')?.odds,
      draw: market.find((o) => o.desc === 'Draw')?.odds,
      away: market.find((o) => o.desc === 'Away')?.odds,
    };
  };

  // Process timeline from events
  const processedTimeline = useMemo(() => {
    const homeGoals = [];
    const awayGoals = [];

    // Filter goals from events array
    const goals = events
      .filter((event) => event.type === 'goal')
      .map((goal) => ({
        time: goal.time,
        injurytime: goal.injurytime,
        team: goal.team,
        penalty: goal.penalty || false,
        owngoal: goal.owngoal || false,
        period: goal.time <= 45 ? 1 : 2,
      }));

    goals.forEach((goal) => {
      const timeDisplay = formatGameTime(
        goal.time,
        goal.injurytime,
        goal.period
      );
      const goalInfo = {
        time: timeDisplay,
        penalty: goal.penalty,
        ownGoal: goal.owngoal,
      };

      if (goal.team === 'home') {
        homeGoals.push(goalInfo);
      } else {
        awayGoals.push(goalInfo);
      }
    });

    return { homeGoals, awayGoals };
  }, [events]);

  // Helper to parse potentially problematic values
  const parseValue = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Handle period notations like "31/21"
    if (typeof value === 'string' && value.includes('/')) {
      return value.split('/').reduce((sum, num) => sum + parseInt(num) || 0, 0);
    }
    return parseFloat(value) || 0;
  };

  // Helper to calculate comparative percentage
  const calculatePercentage = (home, away) => {
    const total = home + away;
    if (total === 0) return { home: 50, away: 50 };
    return {
      home: (home / total) * 100,
      away: (away / total) * 100,
    };
  };

  // Calculate predictions
  const calculatePredictions = useMemo(() => {
    try {
      let homeScore = 52; // Base home advantage
      let awayScore = 48;
      const homeStats = {};
      const awayStats = {};
      let homeAdvantageCount = 0;
      let awayAdvantageCount = 0;

      // Process goals first
      const totalGoals = homeGoals + awayGoals;
      if (totalGoals > 0) {
        homeStats.goals = (homeGoals / totalGoals) * 100;
        awayStats.goals = (awayGoals / totalGoals) * 100;
        homeScore += ((homeGoals - awayGoals) / Math.max(1, totalGoals)) * 30;
      } else {
        homeStats.goals = 50;
        awayStats.goals = 50;
      }

      if (details?.values) {
        // Process each statistic
        const statsToProcess = {
          // Map stat keys to their weights and processing methods
          ballpossession: { weight: 0.2, key: '110' },
          attacks: { weight: 0.3, key: '1126' },
          dangerousattacks: { weight: 0.4, key: '1029' },
          shotsontarget: { weight: 0.35, key: '125' },
          shotsofftarget: { weight: 0.15, key: '126' },
          cornerkicks: { weight: 0.15, key: '124' },
          ballsafe: { weight: 0.2, key: '1030' },
          yellowcards: { weight: -0.05, key: '40' },
          redcards: { weight: -0.1, key: '50' },
          fouls: { weight: -0.05, key: '129' },
          goalattempts: { weight: 0.25, key: 'goalattempts' },
          freekicks: { weight: 0.1, key: '120' },
          saves: { weight: 0.15, key: '127' },
        };

        // Process each stat type
        Object.entries(statsToProcess).forEach(
          ([statName, { weight, key }]) => {
            const stat = details.values[key];
            if (!stat?.value) return;

            const homeValue = parseValue(stat.value.home);
            const awayValue = parseValue(stat.value.away);

            // Calculate percentages
            const { home: homePercent, away: awayPercent } =
              calculatePercentage(homeValue, awayValue);

            // Store stats
            homeStats[statName] = homePercent;
            awayStats[statName] = awayPercent;

            // Count advantages
            if (homePercent > awayPercent) {
              homeAdvantageCount++;
            } else if (awayPercent > homePercent) {
              awayAdvantageCount++;
            }

            // Adjust prediction score
            if (weight < 0) {
              homeScore += (50 - homePercent) * Math.abs(weight);
            } else {
              homeScore += (homePercent - 50) * weight;
            }
          }
        );

        // Process percentage-specific stats
        const percentageStats = {
          attackpercentage: 'Attack %',
          dangerousattackpercentage: 'Dangerous Attack %',
          ballsafepercentage: 'Ball Safe %',
        };

        Object.entries(percentageStats).forEach(([key, label]) => {
          const stat = details.values[key];
          if (!stat?.value) return;

          const homeValue = parseValue(stat.value.home);
          const awayValue = parseValue(stat.value.away);

          homeStats[key] = homeValue;
          awayStats[key] = awayValue;

          if (homeValue > awayValue) {
            homeAdvantageCount++;
          } else if (awayValue > homeValue) {
            awayAdvantageCount++;
          }
        });
      }

      // Process Form data
      if (form) {
        const homeForm = parseFloat(form.home) || 0;
        const awayForm = parseFloat(form.away) || 0;
        const totalForm = homeForm + awayForm;

        if (totalForm > 0) {
          homeStats.recentform = (homeForm / totalForm) * 100;
          awayStats.recentform = (awayForm / totalForm) * 100;
          homeScore += ((homeStats.recentform - 50) / 100) * 15;
        } else {
          homeStats.recentform = 50;
          awayStats.recentform = 50;
        }
      } else {
        homeStats.recentform = 50;
        awayStats.recentform = 50;
      }

      // Process H2H data
      if (h2h) {
        const { home: homePercent, away: awayPercent } = calculatePercentage(
          h2h.home || 0,
          h2h.away || 0
        );
        homeStats.h2hwins = homePercent;
        awayStats.h2hwins = awayPercent;
        homeScore += (homePercent - 50) * 0.1;
      }

      // Calculate momentum based on goals and activity
      const homeActivity =
        (homeStats.attacks || 50) + (homeStats.dangerousattacks || 50);
      const awayActivity =
        (awayStats.attacks || 50) + (awayStats.dangerousattacks || 50);

      homeStats.momentum =
        homeGoals > awayGoals
          ? 'high'
          : homeGoals < awayGoals
          ? 'low'
          : homeActivity > awayActivity
          ? 'high'
          : 'neutral';

      awayStats.momentum =
        awayGoals > homeGoals
          ? 'high'
          : awayGoals < homeGoals
          ? 'low'
          : awayActivity > homeActivity
          ? 'high'
          : 'neutral';

      // Ensure prediction scores are within bounds
      homeScore = Math.max(10, Math.min(100, homeScore));
      awayScore = 100 - homeScore;

      // Add advantage counts
      homeStats.advantageCount = homeAdvantageCount;
      awayStats.advantageCount = awayAdvantageCount;

      return {
        home: Math.round(homeScore),
        away: Math.round(awayScore),
        stats: {
          home: homeStats,
          away: awayStats,
        },
      };
    } catch (error) {
      console.error('Error calculating predictions:', error);
      return predictions;
    }
  }, [details, h2h, form, homeGoals, awayGoals]);

  useEffect(() => {
    setPredictions(calculatePredictions);
  }, [calculatePredictions]);

  // Calculate total comparison across all metrics
  const calculateTotalComparison = (stats) => {
    const homeTotal = Object.entries(stats.home)
      .filter(
        ([key, value]) =>
          key !== 'momentum' &&
          key !== 'advantageCount' &&
          typeof value === 'number'
      )
      .reduce((sum, [_, value]) => sum + value, 0);

    const awayTotal = Object.entries(stats.away)
      .filter(
        ([key, value]) =>
          key !== 'momentum' &&
          key !== 'advantageCount' &&
          typeof value === 'number'
      )
      .reduce((sum, [_, value]) => sum + value, 0);

    const totalMetrics = Object.keys(stats.home).filter(
      (key) =>
        key !== 'momentum' &&
        key !== 'advantageCount' &&
        typeof stats.home[key] === 'number'
    ).length;

    return {
      home: (homeTotal / (totalMetrics * 100)) * 100,
      away: (awayTotal / (totalMetrics * 100)) * 100,
    };
  };

  // Format stat labels for display
  const formatStatLabel = (key) => {
    const labels = {
      goals: 'Goals',
      ballpossession: 'Ball Possession',
      attacks: 'Attacks',
      dangerousattacks: 'Dangerous Attacks',
      shotsontarget: 'Shots on Target',
      shotsofftarget: 'Shots off Target',
      cornerkicks: 'Corner Kicks',
      ballsafe: 'Ball Safe',
      yellowcards: 'Yellow Cards',
      redcards: 'Red Cards',
      fouls: 'Fouls',
      goalattempts: 'Goal Attempts',
      freekicks: 'Free Kicks',
      saves: 'Saves',
      attackpercentage: 'Attack Rate',
      dangerousattackpercentage: 'Dangerous Attack Rate',
      ballsafepercentage: 'Ball Safe Rate',
      recentform: 'Recent Form',
      h2hwins: 'H2H Wins',
    };
    return (
      labels[key] ||
      key
        .replace(/([A-Z])/g, ' $1')
        .split(/[^a-zA-Z0-9]+/)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(' ')
    );
  };

  // Render individual stat row
  const renderStat = (key, value, isWinning) => {
    if (value === undefined || key === 'momentum' || key === 'advantageCount')
      return null;
    if (typeof value !== 'number') return null;

    return (
      <div
        key={key}
        className='flex justify-between items-center py-1.5 hover:bg-gray-50 rounded px-2'
      >
        <span className='text-gray-600'>{formatStatLabel(key)}</span>
        <div className='flex items-center'>
          <span
            className={`font-medium ${
              isWinning ? 'text-green-600' : 'text-gray-700'
            }`}
          >
            {value.toFixed(1)}%
            {isWinning && (
              <ChevronUp className='inline ml-1 text-green-600' size={16} />
            )}
          </span>
        </div>
      </div>
    );
  };

  // Render team stats section
  const renderTeamStats = (side) => {
    const stats = predictions.stats[side];
    const otherSide = side === 'home' ? 'away' : 'home';
    const otherStats = predictions.stats[otherSide];
    const totalStats = Object.keys(stats).filter(
      (key) =>
        key !== 'momentum' &&
        key !== 'advantageCount' &&
        typeof stats[key] === 'number'
    ).length;

    const totalComparison = calculateTotalComparison(predictions.stats);
    const teamColor = side === 'home' ? 'blue' : 'red';
    const teamName = side === 'home' ? homeTeam : awayTeam;

    return (
      <div className={`bg-${teamColor}-50 rounded-lg p-6`}>
        {/* Team Header */}
        <div className='flex justify-between items-center mb-4'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>
              {teamName || `${side === 'home' ? 'Home' : 'Away'} Team`}
            </h3>
            <span className='text-sm text-gray-500'>
              {side === 'home' ? 'Home' : 'Away'}
            </span>
          </div>
          <div className='text-3xl font-bold text-blue-600'>
            {predictions.stats[side].goals.toFixed(1)}%
          </div>
        </div>

        {/* Overall Comparison */}
        <div className='mb-4 p-3 bg-white rounded-lg shadow-sm'>
          <h4 className='text-sm font-medium text-gray-700 mb-2'>
            Overall Comparison
          </h4>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <Percent className={`mr-2 text-${teamColor}-600`} size={20} />
              <span className={`text-2xl font-bold text-${teamColor}-600`}>
                {totalComparison[side].toFixed(1)}%
              </span>
            </div>
            <span className='text-sm text-gray-600'>
              Average across all metrics
            </span>
          </div>
        </div>

        {/* Statistical Summary */}
        <div className='mb-4 p-3 bg-white rounded-lg shadow-sm'>
          <h4 className='text-sm font-medium text-gray-700 mb-2'>
            Statistical Overview
          </h4>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <div className='text-2xl font-bold text-green-600'>
                {stats.advantageCount}
              </div>
              <div className='text-sm text-gray-600'>Winning Stats</div>
            </div>
            <div>
              <div className='text-2xl font-bold text-blue-600'>
                {totalStats}
              </div>
              <div className='text-sm text-gray-600'>Total Stats</div>
            </div>
          </div>
        </div>

        {/* Detailed Stats List */}
        <div className='space-y-1 bg-white rounded-lg p-3'>
          <div className='flex justify-between items-center mb-2 pb-2 border-b'>
            <span className='font-medium text-gray-700'>Metric</span>
            <span className='font-medium text-gray-700'>Share %</span>
          </div>
          {Object.entries(stats)
            .sort(([keyA], [keyB]) => {
              if (keyA === 'goals') return -1;
              if (keyB === 'goals') return 1;
              return keyA.localeCompare(keyB);
            })
            .map(([key, value]) => {
              let isWinning = value > (otherStats[key] || 0);
              return renderStat(key, value, isWinning);
            })}
        </div>

        {/* Momentum Indicator */}
        {stats.momentum && (
          <div className='mt-4 p-3 bg-white rounded-lg'>
            <div className='flex justify-between items-center'>
              <span className='text-gray-600'>Momentum</span>
              <span
                className={`font-medium ${
                  stats.momentum === 'high' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stats.momentum.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      {/* Match Score and Odds Section */}
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex items-center gap-2'>
            <Scale size={20} className='text-gray-600' />
            <h3 className='text-base font-semibold'>Match Analysis</h3>
          </div>
          <span className='text-sm font-medium text-gray-500'>
            {getCurrentMatchTime()}
          </span>
        </div>

        {/* 1X2 Odds Comparison */}
        <OddsComparison1X2
          markets={market?.enrichedData?.prematchMarketData}
          currentOdds={getLiveOdds()}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />

        {/* Additional Markets Analysis */}
        <AdditionalMarketsComparison
          prematchMarkets={market?.enrichedData?.prematchMarketData}
          liveMarkets={liveMarkets}
        />

        {/* Score and Timeline Display */}
        <div className='flex justify-around items-center mt-6 pt-6 border-t border-gray-100'>
          {/* Home Team Score */}
          <div className='text-center w-1/3'>
            <div className='text-lg font-medium text-gray-600 mb-2'>
              {homeTeam || 'Home'}
            </div>
            <div className='text-6xl font-bold text-blue-500'>{homeGoals}</div>
            <div className='mt-3 space-y-1'>
              {processedTimeline.homeGoals.map((goal, index) => (
                <div
                  key={index}
                  className='flex items-center justify-center text-sm text-gray-600'
                >
                  <Clock className='w-4 h-4 mr-1 text-blue-500' />
                  {goal.time}
                  {goal.penalty && (
                    <span className='ml-1 text-amber-600'>(P)</span>
                  )}
                  {goal.ownGoal && (
                    <span className='ml-1 text-red-600'>(OG)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* VS Divider */}
          <div className='text-4xl font-bold text-gray-300'>VS</div>

          {/* Away Team Score */}
          <div className='text-center w-1/3'>
            <div className='text-lg font-medium text-gray-600 mb-2'>
              {awayTeam || 'Away'}
            </div>
            <div className='text-6xl font-bold text-red-500'>{awayGoals}</div>
            <div className='mt-3 space-y-1'>
              {processedTimeline.awayGoals.map((goal, index) => (
                <div
                  key={index}
                  className='flex items-center justify-center text-sm text-gray-600'
                >
                  <Clock className='w-4 h-4 mr-1 text-red-500' />
                  {goal.time}
                  {goal.penalty && (
                    <span className='ml-1 text-amber-600'>(P)</span>
                  )}
                  {goal.ownGoal && (
                    <span className='ml-1 text-red-600'>(OG)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team Statistics Section */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {renderTeamStats('home')}
        {renderTeamStats('away')}
      </div>

      {/* Scoring Factors Section */}
      <div className='bg-white rounded-lg shadow p-6'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>
          Scoring Factors
        </h3>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {/* Positive Factors */}
          <div className='p-4 bg-emerald-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <Goal className='text-emerald-600' size={20} />
              <span className='font-medium text-gray-700'>
                Positive Factors
              </span>
            </div>
            <div className='text-sm text-gray-600 space-y-1'>
              <div>Home Advantage: +2 base</div>
              <div>Possession: +20 max</div>
              <div>Attack Success: +30 max</div>
              <div>Dangerous Attacks: +40 max</div>
              <div>Shots on Target: +35 max</div>
            </div>
          </div>

          {/* Momentum Factors */}
          <div className='p-4 bg-amber-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <TrendingUp className='text-amber-600' size={20} />
              <span className='font-medium text-gray-700'>
                Momentum Factors
              </span>
            </div>
            <div className='text-sm text-gray-600 space-y-1'>
              <div>Recent Form: +15 max</div>
              <div>H2H History: +10 max</div>
              <div>Current Score Impact</div>
              <div>Activity Level Impact</div>
            </div>
          </div>

          {/* Match Factors */}
          <div className='p-4 bg-rose-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <Activity className='text-rose-600' size={20} />
              <span className='font-medium text-gray-700'>Match Factors</span>
            </div>
            <div className='text-sm text-gray-600 space-y-1'>
              <div>Cards Impact: -5 each</div>
              <div>Corners: +15 max</div>
              <div>Min Score: 10 points</div>
              <div>Max Score: 100 points</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// PropTypes
PredictionTab.propTypes = {
  market: PropTypes.object,
  details: PropTypes.object,
  h2h: PropTypes.object,
  form: PropTypes.object,
  homeGoals: PropTypes.number,
  awayGoals: PropTypes.number,
  events: PropTypes.array,
  homeTeam: PropTypes.string,
  awayTeam: PropTypes.string,
  liveMarkets: PropTypes.object,
  tournament: PropTypes.object,
};

export default PredictionTab;