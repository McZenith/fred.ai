import { API_ROUTES } from './constants';
// utils/matchEnricher.js
const API_TIMEOUT = 3000; // 3 seconds timeout for API calls

// Enhanced fetch helper with timeout and retry logic
const fetchEndpoint = async (route, params = {}, retries = 2) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const response = await fetch(`${route}?${queryString}`, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn(`Request timeout for ${route}`);
    }

    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchEndpoint(route, params, retries - 1);
    }

    return null;
  }
};

// Optimized parallel data fetching
const fetchMatchDataParallel = async (matchId, dataTypes) => {
  const requests = dataTypes.map((type) => {
    const fetchFn = fetchMatchData[type];
    return fetchFn?.(matchId).catch(() => null);
  });

  const results = await Promise.allSettled(requests);

  return results.reduce((acc, result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      acc[dataTypes[index]] = result.value;
    }
    return acc;
  }, {});
};

// Optimized fetch functions with connection pooling
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

// Optimized analysis functions with memoization
const memoize = (fn, ttl = 5000) => {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }

    const result = fn(...args);
    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
};

// utils/matchEnricher.js
// Add these functions before the enrichMatch export

const calculateMatchStats = (details, completeTimeline) => {
  if (!details?.values) return null;

  const statsObj = {
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
  };

  if (completeTimeline) {
    statsObj.timeline = {
      events: completeTimeline.events || [],
      periods: completeTimeline.periods || [],
    };
  }

  return statsObj;
};

