import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Activity, Goal } from 'lucide-react';

const PredictionTab = ({ details, h2h, form, currentScore }) => {
  const [predictions, setPredictions] = useState({
    home: 50,
    away: 50,
    stats: {
      home: {
        attackSuccess: 0,
        shotAccuracy: 0,
        corners: 0,
        fouls: 0,
        goals: 0,
        possession: 0,
      },
      away: {
        attackSuccess: 0,
        shotAccuracy: 0,
        corners: 0,
        fouls: 0,
        goals: 0,
        possession: 0,
      },
    },
  });

  const calculatePredictions = useMemo(() => {
    try {
      // Initialize base scores
      let homeScore = 50;
      let awayScore = 50;

      const stats = details?.values || {};

      // Helper function to safely get stat values
      const getValue = (statName, team) => {
        const value = parseInt(stats?.[statName]?.value?.[team]);
        return isNaN(value) ? 0 : value;
      };

      // Get all stats
      const homePoss = getValue('possession', 'home');
      const awayPoss = getValue('possession', 'away');
      const homeAttacks = getValue('attacks', 'home');
      const awayAttacks = getValue('attacks', 'away');
      const homeDangerous = getValue('dangerousAttacks', 'home');
      const awayDangerous = getValue('dangerousAttacks', 'away');
      const homeShotsOn = getValue('shotsOnTarget', 'home');
      const awayShotsOn = getValue('shotsOnTarget', 'away');
      const homeShotsOff = getValue('shotsOffTarget', 'home');
      const awayShotsOff = getValue('shotsOffTarget', 'away');
      const homeCorners = getValue('corners', 'home');
      const awayCorners = getValue('corners', 'away');
      const homeFouls = getValue('fouls', 'home');
      const awayFouls = getValue('fouls', 'away');

      // Calculate attack metrics
      const homeTotalShots = homeShotsOn + homeShotsOff;
      const awayTotalShots = awayShotsOn + awayShotsOff;
      const homeShotAccuracy =
        homeTotalShots > 0 ? (homeShotsOn / homeTotalShots) * 100 : 0;
      const awayShotAccuracy =
        awayTotalShots > 0 ? (awayShotsOn / awayTotalShots) * 100 : 0;

      // Calculate attack success rates
      const homeAttackSuccess =
        homeAttacks > 0 ? (homeDangerous / homeAttacks) * 100 : 0;
      const awayAttackSuccess =
        awayAttacks > 0 ? (awayDangerous / awayAttacks) * 100 : 0;

      // Parse current score directly
      const [homeGoals, awayGoals] = (currentScore || '0:0')
        .split(':')
        .map(Number);

      // Positive Score Adjustments
      // 1. Possession Impact (max 15 points)
      homeScore += (homePoss / 100) * 15;
      awayScore += (awayPoss / 100) * 15;

      // 2. Attack Impact (max 20 points)
      homeScore += (homeAttackSuccess / 100) * 20;
      awayScore += (awayAttackSuccess / 100) * 20;

      // 3. Dangerous Attacks (max 25 points)
      if (homeDangerous > 0 || awayDangerous > 0) {
        const totalDangerous = homeDangerous + awayDangerous;
        homeScore += (homeDangerous / totalDangerous) * 25;
        awayScore += (awayDangerous / totalDangerous) * 25;
      }

      // 4. Shot Accuracy (max 20 points)
      homeScore += (homeShotAccuracy / 100) * 20;
      awayScore += (awayShotAccuracy / 100) * 20;

      // 5. Set Pieces Impact (max 10 points)
      homeScore += homeCorners * 2;
      awayScore += awayCorners * 2;

      // Current score impact (15 points)
      if (homeGoals > awayGoals) {
        homeScore += 15;
      } else if (awayGoals > homeGoals) {
        awayScore += 15;
      }

      // Negative Adjustments
      // 1. Fouls (-2 points each)
      homeScore -= homeFouls * 2;
      awayScore -= awayFouls * 2;

      // 2. Poor Attack Success Penalty (max -10 points)
      if (homeAttackSuccess < 20) homeScore -= 10;
      if (awayAttackSuccess < 20) awayScore -= 10;

      // Ensure minimum score is 10
      homeScore = Math.max(10, homeScore);
      awayScore = Math.max(10, awayScore);

      // Calculate probabilities
      const total = homeScore + awayScore;
      const homeProbability = Math.round((homeScore / total) * 100);
      const awayProbability = 100 - homeProbability;

      return {
        home: homeProbability,
        away: awayProbability,
        stats: {
          home: {
            attackSuccess: Number(homeAttackSuccess.toFixed(1)),
            shotAccuracy: Number(homeShotAccuracy.toFixed(1)),
            corners: homeCorners,
            fouls: homeFouls,
            goals: homeGoals,
            possession: homePoss,
          },
          away: {
            attackSuccess: Number(awayAttackSuccess.toFixed(1)),
            shotAccuracy: Number(awayShotAccuracy.toFixed(1)),
            corners: awayCorners,
            fouls: awayFouls,
            goals: awayGoals,
            possession: awayPoss,
          },
        },
      };
    } catch (error) {
      console.error('Error calculating predictions:', error);
      return {
        home: 50,
        away: 50,
        stats: {
          home: {
            attackSuccess: 0,
            shotAccuracy: 0,
            corners: 0,
            fouls: 0,
            goals: 0,
            possession: 0,
          },
          away: {
            attackSuccess: 0,
            shotAccuracy: 0,
            corners: 0,
            fouls: 0,
            goals: 0,
            possession: 0,
          },
        },
      };
    }
  }, [details, h2h, form, currentScore]);

  // Update predictions state whenever calculations change
  useEffect(() => {
    setPredictions(calculatePredictions);
    console.log('Updated Predictions:', calculatePredictions);
  }, [calculatePredictions]);

  return (
    <div className='space-y-6'>
      {/* Current Score */}
      <div className='bg-white rounded-lg shadow p-6'>
        <h3 className='text-base font-semibold mb-4'>Current Score</h3>
        <div className='flex justify-around items-center'>
          <div className='text-center'>
            <div className='text-6xl font-bold text-blue-500'>
              {predictions.stats.home.goals || 0}
            </div>
            <div className='text-sm text-gray-600 mt-2'>Home</div>
          </div>
          <div className='text-2xl text-gray-400'>-</div>
          <div className='text-center'>
            <div className='text-6xl font-bold text-gray-400'>
              {predictions.stats.away.goals || 0}
            </div>
            <div className='text-sm text-gray-600 mt-2'>Away</div>
          </div>
        </div>
      </div>

      {/* Prediction Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Home Team */}
        <div className='bg-blue-50 rounded-lg p-6'>
          <h3 className='text-base font-semibold text-gray-900 mb-2'>
            Home Team Next Goal
          </h3>
          <div className='text-4xl font-bold text-blue-600 mb-4'>
            {predictions.home}%
          </div>
          <div className='space-y-2'>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Attack Success:</span>
              <span>{predictions.stats.home.attackSuccess}%</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Shot Accuracy:</span>
              <span>{predictions.stats.home.shotAccuracy}%</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Corners:</span>
              <span>{predictions.stats.home.corners}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Possession:</span>
              <span>{predictions.stats.home.possession}%</span>
            </div>
          </div>
        </div>

        {/* Away Team */}
        <div className='bg-red-50 rounded-lg p-6'>
          <h3 className='text-base font-semibold text-gray-900 mb-2'>
            Away Team Next Goal
          </h3>
          <div className='text-4xl font-bold text-red-600 mb-4'>
            {predictions.away}%
          </div>
          <div className='space-y-2'>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Attack Success:</span>
              <span>{predictions.stats.away.attackSuccess}%</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Shot Accuracy:</span>
              <span>{predictions.stats.away.shotAccuracy}%</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Corners:</span>
              <span>{predictions.stats.away.corners}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Possession:</span>
              <span>{predictions.stats.away.possession}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Factors */}
      <div className='bg-white rounded-lg border shadow-sm p-6'>
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
              <div>Possession: +15 max</div>
              <div>Attack Success: +20 max</div>
              <div>Shot Accuracy: +20 max</div>
              <div>Each Corner: +2 points</div>
            </div>
          </div>

          <div className='p-4 bg-amber-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <TrendingUp className='text-amber-600' size={20} />
              <span className='font-medium text-gray-700'>Score Impact</span>
            </div>
            <div className='text-sm text-gray-600 space-y-1'>
              <div>Leading Team: +15 points</div>
              <div>Dangerous Attacks: +25 max</div>
              <div>High Possession: +15 max</div>
            </div>
          </div>

          <div className='p-4 bg-rose-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <Activity className='text-rose-600' size={20} />
              <span className='font-medium text-gray-700'>Penalties</span>
            </div>
            <div className='text-sm text-gray-600 space-y-1'>
              <div>Each Foul: -2 points</div>
              <div>Poor Attack Rate: -10 points</div>
              <div>Minimum Score: 10 points</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionTab;
