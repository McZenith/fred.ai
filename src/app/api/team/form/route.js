// app/api/team/form/route.js
import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  BASE_URL,
  handleError,
  validateId,
  SPORTRADAR_API_KEY,
} from '@/utils/sportradar';

// Cache configuration - moderate TTL for team form data
const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes for team form
const MAX_CACHE_SIZE = 1000;

export const GET = async (request) => {
  try {
    // Input validation
    if (!request?.url) {
      throw new Error('Invalid request URL');
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    // Validate teamId
    validateId(teamId, 'Team');

    // Check cache first
    const cachedData = getCachedData(teamId);
    if (cachedData) {
      return new NextResponse(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=900',
          'X-Cache': 'HIT',
        },
      });
    }

    const fetchTeamForm = async (retries = 2) => {
      const url = `${BASE_URL}/stats_team_lastx/${teamId}${SPORTRADAR_API_KEY}`;
      const timestamp = Date.now();

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: {
              ...SPORTRADAR_HEADERS,
              'If-None-Match': `"${teamId}-${timestamp}"`,
            },
            timeout: 5000, // 5 second timeout
            validateStatus: (status) => [200, 304].includes(status),
          });

          // Handle 304 Not Modified
          if (response.status === 304 && cachedData) {
            return cachedData;
          }

          // Optimize form data
          return optimizeFormData(response.data);
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    const data = await fetchTeamForm();

    // Cache the new data
    setCacheData(teamId, data);

    // Return response with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=900',
        ETag: `"${teamId}-${Date.now()}"`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    // Log errors in production with rate limiting
    if (process.env.NODE_ENV === 'production') {
      logError('team-form', error, searchParams?.get('teamId'));
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

// Optimize form data to reduce payload size
const optimizeFormData = (data) => {
  if (!data || !data.matches) return data;

  return {
    ...data,
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

const logError = (endpoint, error, id) => {
  const now = Date.now();
  const key = `${endpoint}-${Math.floor(now / 60000)}`; // Key by minute

  const currentCount = errorLogs.get(key) || 0;
  if (currentCount < ERROR_LOG_LIMIT) {
    console.error(`${endpoint} API Error:`, {
      id,
      error: error.message,
      timestamp: new Date(now).toISOString(),
    });
    errorLogs.set(key, currentCount + 1);
  }
};

// Cache helper functions
const getCachedData = (teamId) => {
  const cached = CACHE.get(teamId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  CACHE.delete(teamId);
  return null;
};

const setCacheData = (teamId, data) => {
  if (CACHE.size >= MAX_CACHE_SIZE) {
    const oldestKey = Array.from(CACHE.keys()).sort(
      (a, b) => CACHE.get(a).timestamp - CACHE.get(b).timestamp
    )[0];
    CACHE.delete(oldestKey);
  }

  CACHE.set(teamId, { data, timestamp: Date.now() });
};

export const revalidate = 0;