const calculateGoalProbability = (momentum, stats) => {
  if (!momentum || !stats) return null;

  const calculateTeamProbability = (team) => {
    // Weighted factors for probability calculation
    const weights = {
      momentum: 0.3,
      attacks: 0.2,
      dangerous: 0.25,
      possession: 0.15,
      shots: 0.1,
    };

    // Calculate individual scores
    const momentumScore = momentum.recent[team] * weights.momentum;
    const attackScore = (stats.attacks[team] / 2) * weights.attacks;
    const dangerousScore = stats.dangerous[team] * weights.dangerous;
    const possessionScore = stats.possession[team] * weights.possession;
    const shotsScore =
      ((stats.shots.onTarget[team] * 2 + stats.shots.offTarget[team]) / 3) *
      weights.shots;

    // Combine scores and normalize to 0-100 range
    return Math.min(
      100,
      Math.max(
        0,
        momentumScore +
          attackScore +
          dangerousScore +
          possessionScore +
          shotsScore
      )
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
  const threshold = 65; // Configurable threshold

  let recommendation = {
    type: null,
    confidence: 0,
    reasons: [],
  };

  // Generate home team recommendation
  if (homeStrength > threshold) {
    recommendation.type = 'HOME_GOAL';
    recommendation.confidence = Math.min(100, Math.round(homeStrength));
    recommendation.reasons = [
      'Strong home team momentum',
      stats.dangerous.home > stats.dangerous.away * 1.5
        ? 'Dominant attacking presence'
        : null,
      stats.possession.home > 60 ? 'Controlling possession' : null,
      stats.shots.onTarget.home > stats.shots.onTarget.away * 2
        ? 'Superior shooting accuracy'
        : null,
    ].filter(Boolean);
  }
  // Generate away team recommendation
  else if (awayStrength > threshold) {
    recommendation.type = 'AWAY_GOAL';
    recommendation.confidence = Math.min(100, Math.round(awayStrength));
    recommendation.reasons = [
      'Strong away team momentum',
      stats.dangerous.away > stats.dangerous.home * 1.5
        ? 'Dominant attacking presence'
        : null,
      stats.possession.away > 60 ? 'Controlling possession' : null,
      stats.shots.onTarget.away > stats.shots.onTarget.home * 2
        ? 'Superior shooting accuracy'
        : null,
    ].filter(Boolean);
  }
  // Generate no goal recommendation
  else {
    recommendation.type = 'NO_GOAL';
    recommendation.confidence = Math.min(
      100,
      Math.round((100 - Math.max(homeStrength, awayStrength)) * 0.8)
    );
    recommendation.reasons = [
      'No clear momentum advantage',
      Math.abs(stats.possession.home - stats.possession.away) < 10
        ? 'Balanced possession'
        : null,
      stats.shots.onTarget.home + stats.shots.onTarget.away < 5
        ? 'Low shooting accuracy from both teams'
        : null,
    ].filter(Boolean);
  }

  return recommendation;
};

const analyzeMatchMomentum = memoize(
  (situation, timelineDelta, details, completeTimeline) => {
    if (!situation?.data) return null;

    const lastMinutes = situation.data.slice(-5);
    const momentum = {
      recent: lastMinutes.reduce(
        (acc, minute) => ({
          home:
            acc.home +
            (minute.home.dangerouscount * 2 + minute.home.attackcount),
          away:
            acc.away +
            (minute.away.dangerouscount * 2 + minute.away.attackcount),
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

    const possession = details?.values?.['110']?.value || {
      home: 50,
      away: 50,
    };
    momentum.possession = {
      home: parseInt(possession.home) || 50,
      away: parseInt(possession.away) || 50,
    };

    return momentum;
  }
);

// Export the optimized enrichment functions
export const enrichMatch = {
  initial: async (match) => {
    try {
      const matchId = match.eventId.toString().split(':').pop();
      const tournamentId = match.sport?.category?.tournament?.id;
      const bracketsId = match.eventId;

      // Parallel data fetching with optimized batching
      const [matchData, teamData, tournamentData] = await Promise.all([
        fetchMatchDataParallel(matchId, [
          'info',
          'squads',
          'odds',
          'timeline',
          'timelineDelta',
          'situation',
          'details',
          'phrases',
        ]),
        Promise.all([
          fetchTeamData.form(match.homeTeamId),
          fetchTeamData.form(match.awayTeamId),
          fetchTeamData.versus(match.homeTeamId, match.awayTeamId),
        ]),
        Promise.all([
          fetchEndpoint(API_ROUTES.SEASON_META, { tournamentId }),
          fetchEndpoint(API_ROUTES.CUP_BRACKETS, { bracketsId }),
          fetchEndpoint(API_ROUTES.SEASON_GOALS, { tournamentId }),
          fetchEndpoint(API_ROUTES.SEASON_CARDS, { tournamentId }),
          fetchEndpoint(API_ROUTES.SEASON_TABLE, { tournamentId }),
        ]),
      ]);

      const [homeForm, awayForm, headToHead] = teamData;
      const [seasonMeta, cupBrackets, seasonGoals, seasonCards, seasonTable] =
        tournamentData;

      // Process and analyze the enriched data
      const mergedTimeline = {
        complete:
          matchData.timeline?.doc?.[0]?.data || matchData.timeline?.doc || null,
        delta:
          matchData.timelineDelta?.doc?.[0]?.data ||
          matchData.timelineDelta?.data ||
          null,
      };

      const momentum = analyzeMatchMomentum(
        matchData.situation?.doc?.[0]?.data || matchData.situation?.data,
        matchData.timelineDelta?.doc?.[0]?.data ||
          matchData.timelineDelta?.data,
        matchData.details?.doc?.[0]?.data || matchData.details?.data,
        mergedTimeline.complete
      );

      const stats = calculateMatchStats(
        matchData.details?.doc?.[0]?.data || matchData.details?.data,
        mergedTimeline.complete
      );

      const goalProbability = calculateGoalProbability(momentum, stats);
      const recommendation = generateRecommendation(stats, goalProbability);

      // Get prematch data
      const data = await import('@/utils/preMatchData.json');
      const tournamentDataPrematch = data.default?.data?.tournaments?.find(
        (t) => t.id === tournamentId
      );
      const prematchData = tournamentDataPrematch?.events?.find(
        (event) =>
          (event.homeTeamName === match.homeTeamName &&
            event.awayTeamName === match.awayTeamName) ||
          (event.homeTeamId === match.homeTeamId &&
            event.awayTeamId === match.awayTeamId)
      );
      const market = prematchData?.markets?.find((m) => m.id === '1');

      return {
        ...match,
        enrichedData: {
          matchInfo: matchData.info?.doc?.[0].data,
          squads:
            matchData.squads?.doc?.[0].data || matchData.squads?.doc || null,
          odds: matchData.odds?.doc?.[0].data || matchData.odds?.doc || null,
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
          situation:
            matchData.situation?.doc?.[0]?.data ||
            matchData.situation?.doc ||
            null,
          details:
            matchData.details?.doc?.[0]?.data || matchData.details?.doc || null,
          phrases:
            matchData.phrases?.doc?.[0]?.data || matchData.phrases?.doc || null,
          prematchMarketData: market,
          analysis: {
            momentum,
            stats,
            goalProbability,
            recommendation,
          },
        },
      };
    } catch (error) {
      console.error('Error in enrichMatch.initial:', error);
      return match;
    }
  },

  realtime: async (match) => {
    try {
      const matchId = match.eventId.toString().split(':').pop();

      // Fetch only essential real-time data
      const realtimeData = await fetchMatchDataParallel(matchId, [
        'timeline',
        'timelineDelta',
        'situation',
        'details',
      ]);

      const momentum = analyzeMatchMomentum(
        realtimeData.situation?.doc?.[0]?.data || realtimeData.situation?.data,
        realtimeData.timelineDelta?.doc?.[0]?.data ||
          realtimeData.timelineDelta?.data,
        realtimeData.details?.doc?.[0]?.data || realtimeData.details?.data,
        realtimeData.timeline?.doc?.[0]?.data || realtimeData.timeline?.doc
      );

      const stats = calculateMatchStats(
        realtimeData.details?.doc?.[0]?.data || realtimeData.details?.data,
        realtimeData.timeline?.doc?.[0]?.data || realtimeData.timeline?.doc
      );

      const goalProbability = calculateGoalProbability(momentum, stats);
      const recommendation = generateRecommendation(stats, goalProbability);

      return {
        ...match,
        enrichedData: {
          ...match.enrichedData,
          timeline: {
            complete:
              realtimeData.timeline?.doc?.[0]?.data ||
              realtimeData.timeline?.doc ||
              null,
            delta:
              realtimeData.timelineDelta?.doc?.[0]?.data ||
              realtimeData.timelineDelta?.data ||
              null,
          },
          situation:
            realtimeData.situation?.doc?.[0]?.data ||
            realtimeData.situation?.doc ||
            null,
          details:
            realtimeData.details?.doc?.[0]?.data ||
            realtimeData.details?.doc ||
            null,
          analysis: {
            momentum,
            stats,
            goalProbability,
            recommendation,
          },
        },
      };
    } catch (error) {
      console.error('Error in enrichMatch.realtime:', error);
      return match;
    }
  },
};
