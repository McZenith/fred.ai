import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp,
  Activity,
  Goal,
  Ticket,
  TimerIcon,
  ChartBar,
} from 'lucide-react';

const PredictionTab = ({ details, h2h, form, homeGoals, awayGoals }) => {
  const [predictions, setPredictions] = useState({
    home: 50,
    away: 50,
    stats: {
      home: {},
      away: {},
    },
  });

  const calculatePredictions = useMemo(() => {
    try {
      // Initialize base scores with home advantage
      let homeScore = 52;
      let awayScore = 50;
      const stats = details?.values || {};

      // Helper function to safely get stat values
      const getValue = (statName, team) => {
        const value = parseInt(stats?.[statName]?.value?.[team]);
        return isNaN(value) ? null : value;
      };

      // Initialize stats containers
      const homeStats = {};
      const awayStats = {};

      // Ball possession
      const homePoss = getValue('ballsafepercentage', 'home');
      const awayPoss = getValue('ballsafepercentage', 'away');
      if (homePoss !== null && awayPoss !== null) {
        homeStats.possession = homePoss;
        awayStats.possession = awayPoss;
        const totalPoss = homePoss + awayPoss;
        homeScore += (homePoss / totalPoss) * 20;
        awayScore += (awayPoss / totalPoss) * 20;
      }

      // Attacks
      const homeAttacks = getValue('attackpercentage', 'home');
      const awayAttacks = getValue('attackpercentage', 'away');
      if (homeAttacks !== null && awayAttacks !== null) {
        homeStats.attacks = homeAttacks;
        awayStats.attacks = awayAttacks;
        const totalAttacks = homeAttacks + awayAttacks;
        homeScore += (homeAttacks / totalAttacks) * 25;
        awayScore += (awayAttacks / totalAttacks) * 25;
      }

      // Dangerous Attacks
      const homeDangerous = getValue('dangerousattackpercentage', 'home');
      const awayDangerous = getValue('dangerousattackpercentage', 'away');
      if (homeDangerous !== null && awayDangerous !== null) {
        homeStats.dangerousAttacks = homeDangerous;
        awayStats.dangerousAttacks = awayDangerous;
        const totalDangerous = homeDangerous + awayDangerous;
        homeScore += (homeDangerous / totalDangerous) * 30;
        awayScore += (awayDangerous / totalDangerous) * 30;
      }

      // Attack Efficiency
      if (homeAttacks && homeDangerous) {
        homeStats.attackEfficiency = Number(
          ((homeDangerous / homeAttacks) * 100).toFixed(1)
        );
      }
      if (awayAttacks && awayDangerous) {
        awayStats.attackEfficiency = Number(
          ((awayDangerous / awayAttacks) * 100).toFixed(1)
        );
      }

      // Corners
      const homeCorners = getValue('corners', 'home');
      const awayCorners = getValue('corners', 'away');
      if (homeCorners !== null && awayCorners !== null) {
        homeStats.corners = homeCorners;
        awayStats.corners = awayCorners;
        const totalCorners = homeCorners + awayCorners;
        if (totalCorners > 0) {
          homeScore += (homeCorners / totalCorners) * 15;
          awayScore += (awayCorners / totalCorners) * 15;
        }
      }

      // Free kicks
      const homeFK = getValue('freekicks', 'home');
      const awayFK = getValue('freekicks', 'away');
      if (homeFK !== null && awayFK !== null) {
        homeStats.freeKicks = homeFK;
        awayStats.freeKicks = awayFK;
      }

      // Fouls
      const homeFouls = getValue('fouls', 'home');
      const awayFouls = getValue('fouls', 'away');
      if (homeFouls !== null && awayFouls !== null) {
        homeStats.fouls = homeFouls;
        awayStats.fouls = awayFouls;
        homeScore -= homeFouls * 3;
        awayScore -= awayFouls * 3;
      }

      // Goal attempts
      const homeAttempts = getValue('goalattempts', 'home');
      const awayAttempts = getValue('goalattempts', 'away');
      if (homeAttempts !== null && awayAttempts !== null) {
        homeStats.goalAttempts = homeAttempts;
        awayStats.goalAttempts = awayAttempts;
        const totalAttempts = homeAttempts + awayAttempts;
        if (totalAttempts > 0) {
          homeScore += (homeAttempts / totalAttempts) * 20;
          awayScore += (awayAttempts / totalAttempts) * 20;
        }
      }

      homeStats.goals = homeGoals;
      awayStats.goals = awayGoals;

      const goalDiff = homeGoals - awayGoals;
      if (goalDiff > 0) {
        homeScore += goalDiff * 10;
        awayScore -= goalDiff * 5;
        homeStats.momentum = 'high';
        awayStats.momentum = 'low';
      } else if (goalDiff < 0) {
        awayScore += Math.abs(goalDiff) * 10;
        homeScore -= Math.abs(goalDiff) * 5;
        homeStats.momentum = 'low';
        awayStats.momentum = 'high';
      } else {
        homeStats.momentum = 'neutral';
        awayStats.momentum = 'neutral';
      }

      // Recent Form Impact
      if (form?.home?.team) {
        const homeForm = form.home.matches?.[0]?.form?.total?.['3'] || 0;
        const awayForm = form.away.matches?.[0]?.form?.total?.['3'] || 0;

        homeStats.recentForm = Number((homeForm * 100).toFixed(1));
        awayStats.recentForm = Number((awayForm * 100).toFixed(1));

        homeScore += homeForm * 10;
        awayScore += awayForm * 10;
      }

      // Head to head
      if (h2h?.matches) {
        const recentMatches = h2h.matches.slice(0, 5);
        let homeWins = 0;
        let awayWins = 0;
        let draws = 0;

        recentMatches.forEach((match) => {
          const isHomeTeam = match.teams.home._id === h2h.teams.home._id;
          if (match.result.winner === 'home') {
            isHomeTeam ? homeWins++ : awayWins++;
          } else if (match.result.winner === 'away') {
            isHomeTeam ? awayWins++ : homeWins++;
          } else {
            draws++;
          }
        });

        homeStats.h2hWins = homeWins;
        awayStats.h2hWins = awayWins;
        homeStats.h2hDraws = draws;
        awayStats.h2hDraws = draws;

        homeScore += homeWins * 5;
        awayScore += awayWins * 5;
      }

      // Ensure scores are within bounds
      homeScore = Math.max(10, Math.min(100, homeScore));
      awayScore = Math.max(10, Math.min(100, awayScore));

      // Calculate final probabilities
      const total = homeScore + awayScore;
      const homeProbability = Math.round((homeScore / total) * 100);
      const awayProbability = 100 - homeProbability;

      return {
        home: homeProbability,
        away: awayProbability,
        stats: {
          home: homeStats,
          away: awayStats,
        },
      };
    } catch (error) {
      console.error('Error calculating predictions:', error);
      return {
        home: 50,
        away: 50,
        stats: {
          home: {},
          away: {},
        },
      };
    }
  }, [details, h2h, form, homeGoals, awayGoals]);

  useEffect(() => {
    setPredictions(calculatePredictions);
  }, [calculatePredictions]);

  // Helper function to render stat if available
  const renderStat = (label, homeValue, awayValue, suffix = '') => {
    if (homeValue === undefined || awayValue === undefined) return null;
    return (
      <div className='flex justify-between'>
        <span className='text-gray-600'>{label}:</span>
        <span>{`${homeValue}${suffix}`}</span>
      </div>
    );
  };

  const getMomentumColor = (momentum) => {
    switch (momentum) {
      case 'high':
        return 'text-green-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

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
            <div className='text-6xl font-bold text-red-500'>
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
            {renderStat(
              'Possession',
              predictions.stats.home.possession,
              predictions.stats.away.possession,
              '%'
            )}
            {renderStat(
              'Attacks',
              predictions.stats.home.attacks,
              predictions.stats.away.attacks,
              '%'
            )}
            {renderStat(
              'Dangerous Attacks',
              predictions.stats.home.dangerousAttacks,
              predictions.stats.away.dangerousAttacks,
              '%'
            )}
            {renderStat(
              'Attack Efficiency',
              predictions.stats.home.attackEfficiency,
              predictions.stats.away.attackEfficiency,
              '%'
            )}
            {renderStat(
              'Corners',
              predictions.stats.home.corners,
              predictions.stats.away.corners
            )}
            {renderStat(
              'Goal Attempts',
              predictions.stats.home.goalAttempts,
              predictions.stats.away.goalAttempts
            )}
            {predictions.stats.home.momentum && (
              <div className='flex justify-between'>
                <span className='text-gray-600'>Momentum:</span>
                <span
                  className={getMomentumColor(predictions.stats.home.momentum)}
                >
                  {predictions.stats.home.momentum.toUpperCase()}
                </span>
              </div>
            )}
            {renderStat(
              'Recent Form',
              predictions.stats.home.recentForm,
              predictions.stats.away.recentForm,
              '%'
            )}
            {renderStat(
              'H2H Wins',
              predictions.stats.home.h2hWins,
              predictions.stats.away.h2hWins
            )}
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
            {renderStat(
              'Possession',
              predictions.stats.away.possession,
              predictions.stats.home.possession,
              '%'
            )}
            {renderStat(
              'Attacks',
              predictions.stats.away.attacks,
              predictions.stats.home.attacks,
              '%'
            )}
            {renderStat(
              'Dangerous Attacks',
              predictions.stats.away.dangerousAttacks,
              predictions.stats.home.dangerousAttacks,
              '%'
            )}
            {renderStat(
              'Attack Efficiency',
              predictions.stats.away.attackEfficiency,
              predictions.stats.home.attackEfficiency,
              '%'
            )}
            {renderStat(
              'Corners',
              predictions.stats.away.corners,
              predictions.stats.home.corners
            )}
            {renderStat(
              'Goal Attempts',
              predictions.stats.away.goalAttempts,
              predictions.stats.home.goalAttempts
            )}
            {predictions.stats.away.momentum && (
              <div className='flex justify-between'>
                <span className='text-gray-600'>Momentum:</span>
                <span
                  className={getMomentumColor(predictions.stats.away.momentum)}
                >
                  {predictions.stats.away.momentum.toUpperCase()}
                </span>
              </div>
            )}
            {renderStat(
              'Recent Form',
              predictions.stats.away.recentForm,
              predictions.stats.home.recentForm,
              '%'
            )}
            {renderStat(
              'H2H Wins',
              predictions.stats.away.h2hWins,
              predictions.stats.home.h2hWins
            )}
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
              <div>Home Advantage: +2 base</div>
              <div>Possession: +20 max</div>
              <div>Attack Success: +25 max</div>
              <div>Dangerous Attacks: +30 max</div>
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
              <div>Goal Ahead: +10 points</div>
              <div>Goal Behind: -5 points</div>
              <div>Recent Form: +10 max</div>
              <div>H2H Wins: +5 each</div>
              <div>Goal Attempts: +20 max</div>
            </div>
          </div>

          <div className='p-4 bg-rose-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <Activity className='text-rose-600' size={20} />
              <span className='font-medium text-gray-700'>Match Factors</span>
            </div>
            <div className='text-sm text-gray-600 space-y-1'>
              <div>Each Foul: -3 points</div>
              <div>Corners: +15 max</div>
              <div>Min Score: 10 points</div>
              <div>Max Score: 100 points</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Statistics (Only shown if data is available) */}
      {(predictions.stats.home.recentForm ||
        predictions.stats.home.h2hWins) && (
        <div className='bg-white rounded-lg border shadow-sm p-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>
            Advanced Analysis
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {predictions.stats.home.recentForm && (
              <div className='p-4 bg-gray-50 rounded-lg'>
                <h4 className='font-medium text-gray-700 mb-3'>
                  Form Analysis
                </h4>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span>Home Team Form:</span>
                    <span
                      className={`font-medium ${
                        predictions.stats.home.recentForm >= 50
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {predictions.stats.home.recentForm}%
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Away Team Form:</span>
                    <span
                      className={`font-medium ${
                        predictions.stats.away.recentForm >= 50
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {predictions.stats.away.recentForm}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {predictions.stats.home.h2hWins && (
              <div className='p-4 bg-gray-50 rounded-lg'>
                <h4 className='font-medium text-gray-700 mb-3'>Head to Head</h4>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span>Home Team Wins:</span>
                    <span className='font-medium'>
                      {predictions.stats.home.h2hWins}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Away Team Wins:</span>
                    <span className='font-medium'>
                      {predictions.stats.away.h2hWins}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Draws:</span>
                    <span className='font-medium'>
                      {predictions.stats.home.h2hDraws}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attack Efficiency Analysis (Only shown if both teams have attack data) */}
      {predictions.stats.home.attackEfficiency &&
        predictions.stats.away.attackEfficiency && (
          <div className='bg-white rounded-lg border shadow-sm p-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Attack Efficiency Analysis
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='p-4 bg-blue-50 rounded-lg'>
                <h4 className='font-medium text-gray-700 mb-3'>Home Team</h4>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span>Total Attacks:</span>
                    <span>{predictions.stats.home.attacks}%</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Dangerous Attacks:</span>
                    <span>{predictions.stats.home.dangerousAttacks}%</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Efficiency Rate:</span>
                    <span
                      className={`font-medium ${
                        predictions.stats.home.attackEfficiency >= 50
                          ? 'text-green-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {predictions.stats.home.attackEfficiency}%
                    </span>
                  </div>
                </div>
              </div>

              <div className='p-4 bg-red-50 rounded-lg'>
                <h4 className='font-medium text-gray-700 mb-3'>Away Team</h4>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span>Total Attacks:</span>
                    <span>{predictions.stats.away.attacks}%</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Dangerous Attacks:</span>
                    <span>{predictions.stats.away.dangerousAttacks}%</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Efficiency Rate:</span>
                    <span
                      className={`font-medium ${
                        predictions.stats.away.attackEfficiency >= 50
                          ? 'text-green-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {predictions.stats.away.attackEfficiency}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default PredictionTab;          