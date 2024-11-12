import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Activity, Goal, ChevronUp, Percent } from 'lucide-react';
import PropTypes from 'prop-types';

const PredictionTab = ({
  details,
  h2h,
  form,
  homeGoals = 0,
  awayGoals = 0,
}) => {
  // Initial state with more comprehensive stats structure
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
            // For negative stats (cards, fouls), higher percentage is worse
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

  // Stat formatting helper
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

  let renderStat = (key, value, isWinning) => {
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

  let renderTeamStats = (side) => {
    let stats = predictions.stats[side];
    let otherSide = side === 'home' ? 'away' : 'home';
    let otherStats = predictions.stats[otherSide];
    let totalStats = Object.keys(stats).filter(
      (key) =>
        key !== 'momentum' &&
        key !== 'advantageCount' &&
        typeof stats[key] === 'number'
    ).length;

    const totalComparison = calculateTotalComparison(predictions.stats);

    return (
      <div
        className={`bg-${side === 'home' ? 'blue' : 'red'}-50 rounded-lg p-6`}
      >
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-semibold text-gray-900'>
            {side === 'home' ? 'Home' : 'Away'} Team
          </h3>
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
              <Percent className='mr-2 text-blue-600' size={20} />
              <span className='text-2xl font-bold text-blue-600'>
                {totalComparison[side].toFixed(1)}%
              </span>
            </div>
            <span className='text-sm text-gray-600'>
              Average across all metrics
            </span>
          </div>
        </div>

        {/* Statistical Advantage Summary */}
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

        {/* Stats List */}
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
      {/* Current Score */}
      <div className='bg-white rounded-lg shadow p-6'>
        <h3 className='text-base font-semibold mb-4'>Current Score</h3>
        <div className='flex justify-around items-center'>
          <div className='text-center'>
            <div className='text-6xl font-bold text-blue-500'>{homeGoals}</div>
            <div className='text-sm text-gray-600 mt-2'>Home</div>
          </div>
          <div className='text-2xl text-gray-400'>-</div>
          <div className='text-center'>
            <div className='text-6xl font-bold text-red-500'>{awayGoals}</div>
            <div className='text-sm text-gray-600 mt-2'>Away</div>
          </div>
        </div>
      </div>

      {/* Prediction Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {renderTeamStats('home')}
        {renderTeamStats('away')}
      </div>

      {/* Scoring Factors */}
      <div className='bg-white rounded-lg shadow p-6'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>
          Scoring Factors
        </h3>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
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

PredictionTab.propTypes = {
  details: PropTypes.shape({
    values: PropTypes.objectOf(
      PropTypes.shape({
        name: PropTypes.string,
        value: PropTypes.shape({
          home: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          away: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        }),
      })
    ),
    types: PropTypes.objectOf(PropTypes.string),
  }),
  h2h: PropTypes.shape({
    home: PropTypes.number,
    away: PropTypes.number,
  }),
  form: PropTypes.shape({
    home: PropTypes.number,
    away: PropTypes.number,
  }),
  homeGoals: PropTypes.number,
  awayGoals: PropTypes.number,
};

export default PredictionTab;