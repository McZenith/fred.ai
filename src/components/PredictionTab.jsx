import React, { useMemo, useState, useEffect } from 'react';

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
      let homeScore = 52;
      let awayScore = 48;

      // Log details to verify structure
      console.log('Details:', details);
      console.log('H2H:', h2h);

      // Helper function to safely get stat values
      const getValue = (statName, team) => {
        return details?.values?.[team]?.[statName]?.value
          ? parseInt(details.values[team][statName].value)
          : 0;
      };

      // Current Match Stats
      const homeFouls = getValue('fouls', 'home');
      const awayFouls = getValue('fouls', 'away');
      const homePoss = getValue('possession', 'home');
      const awayPoss = getValue('possession', 'away');
      const homeAttackSuccess = getValue('attackSuccess', 'home');
      const awayAttackSuccess = getValue('attackSuccess', 'away');
      const homeShotAccuracy = getValue('shotAccuracy', 'home');
      const awayShotAccuracy = getValue('shotAccuracy', 'away');
      const homeCorners = getValue('corners', 'home');
      const awayCorners = getValue('corners', 'away');

      // Current Score Parsing
      const [homeGoals, awayGoals] = (
        currentScore?.split(':') || ['0', '0']
      ).map(Number);

      // Incorporate H2H Data
      if (h2h?.matches) {
        const homeTeamName = details?.home?.team?.name;
        const awayTeamName = details?.away?.team?.name;

        if (homeTeamName && awayTeamName) {
          const homeWins = h2h.matches.filter(
            (match) =>
              match.teams.home.name === homeTeamName &&
              match.result.winner === 'home'
          ).length;

          const awayWins = h2h.matches.filter(
            (match) =>
              match.teams.away.name === awayTeamName &&
              match.result.winner === 'away'
          ).length;

          // Adjust scores based on head-to-head results
          homeScore += homeWins * 2; // Add points for home wins
          awayScore += awayWins * 2; // Add points for away wins
        }
      }

      // Negative Adjustments
      homeScore -= homeFouls * 2; // Deduct points for home team fouls
      awayScore -= awayFouls * 2; // Deduct points for away team fouls

      if (homeAttackSuccess < 20) homeScore -= 10; // Deduct points for poor home attack success
      if (awayAttackSuccess < 20) awayScore -= 10; // Deduct points for poor away attack success

      // Current Score Impact
      const goalDiff = homeGoals - awayGoals;
      if (goalDiff > 0) {
        homeScore += Math.max(15 - (goalDiff - 1) * 5, 5); // Add points for leading home team
      } else if (goalDiff < 0) {
        awayScore += Math.max(15 - (Math.abs(goalDiff) - 1) * 5, 5); // Add points for leading away team
      }

      // Positive Adjustments
      if (form?.length > 0) {
        const lastForm = form[0]?.form;
        if (lastForm) {
          const recentForm = lastForm.total['3'] || 0;
          const formImpact = recentForm * 10; // Scale form impact
          homeScore += formImpact; // Add points for home team form
          awayScore += 1 - formImpact; // Adjust away team form
        }
      }

      if (homePoss > 0 || awayPoss > 0) {
        const totalPoss = homePoss + awayPoss;
        homeScore += (homePoss / totalPoss) * 15; // Add points for home possession
        awayScore += (awayPoss / totalPoss) * 15; // Add points for away possession
      }

      homeScore += (homeAttackSuccess / 100) * 20; // Add points for home attack success
      awayScore += (awayAttackSuccess / 100) * 20; // Add points for away attack success

      homeScore += (homeShotAccuracy / 100) * 20; // Add points for home shot accuracy
      awayScore += (awayShotAccuracy / 100) * 20; // Add points for away shot accuracy

      const totalCorners = homeCorners + awayCorners;
      if (totalCorners > 0) {
        homeScore += (homeCorners / totalCorners) * 10; // Add points for home corners
        awayScore += (awayCorners / totalCorners) * 10; // Add points for away corners
      }

      // Ensure minimum score is 10
      homeScore = Math.max(10, homeScore);
      awayScore = Math.max(10, awayScore);

      // Calculate final probabilities
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
              {predictions.stats?.home?.goals || 0}
            </div>
            <div className='text-sm text-gray-600 mt-2'>Home</div>
          </div>
          <div className='text-2xl text-gray-400'>-</div>
          <div className='text-center'>
            <div className='text-6xl font-bold text-gray-400'>
              {predictions.stats?.away?.goals || 0}
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
    </div>
  );
};

export default PredictionTab;
