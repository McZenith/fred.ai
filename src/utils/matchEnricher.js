// utils/matchEnricher.js
import { API_ROUTES } from '@/utils/constants';

// Fetch helper with error handling and query parameter handling
const fetchEndpoint = async (route, params = {}) => {
  try {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const response = await fetch(`${route}?${queryString}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${route}:`, error);
    return null;
  }
};

// Fetch functions for different data types
const fetchMatchData = {
  info: (matchId) =>
    fetchEndpoint(API_ROUTES.MATCH_INFO, { matchId: String(matchId) }),
  timeline: (matchId) =>
    fetchEndpoint(API_ROUTES.MATCH_TIMELINE, { matchId: String(matchId) }),
  timelineDelta: (matchId) =>
    fetchEndpoint(API_ROUTES.MATCH_TIMELINE_DELTA, {
      matchId: String(matchId),
    }),
  situation: (matchId) =>
    fetchEndpoint(API_ROUTES.MATCH_SITUATION, { matchId: String(matchId) }),
  details: (matchId) =>
    fetchEndpoint(API_ROUTES.MATCH_DETAILS, { matchId: String(matchId) }),
  phrases: (matchId) =>
    fetchEndpoint(API_ROUTES.MATCH_PHRASES, { matchId: String(matchId) }),
  odds: (matchId) =>
    fetchEndpoint(API_ROUTES.MATCH_ODDS, { matchId: String(matchId) }),
  squads: (matchId) =>
    fetchEndpoint(API_ROUTES.MATCH_SQUADS, { matchId: String(matchId) }),
};

const fetchTeamData = {
  versus: (teamId1, teamId2) =>
    fetchEndpoint(API_ROUTES.TEAM_VERSUS, { teamId1, teamId2 }),
  form: (teamId) => fetchEndpoint(API_ROUTES.TEAM_FORM, { teamId }),
};

// Analysis functions
const analyzeMatchMomentum = (
  situation,
  timelineDelta,
  details,
  completeTimeline
) => {
  if (!situation?.data) return null;

  const lastMinutes = situation.data.slice(-5);
  const momentum = {
    recent: lastMinutes.reduce(
      (acc, minute) => ({
        home:
          acc.home + (minute.home.dangerouscount * 2 + minute.home.attackcount),
        away:
          acc.away + (minute.away.dangerouscount * 2 + minute.away.attackcount),
      }),
      { home: 0, away: 0 }
    ),
    delta: timelineDelta?.match?.result || null,
    trend: lastMinutes.map((minute) => ({
      minute: minute.time,
      homeIntensity: minute.home.dangerouscount + minute.home.attackcount,
      awayIntensity: minute.away.dangerouscount + minute.away.attackcount,
    })),
    timeline: completeTimeline || null,
  };

  // Add possession impact
  const possession = details?.values?.['110']?.value || { home: 50, away: 50 };
  momentum.possession = {
    home: parseInt(possession.home) || 50,
    away: parseInt(possession.away) || 50,
  };

  return momentum;
};

const calculateMatchStats = (details, completeTimeline) => {
  if (!details?.values) return null;

  return {
    attacks: {
      home: parseInt(details.values['1126']?.value?.home || 0),
      away: parseInt(details.values['1126']?.value?.away || 0),
    },
    dangerous: {
      home: parseInt(details.values['1029']?.value?.home || 0),
      away: parseInt(details.values['1029']?.value?.away || 0),
    },
    possession: {
      home: parseInt(details.values['110']?.value?.home || 0),
      away: parseInt(details.values['110']?.value?.away || 0),
    },
    shots: {
      onTarget: {
        home: parseInt(details.values['125']?.value?.home || 0),
        away: parseInt(details.values['125']?.value?.away || 0),
      },
      offTarget: {
        home: parseInt(details.values['126']?.value?.home || 0),
        away: parseInt(details.values['126']?.value?.away || 0),
      },
    },
    corners: {
      home: parseInt(details.values['124']?.value?.home || 0),
      away: parseInt(details.values['124']?.value?.away || 0),
    },
    cards: {
      yellow: {
        home: parseInt(details.values['40']?.value?.home || 0),
        away: parseInt(details.values['40']?.value?.away || 0),
      },
      red: {
        home: parseInt(details.values['50']?.value?.home || 0),
        away: parseInt(details.values['50']?.value?.away || 0),
      },
    },
    timeline: completeTimeline
      ? {
          events: completeTimeline.events || [],
          periods: completeTimeline.periods || [],
        }
      : null,
  };
};

const calculateGoalProbability = (momentum, stats) => {
  if (!momentum || !stats) return null;

  const calculateTeamProbability = (team) => {
    const momentumScore = momentum.recent[team] * 0.3;
    const attackScore = (stats.attacks[team] / 2) * 0.2;
    const dangerousScore = stats.dangerous[team] * 0.25;
    const possessionScore = (stats.possession[team] / 2) * 0.15;
    const shotsScore =
      ((stats.shots.onTarget[team] * 2 + stats.shots.offTarget[team]) / 3) *
      0.1;

    return (
      momentumScore +
      attackScore +
      dangerousScore +
      possessionScore +
      shotsScore
    );
  };

  return {
    home: calculateTeamProbability('home'),
    away: calculateTeamProbability('away'),
  };
};

