// utils/matchEnricher.js
import { API_ROUTES } from '@/lib/api';

// Fetch helper with error handling
const fetchEndpoint = async (route, id) => {
  try {
    const response = await fetch(`${route}?matchId=${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${route}:`, error);
    return null;
  }
};

// Fetch initial match data (one-time fetch)
const fetchInitialMatchData = async (matchId) => {
  const seasonMeta = await fetchEndpoint(API_ROUTES.SEASON_META, matchId);
  let brackets = null;

  if (seasonMeta?.data?.cup?.id) {
    brackets = await fetchEndpoint(
      API_ROUTES.CUP_BRACKETS,
      seasonMeta.data.cup.id
    );
  }

  return { seasonMeta, brackets };
};

// Fetch real-time match data (frequent updates)
const fetchRealtimeMatchData = async (matchId) => {
  const [timelineDelta, matchInfo] = await Promise.all([
    fetchEndpoint(API_ROUTES.MATCH_TIMELINE_DELTA, matchId),
    fetchEndpoint(API_ROUTES.MATCH_INFO, matchId),
  ]);

  return { timelineDelta, matchInfo };
};

// Fetch match statistics (less frequent updates)
const fetchMatchStats = async (matchId) => {
  const [situation, details] = await Promise.all([
    fetchEndpoint(API_ROUTES.MATCH_SITUATION, matchId),
    fetchEndpoint(API_ROUTES.MATCH_DETAILS, matchId),
  ]);

  return { situation, details };
};

// Analysis functions
const analyzeMatchMomentum = (situation, timelineDelta) => {
  if (!situation?.data?.data) return null;

  const lastMinutes = situation.data.data.slice(-5);
  return {
    recent: lastMinutes.reduce(
      (acc, minute) => ({
        home: acc.home + (minute.home.dangerous * 2 + minute.home.attack),
        away: acc.away + (minute.away.dangerous * 2 + minute.away.attack),
      }),
      { home: 0, away: 0 }
    ),
    delta: timelineDelta?.data?.match?.result || null,
    trend: lastMinutes.map((minute) => ({
      minute: minute.time,
      homeIntensity: minute.home.dangerous + minute.home.attack,
      awayIntensity: minute.away.dangerous + minute.away.attack,
    })),
  };
};

const calculateMatchStats = (details, situation) => {
  if (!details?.data?.values) return null;

  const stats = details.data.values;
  return {
    attacks: {
      home: parseInt(stats['1126']?.value?.home || 0),
      away: parseInt(stats['1126']?.value?.away || 0),
    },
    dangerous: {
      home: parseInt(stats['1029']?.value?.home || 0),
      away: parseInt(stats['1029']?.value?.away || 0),
    },
    possession: {
      home: parseInt(stats.ballsafepercentage?.value?.home || 0),
      away: parseInt(stats.ballsafepercentage?.value?.away || 0),
    },
    corners: {
      home: parseInt(stats['124']?.value?.home || 0),
      away: parseInt(stats['124']?.value?.away || 0),
    },
  };
};

const calculateGoalProbability = (momentum, stats) => {
  if (!momentum || !stats) return null;

  const weights = {
    recentMomentum: 0.3,
    attacks: 0.2,
    dangerous: 0.3,
    possession: 0.2,
  };

  const homeScore =
    (momentum.recent.home / (momentum.recent.home + momentum.recent.away)) *
      weights.recentMomentum +
    (stats.attacks.home / (stats.attacks.home + stats.attacks.away)) *
      weights.attacks +
    (stats.dangerous.home / (stats.dangerous.home + stats.dangerous.away)) *
      weights.dangerous +
    (stats.possession.home / 100) * weights.possession;

  const awayScore =
    (momentum.recent.away / (momentum.recent.home + momentum.recent.away)) *
      weights.recentMomentum +
    (stats.attacks.away / (stats.attacks.home + stats.attacks.away)) *
      weights.attacks +
    (stats.dangerous.away / (stats.dangerous.home + stats.dangerous.away)) *
      weights.dangerous +
    (stats.possession.away / 100) * weights.possession;

  return { home: homeScore, away: awayScore };
};

const generateRecommendation = (stats, goalProbability) => {
  const recommendation = {
    type:
      goalProbability?.home > goalProbability?.away ? 'HOME_GOAL' : 'AWAY_GOAL',
    confidence: Math.max(
      goalProbability?.home || 0,
      goalProbability?.away || 0
    ),
    reasons: [],
  };

  if (stats) {
    if (stats.dangerous.home > stats.dangerous.away * 1.5) {
      recommendation.reasons.push('Home team creating more dangerous attacks');
    }
    if (stats.dangerous.away > stats.dangerous.home * 1.5) {
      recommendation.reasons.push('Away team creating more dangerous attacks');
    }
    if (stats.possession.home > 60) {
      recommendation.reasons.push('Home team dominating possession');
    }
    if (stats.possession.away > 60) {
      recommendation.reasons.push('Away team dominating possession');
    }
  }

  return recommendation;
};

// Export the enrichment functions
export const enrichMatch = {
  initial: async (match) => {
    try {
      const matchId = match.eventId.toString().split(':').pop();
      const initialData = await fetchInitialMatchData(matchId);

      return {
        ...match,
        enrichedData: {
          season: initialData.seasonMeta?.doc,
          tournament: initialData.brackets?.doc,
          analysis: {},
        },
      };
    } catch (error) {
      console.error('Error in initial match enrichment:', error);
      return match;
    }
  },

  realtime: async (match) => {
    try {
      const matchId = match.eventId.toString().split(':').pop();
      const realtimeData = await fetchRealtimeMatchData(matchId);
      const statsData = await fetchMatchStats(matchId);

      const momentum = analyzeMatchMomentum(
        statsData.situation,
        realtimeData.timelineDelta
      );
      const stats = calculateMatchStats(statsData.details, statsData.situation);
      const goalProbability = calculateGoalProbability(momentum, stats);
      const recommendation = generateRecommendation(stats, goalProbability);

      const newMatch = {
        ...match,
        enrichedData: {
          ...match.enrichedData,
          matchInfo: realtimeData.matchInfo?.doc[0]?.data,
          timelineDelta: realtimeData.timelineDelta?.doc[0]?.data,
          situation: statsData.situation?.doc[0]?.data,
          details: statsData.details?.doc[0]?.data,
          analysis: {
            momentum,
            stats,
            goalProbability,
            recommendation,
          },
        },
      };
      return newMatch;
    } catch (error) {
      console.error('Error in realtime match enrichment:', error);
      return match;
    }
  },
};
