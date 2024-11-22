import { API_ROUTES } from './constants';
// utils/matchEnricher.js
const API_TIMEOUT = 3000; // 3 seconds timeout for API calls

// Enhanced fetch helper with better error handling and fallbacks
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
    }).catch((error) => {
      throw new Error(`Network error: ${error.message}`);
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      throw new Error('Invalid JSON response');
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn(`Request timeout for ${route}`);
    }

    if (retries > 0) {
      // Exponential backoff
      const backoffDelay = Math.min(1000 * 2 ** (2 - retries), 5000);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return fetchEndpoint(route, params, retries - 1);
    }

    // Return a safe fallback object instead of null
    return {
      doc: [
        {
          data: {
            values: {},
            events: [],
            periods: [],
            matches: [],
            markets: [],
          },
        },
      ],
    };
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

async function getPrematchData(matchId) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const res = await fetch(
    `/api/match/prematchdata?matchId=${
      tomorrow.toISOString().split('T')[0]
    }:${matchId}`
  );
  const data = await res.json();
  return data.match;
}

// Export the optimized enrichment functions
export const enrichMatch = {
  initial: async (match) => {
    try {
      const matchId = match.eventId.toString().split(':').pop();
      const tournamentId = match.sport?.category?.tournament?.id;
      const bracketsId = match.eventId;

      // Add error boundaries around the parallel data fetching
      const [matchData, teamData, tournamentData] = await Promise.allSettled([
        // Match data fetching with fallbacks
        Promise.all([
          fetchEndpoint(API_ROUTES.MATCH_INFO, { matchId }).catch(() => ({
            doc: [{ data: {} }],
          })),
          fetchEndpoint(API_ROUTES.SQUADS, { matchId }).catch(() => ({
            doc: [{ data: {} }],
          })),
          fetchEndpoint(API_ROUTES.ODDS, { matchId }).catch(() => ({
            doc: [{ data: {} }],
          })),
          fetchEndpoint(API_ROUTES.TIMELINE, { matchId }).catch(() => ({
            doc: [{ data: { events: [] } }],
          })),
          fetchEndpoint(API_ROUTES.TIMELINE_DELTA, { matchId }).catch(() => ({
            doc: [{ data: {} }],
          })),
          fetchEndpoint(API_ROUTES.SITUATION, { matchId }).catch(() => ({
            doc: [{ data: {} }],
          })),
          fetchEndpoint(API_ROUTES.DETAILS, { matchId }).catch(() => ({
            doc: [{ data: { values: {} } }],
          })),
          fetchEndpoint(API_ROUTES.PHRASES, { matchId }).catch(() => ({
            doc: [{ data: {} }],
          })),
        ]).catch(() => []),

        // Team data fetching with fallbacks
        Promise.all([
          fetchEndpoint(API_ROUTES.TEAM_FORM, {
            teamId: match.homeTeamId,
          }).catch(() => ({ doc: [{ data: {} }] })),
          fetchEndpoint(API_ROUTES.TEAM_FORM, {
            teamId: match.awayTeamId,
          }).catch(() => ({ doc: [{ data: {} }] })),
          fetchEndpoint(API_ROUTES.TEAM_VERSUS, {
            teamId1: match.homeTeamId,
            teamId2: match.awayTeamId,
          }).catch(() => ({ doc: [{ data: {} }] })),
        ]).catch(() => []),

        // Tournament data fetching with fallbacks
        Promise.all([
          fetchEndpoint(API_ROUTES.SEASON_META, { tournamentId }).catch(() => ({
            doc: [{ data: {} }],
          })),
          fetchEndpoint(API_ROUTES.CUP_BRACKETS, { bracketsId }).catch(() => ({
            doc: [{ data: {} }],
          })),
          fetchEndpoint(API_ROUTES.SEASON_GOALS, { tournamentId }).catch(
            () => ({ doc: [{ data: {} }] })
          ),
          fetchEndpoint(API_ROUTES.SEASON_CARDS, { tournamentId }).catch(
            () => ({ doc: [{ data: {} }] })
          ),
          fetchEndpoint(API_ROUTES.SEASON_TABLE, { tournamentId }).catch(
            () => ({ doc: [{ data: {} }] })
          ),
        ]).catch(() => []),
      ]);

      // Safely extract data with fallbacks
      const [matchDataResult, teamDataResult, tournamentDataResult] = [
        matchData.status === 'fulfilled' ? matchData.value : [],
        teamData.status === 'fulfilled' ? teamData.value : [],
        tournamentData.status === 'fulfilled' ? tournamentData.value : [],
      ];

      const [
        matchInfo = { doc: [{ data: {} }] },
        squads = { doc: [{ data: {} }] },
        odds = { doc: [{ data: {} }] },
        timeline = { doc: [{ data: { events: [] } }] },
        timelineDelta = { doc: [{ data: {} }] },
        situation = { doc: [{ data: {} }] },
        details = { doc: [{ data: { values: {} } }] },
        phrases = { doc: [{ data: {} }] },
      ] = matchDataResult;

      const [
        homeForm = { doc: [{ data: {} }] },
        awayForm = { doc: [{ data: {} }] },
        headToHead = { doc: [{ data: {} }] },
      ] = teamDataResult;

      const [
        seasonMeta = { doc: [{ data: {} }] },
        cupBrackets = { doc: [{ data: {} }] },
        seasonGoals = { doc: [{ data: {} }] },
        seasonCards = { doc: [{ data: {} }] },
        seasonTable = { doc: [{ data: {} }] },
      ] = tournamentDataResult;

      // Process and analyze the enriched data with safe fallbacks
      const mergedTimeline = {
        complete: timeline?.doc?.[0]?.data || { events: [] },
        delta: timelineDelta?.doc?.[0]?.data || {},
      };

      const momentum = analyzeMatchMomentum(
        situation?.doc?.[0]?.data || { data: [] },
        timelineDelta?.doc?.[0]?.data || {},
        details?.doc?.[0]?.data || { values: {} },
        mergedTimeline.complete
      ) || { recent: { home: 0, away: 0 }, trend: [] };

      const stats = calculateMatchStats(
        details?.doc?.[0]?.data || { values: {} },
        mergedTimeline.complete
      ) || {
        attacks: { home: 0, away: 0 },
        dangerous: { home: 0, away: 0 },
        possession: { home: 50, away: 50 },
        shots: {
          onTarget: { home: 0, away: 0 },
          offTarget: { home: 0, away: 0 },
        },
        corners: { home: 0, away: 0 },
        cards: { yellow: { home: 0, away: 0 }, red: { home: 0, away: 0 } },
      };

      const goalProbability = calculateGoalProbability(momentum, stats) || {
        home: 0,
        away: 0,
      };
      const recommendation = generateRecommendation(stats, goalProbability) || {
        type: 'NO_PREDICTION',
        confidence: 0,
        reasons: ['Insufficient data'],
      };

      // Get prematch data with fallback
      let market = [];
      try {
        const data = await getPrematchData(match.eventId);
        market = data?.markets || [];
      } catch (error) {
        console.warn('Failed to fetch prematch data:', error);
      }

      return {
        ...match,
        enrichedData: {
          matchInfo: matchInfo?.doc?.[0].data || {},
          squads: squads?.doc?.[0].data || {},
          odds: odds?.doc?.[0].data || {},
          timeline: mergedTimeline,
          form: {
            home: homeForm?.doc?.[0].data || {},
            away: awayForm?.doc?.[0].data || {},
          },
          h2h: headToHead?.doc?.[0].data || {},
          tournament: {
            cupBrackets: cupBrackets?.doc?.[0].data || {},
            seasonMeta: seasonMeta?.doc?.[0].data || {},
            goals: seasonGoals?.doc?.[0].data || {},
            cards: seasonCards?.doc?.[0].data || {},
            table: seasonTable?.doc?.[0].data || {},
          },
          situation: situation?.doc?.[0]?.data || {},
          details: details?.doc?.[0]?.data || { values: {} },
          phrases: phrases?.doc?.[0]?.data || {},
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
      console.warn('Error in enrichMatch.initial:', error);
      // Return match with safe fallback enriched data
      return {
        ...match,
        enrichedData: {
          matchInfo: {},
          squads: {},
          odds: {},
          timeline: { complete: { events: [] }, delta: {} },
          form: { home: {}, away: {} },
          h2h: {},
          tournament: {},
          situation: {},
          details: { values: {} },
          phrases: {},
          prematchMarketData: [],
          analysis: {
            momentum: { recent: { home: 0, away: 0 }, trend: [] },
            stats: {
              attacks: { home: 0, away: 0 },
              dangerous: { home: 0, away: 0 },
              possession: { home: 50, away: 50 },
              shots: {
                onTarget: { home: 0, away: 0 },
                offTarget: { home: 0, away: 0 },
              },
              corners: { home: 0, away: 0 },
              cards: {
                yellow: { home: 0, away: 0 },
                red: { home: 0, away: 0 },
              },
            },
            goalProbability: { home: 0, away: 0 },
            recommendation: {
              type: 'NO_PREDICTION',
              confidence: 0,
              reasons: ['Data unavailable'],
            },
          },
        },
      };
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