const generateRecommendation = (stats, probability) => {
  if (!stats || !probability) return null;

  const homeStrength = probability.home;
  const awayStrength = probability.away;
  const threshold = 65; // Adjustable threshold

  let type = null;
  let confidence = 0;
  const reasons = [];

  if (homeStrength > threshold) {
    type = 'HOME_GOAL';
    confidence = Math.min(100, Math.round(homeStrength));
    reasons.push(
      'Strong home team momentum',
      stats.dangerous.home > stats.dangerous.away * 1.5
        ? 'Dominant attacking presence'
        : null,
      stats.possession.home > 60 ? 'Controlling possession' : null
    );
  } else if (awayStrength > threshold) {
    type = 'AWAY_GOAL';
    confidence = Math.min(100, Math.round(awayStrength));
    reasons.push(
      'Strong away team momentum',
      stats.dangerous.away > stats.dangerous.home * 1.5
        ? 'Dominant attacking presence'
        : null,
      stats.possession.away > 60 ? 'Controlling possession' : null
    );
  } else {
    type = 'NO_GOAL';
    confidence = Math.min(100, Math.round(homeStrength + awayStrength));
    reasons.push('No clear momentum');
  }

  return {
    type,
    confidence,
    reasons: reasons.filter(Boolean),
  };
};

// Export the enrichment functions
export const enrichMatch = {
  initial: async (match) => {
    try {
      const matchId = match.eventId.toString().split(':').pop();
      const tournamentId = match.sport?.category?.tournament?.id;
      const bracketsId = match.eventId;

      // Fetch all data in parallel
      const [
        matchInfo,
        squads,
        odds,
        homeForm,
        awayForm,
        headToHead,
        timeline,
        timelineDelta,
        seasonMeta,
        cupBrackets,
        seasonGoals,
        seasonCards,
        seasonTable,
        situation,
        details,
        phrases,
      ] = await Promise.all([
        fetchMatchData.info(matchId),
        fetchMatchData.squads(matchId),
        fetchMatchData.odds(matchId),
        fetchTeamData.form(match.homeTeamId),
        fetchTeamData.form(match.awayTeamId),
        fetchTeamData.versus(match.homeTeamId, match.awayTeamId),
        fetchMatchData.timeline(matchId),
        fetchMatchData.timelineDelta(matchId),
        fetchEndpoint(API_ROUTES.SEASON_META, { tournamentId }),
        fetchEndpoint(API_ROUTES.CUP_BRACKETS, { bracketsId }),
        fetchEndpoint(API_ROUTES.SEASON_GOALS, { tournamentId }),
        fetchEndpoint(API_ROUTES.SEASON_CARDS, { tournamentId }),
        fetchEndpoint(API_ROUTES.SEASON_TABLE, { tournamentId }),
        fetchMatchData.situation(matchId),
        fetchMatchData.details(matchId),
        fetchMatchData.phrases(matchId),
      ]);

      // Merge timeline data
      const mergedTimeline = {
        complete: timeline?.doc?.[0]?.data || timeline?.doc || null,
        delta: timelineDelta?.doc?.[0]?.data || timelineDelta?.data || null,
      };

      // Analyze match data
      const momentum = analyzeMatchMomentum(
        situation?.doc?.[0]?.data || situation?.data,
        timelineDelta?.doc?.[0]?.data || timelineDelta?.data,
        details?.doc?.[0]?.data || details?.data,
        mergedTimeline.complete
      );

      const stats = calculateMatchStats(
        details?.doc?.[0]?.data || details?.data,
        mergedTimeline.complete
      );

      const goalProbability = calculateGoalProbability(momentum, stats);
      const recommendation = generateRecommendation(stats, goalProbability);

      return {
        ...match,
        enrichedData: {
          matchInfo: matchInfo?.doc?.[0].data,
          squads: squads?.doc?.[0].data || squads?.doc || null,
          odds: odds?.doc?.[0].data || odds?.doc || null,
          timeline: mergedTimeline,
          form: {
            home: homeForm?.doc?.[0].data || null,
            away: awayForm?.doc?.[0].data || null,
          },
          h2h: headToHead?.doc?.[0].data || null,
          tournament: {
            cupBrackets: cupBrackets?.doc?.[0].data || null,
            seasonMeta: seasonMeta?.doc?.[0].data || null,
            goals: seasonGoals?.doc?.[0].data || null,
            cards: seasonCards?.doc?.[0].data || null,
            table: seasonTable?.doc?.[0].data || null,
          },
          situation: situation?.doc?.[0]?.data || situation?.doc || null,
          details: details?.doc?.[0]?.data || details?.doc || null,
          phrases: phrases?.doc?.[0]?.data || phrases?.doc || null,

          analysis: {
            momentum,
            stats,
            goalProbability,
            recommendation,
          },
        },
      };
    } catch (error) {
      console.error('Error in match enrichment:', error);
      return match;
    }
  },

  // Alias realtime to initial for consistent interface
  realtime: async (match) => enrichMatch.initial(match),
};


