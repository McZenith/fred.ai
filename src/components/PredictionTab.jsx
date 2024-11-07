import React, { useMemo } from 'react';
import { TrendingUp, Activity, Target, ShieldCheck } from 'lucide-react';

const GoalPredictionTab = ({ details, h2h, form }) => {
  const predictions = useMemo(() => {
    // Initialize base scores
    let homeScore = 50;
    let awayScore = 50;

    // Factor 1: Recent Form (30% weight)
    if (form?.home?.matches && form?.away?.matches) {
      const homeForm = form.home.matches.slice(0, 5);
      const awayForm = form.away.matches.slice(0, 5);

      const homeGoals = homeForm.reduce(
        (sum, match) => sum + match.result.home,
        0
      );
      const awayGoals = awayForm.reduce(
        (sum, match) => sum + match.result.away,
        0
      );

      const homeFormScore = (homeGoals / homeForm.length) * 15;
      const awayFormScore = (awayGoals / awayForm.length) * 15;

      homeScore += homeFormScore;
      awayScore += awayFormScore;
    }

    // Factor 2: Head to Head History (20% weight)
    if (h2h?.matches) {
      const recentH2H = h2h.matches.slice(0, 3);
      const h2hHomeGoals = recentH2H.reduce(
        (sum, match) => sum + match.result.home,
        0
      );
      const h2hAwayGoals = recentH2H.reduce(
        (sum, match) => sum + match.result.away,
        0
      );

      const h2hHomeScore = (h2hHomeGoals / recentH2H.length) * 10;
      const h2hAwayScore = (h2hAwayGoals / recentH2H.length) * 10;

      homeScore += h2hHomeScore;
      awayScore += h2hAwayScore;
    }

    // Factor 3: Current Match Stats (50% weight)
    if (details?.values) {
      const stats = details.values;

      // Shots on target
      if (stats.shotsOnTarget) {
        const homeShots = parseInt(stats.shotsOnTarget.value.home) || 0;
        const awayShots = parseInt(stats.shotsOnTarget.value.away) || 0;
        homeScore += (homeShots / (homeShots + awayShots || 1)) * 15;
        awayScore += (awayShots / (homeShots + awayShots || 1)) * 15;
      }

      // Possession
      if (stats.possession) {
        const homePoss = parseInt(stats.possession.value.home) || 0;
        const awayPoss = parseInt(stats.possession.value.away) || 0;
        homeScore += (homePoss / (homePoss + awayPoss || 100)) * 10;
        awayScore += (awayPoss / (homePoss + awayPoss || 100)) * 10;
      }

      // Dangerous attacks
      if (stats.dangerousAttacks) {
        const homeDanger = parseInt(stats.dangerousAttacks.value.home) || 0;
        const awayDanger = parseInt(stats.dangerousAttacks.value.away) || 0;
        homeScore += (homeDanger / (homeDanger + awayDanger || 1)) * 15;
        awayScore += (awayDanger / (homeDanger + awayDanger || 1)) * 15;
      }
    }

    // Normalize scores to add up to 100
    const total = homeScore + awayScore;
    return {
      home: Math.round((homeScore / total) * 100),
      away: Math.round((awayScore / total) * 100),
    };
  }, [details, h2h, form]);

  const getPredictionStrength = (score) => {
    if (score >= 70) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 45) return 'Moderate';
    return 'Low';
  };

  const getIndicatorColor = (score) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 45) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <div className='space-y-6'>
      {/* Main Prediction Display */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 relative overflow-hidden'>
          <div className='relative z-10'>
            <h3 className='text-lg font-semibold text-blue-900 mb-2'>
              Home Team
            </h3>
            <div className='text-4xl font-bold text-blue-700 mb-2'>
              {predictions.home}%
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`w-3 h-3 rounded-full ${getIndicatorColor(
                  predictions.home
                )}`}
              />
              <span className='text-sm font-medium text-blue-800'>
                {getPredictionStrength(predictions.home)} Probability
              </span>
            </div>
          </div>
          <div
            className='absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-1000'
            style={{ width: `${predictions.home}%` }}
          />
        </div>

        <div className='bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 relative overflow-hidden'>
          <div className='relative z-10'>
            <h3 className='text-lg font-semibold text-red-900 mb-2'>
              Away Team
            </h3>
            <div className='text-4xl font-bold text-red-700 mb-2'>
              {predictions.away}%
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`w-3 h-3 rounded-full ${getIndicatorColor(
                  predictions.away
                )}`}
              />
              <span className='text-sm font-medium text-red-800'>
                {getPredictionStrength(predictions.away)} Probability
              </span>
            </div>
          </div>
          <div
            className='absolute bottom-0 left-0 h-1 bg-red-500 transition-all duration-1000'
            style={{ width: `${predictions.away}%` }}
          />
        </div>
      </div>

      {/* Contributing Factors */}
      <div className='bg-white rounded-xl border p-6'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>
          Contributing Factors
        </h3>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div className='p-4 bg-gray-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <Target className='text-blue-500' size={20} />
              <span className='font-medium text-gray-700'>Shot Accuracy</span>
            </div>
            <div className='text-sm text-gray-600'>
              Based on shots on target ratio
            </div>
          </div>

          <div className='p-4 bg-gray-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <Activity className='text-blue-500' size={20} />
              <span className='font-medium text-gray-700'>Recent Form</span>
            </div>
            <div className='text-sm text-gray-600'>
              Analysis of last 5 matches
            </div>
          </div>

          <div className='p-4 bg-gray-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <TrendingUp className='text-blue-500' size={20} />
              <span className='font-medium text-gray-700'>Match Control</span>
            </div>
            <div className='text-sm text-gray-600'>
              Based on possession and attacks
            </div>
          </div>

          <div className='p-4 bg-gray-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <ShieldCheck className='text-blue-500' size={20} />
              <span className='font-medium text-gray-700'>H2H History</span>
            </div>
            <div className='text-sm text-gray-600'>
              Based on previous meetings
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalPredictionTab;
