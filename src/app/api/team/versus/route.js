// app/api/team/versus/route.js
import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  BASE_URL,
  handleError,
  validateId,
  SPORTRADAR_API_KEY,
} from '@/utils/sportradar';

// Cache configuration - moderate TTL for versus data
const CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for versus data
const MAX_CACHE_SIZE = 1000;

export const GET = async (request) => {
  try {
    // Input validation
    if (!request?.url) {
      throw new Error('Invalid request URL');
    }

    const { searchParams } = new URL(request.url);
    const team1Id = searchParams.get('team1Id');
    const team2Id = searchParams.get('team2Id');

    // Validate both team IDs
    validateId(team1Id, 'Team 1');
    validateId(team2Id, 'Team 2');

    // Create unique cache key for team pair
    const cacheKey = `${team1Id}-${team2Id}`;

    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return new NextResponse(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=1800',
          'X-Cache': 'HIT',
        },
      });
    }

    const fetchVersusData = async (retries = 2) => {
      const url = `${BASE_URL}/stats_team_versusrecent/${team1Id}/${team2Id}${SPORTRADAR_API_KEY}`;
      const timestamp = Date.now();

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: {
              ...SPORTRADAR_HEADERS,
              'If-None-Match': `"${cacheKey}-${timestamp}"`,
            },
            timeout: 5000, // 5 second timeout
            validateStatus: (status) => [200, 304].includes(status),
          });

          // Handle 304 Not Modified
          if (response.status === 304 && cachedData) {
            return cachedData;
          }

          // Optimize versus data
          return esponse.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    const data = await fetchVersusData();

    // Cache the new data
    setCacheData(cacheKey, data);

    // Return response with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=1800',
        ETag: `"${cacheKey}-${Date.now()}"`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    // Log errors in production with rate limiting
    if (process.env.NODE_ENV === 'production') {
      logError('team-versus', error, {
        team1Id: searchParams?.get('team1Id'),
        team2Id: searchParams?.get('team2Id'),
      });
    }

    return new NextResponse(JSON.stringify(errorResponse), {
      status: errorResponse.code,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};

// Optimize versus data to reduce payload size
const optimizeVersusData = (data) => {
  if (!data || !data.matches) return data;

  return {
    summary: data.summary,
    matches: data.matches.map((match) => ({
      id: match.id,
      date: match.date,
      competition: {
        id: match.competition.id,
        name: match.competition.name,
      },
      teams: {
        home: {
          id: match.teams.home.id,
          name: match.teams.home.name,
          score: match.teams.home.score,
        },
        away: {
          id: match.teams.away.id,
          name: match.teams.away.name,
          score: match.teams.away.score,
        },
      },
      result: match.result,
    })),
  };
};

// Error logging with rate limiting
const errorLogs = new Map();
const ERROR_LOG_LIMIT = 5; // Max errors per minute per endpoint

const logError = (endpoint, error, context) => {
  const now = Date.now();
  const key = `${endpoint}-${Math.floor(now / 60000)}`; // Key by minute

  const currentCount = errorLogs.get(key) || 0;
  if (currentCount < ERROR_LOG_LIMIT) {
    console.error(`${endpoint} API Error:`, {
      ...context,
      error: error.message,
      timestamp: new Date(now).toISOString(),
    });
    errorLogs.set(key, currentCount + 1);
  }
};

// Cache helper functions
const getCachedData = (cacheKey) => {
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  CACHE.delete(cacheKey);
  return null;
};

const setCacheData = (cacheKey, data) => {
  if (CACHE.size >= MAX_CACHE_SIZE) {
    const oldestKey = Array.from(CACHE.keys()).sort(
      (a, b) => CACHE.get(a).timestamp - CACHE.get(b).timestamp
    )[0];
    CACHE.delete(oldestKey);
  }

  CACHE.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
};

// Cache cleanup
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of CACHE.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      CACHE.delete(key);
    }
  }
}, CACHE_TTL / 4);

// Cleanup handler
if (process.env.NODE_ENV === 'development') {
  process.on('SIGTERM', () => {
    clearInterval(cleanup);
    CACHE.clear();
  });
}

export const revalidate = 0;
