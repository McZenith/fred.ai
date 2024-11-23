import { API_ROUTES } from './constants';

const API_TIMEOUT = 3000;
const BATCH_SIZE = 3; // Process 3 requests at a time
const BATCH_INTERVAL = 100; // 100ms between batches

// Request Queue Implementation
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.cache = new Map();
  }

  async add(requests) {
    return new Promise((resolve) => {
      this.queue.push({ requests, resolve });
      this.process();
    });
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { requests, resolve } = this.queue[0];
      const results = [];

      for (let i = 0; i < requests.length; i += BATCH_SIZE) {
        const batch = requests.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (request) => {
            const cacheKey = `${request.url}:${JSON.stringify(request.params)}`;

            if (this.cache.has(cacheKey)) {
              return this.cache.get(cacheKey);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

            try {
              const queryString = Object.entries(request.params)
                .map(([key, value]) => `${key}=${value}`)
                .join('&');

              const response = await fetch(`${request.url}?${queryString}`, {
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

              const data = await response.json();
              this.cache.set(cacheKey, data);
              return data;
            } catch (error) {
              clearTimeout(timeoutId);
              console.warn(`Request failed for ${request.url}:`, error);
              return request.fallback;
            }
          })
        );

        results.push(...batchResults);

        if (i + BATCH_SIZE < requests.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_INTERVAL));
        }
      }

      resolve(results);
      this.queue.shift();
    }

    this.processing = false;
  }

  clearCache() {
    this.cache.clear();
  }
}

const requestQueue = new RequestQueue();

// Helper Functions
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

async function fetchWithQueue(
  route,
  params,
  fallback = { doc: [{ data: {} }] }
) {
  try {
    const result = await requestQueue.add([
      {
        url: route,
        params,
        fallback,
      },
    ]);
    return result[0];
  } catch (error) {
    console.warn(`Failed to fetch ${route}:`, error);
    return fallback;
  }
}

async function getPrematchData(matchId) {
  const tomorrow = new Date();
  const result = await fetchWithQueue('/api/match/prematchdata', {
    matchId: `${tomorrow.toISOString().split('T')[0]}:${matchId}`,
  });
  return result.match;
}

export const enrichMatch = {
  initial: async (match) => {
    try {
      const matchId = match.eventId.toString().split(':').pop();
      const tournamentId = match.sport?.category?.tournament?.id;
      const bracketsId = match.eventId;

      // Group requests by priority and batch them
      const [essentialData, enrichmentData] = await Promise.all([
        // Essential match data (first priority)
        requestQueue.add([
          {
            url: API_ROUTES.MATCH_INFO,
            params: { matchId },
            fallback: { doc: [{ data: {} }] },
          },
          {
            url: API_ROUTES.MATCH_DETAILS,
            params: { matchId },
            fallback: { doc: [{ data: { values: {} } }] },
          },
          {
            url: API_ROUTES.MATCH_TIMELINE,
            params: { matchId },
            fallback: { doc: [{ data: { events: [] } }] },
          },
        ]),

        // Enrichment data (second priority)
        requestQueue.add([
          {
            url: API_ROUTES.MATCH_SITUATION,
            params: { matchId },
            fallback: { doc: [{ data: {} }] },
          },
          {
            url: API_ROUTES.MATCH_TIMELINE_DELTA,
            params: { matchId },
            fallback: { doc: [{ data: {} }] },
          },
          {
            url: API_ROUTES.TEAM_FORM,
            params: { teamId: match.homeTeamId },
            fallback: { doc: [{ data: {} }] },
          },
          {
            url: API_ROUTES.TEAM_FORM,
            params: { teamId: match.awayTeamId },
            fallback: { doc: [{ data: {} }] },
          },
          {
            url: API_ROUTES.TEAM_VERSUS,
            params: { teamId1: match.homeTeamId, teamId2: match.awayTeamId },
            fallback: { doc: [{ data: {} }] },
          },
        ]),
      ]);

      const [matchInfo, details, timeline] = essentialData;
      const [situation, timelineDelta, homeForm, awayForm, headToHead] =
        enrichmentData;

      // Additional data in background
      const additionalData = await requestQueue.add([
        {
          url: API_ROUTES.MATCH_SQUADS,
          params: { matchId },
          fallback: { doc: [{ data: {} }] },
        },
        {
          url: API_ROUTES.MATCH_ODDS,
          params: { matchId },
          fallback: { doc: [{ data: {} }] },
        },
        {
          url: API_ROUTES.MATCH_PHRASES,
          params: { matchId },
          fallback: { doc: [{ data: {} }] },
        },
        {
          url: API_ROUTES.SEASON_META,
          params: { tournamentId },
          fallback: { doc: [{ data: {} }] },
        },
        {
          url: API_ROUTES.SEASON_TABLE,
          params: { tournamentId },
          fallback: { doc: [{ data: {} }] },
        },
      ]);

      const [squads, odds, phrases, seasonMeta, seasonTable] = additionalData;

      // Get prematch data
      let market = [];
      try {
        const data = await getPrematchData(match.eventId);
        market = data?.markets || [];
      } catch (error) {
        console.warn('Failed to fetch prematch data:', error);
      }

      // Process data
      const mergedTimeline = {
        complete: timeline?.doc?.[0]?.data || { events: [] },
        delta: timelineDelta?.doc?.[0]?.data || {},
      };

      const momentum = analyzeMatchMomentum(
        situation?.doc?.[0]?.data || { data: [] },
        timelineDelta?.doc?.[0]?.data,
        details?.doc?.[0]?.data,
        mergedTimeline.complete
      );

      const stats = calculateMatchStats(
        details?.doc?.[0]?.data,
        mergedTimeline.complete
      );

      const goalProbability = calculateGoalProbability(momentum, stats);
      const recommendation = generateRecommendation(stats, goalProbability);

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
            seasonMeta: seasonMeta?.doc?.[0].data || {},
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

      const realtimeData = await Promise.all([
        requestQueue.add([
          {
            url: API_ROUTES.MATCH_TIMELINE,
            params: { matchId },
            fallback: { doc: [{ data: { events: [] } }] },
          },
          {
            url: API_ROUTES.MATCH_TIMELINE_DELTA,
            params: { matchId },
            fallback: { doc: [{ data: {} }] },
          },
        ]),
        requestQueue.add([
          {
            url: API_ROUTES.MATCH_SITUATION,
            params: { matchId },
            fallback: { doc: [{ data: {} }] },
          },
          {
            url: API_ROUTES.MATCH_DETAILS,
            params: { matchId },
            fallback: { doc: [{ data: { values: {} } }] },
          },
        ]),
      ]);

      const [timeline, timelineDelta] = realtimeData[0];
      const [situation, details] = realtimeData[1];

      const momentum = analyzeMatchMomentum(
        situation?.doc?.[0]?.data,
        timelineDelta?.doc?.[0]?.data,
        details?.doc?.[0]?.data,
        timeline?.doc?.[0]?.data
      );

      const stats = calculateMatchStats(
        details?.doc?.[0]?.data,
        timeline?.doc?.[0]?.data
      );

      const goalProbability = calculateGoalProbability(momentum, stats);
      const recommendation = generateRecommendation(stats, goalProbability);

      return {
        ...match,
        enrichedData: {
          ...match.enrichedData,
          timeline: {
            complete: timeline?.doc?.[0]?.data || null,
            delta: timelineDelta?.doc?.[0]?.data || null,
          },
          situation: situation?.doc?.[0]?.data || null,
          details: details?.doc?.[0]?.data || null,
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

export default enrichMatch;
