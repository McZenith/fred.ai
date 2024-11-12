import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  BASE_URL,
  handleError,
  validateId,
  SPORTRADAR_API_KEY,
} from '@/utils/sportradar';

// Cache configuration - long TTL for season metadata
const CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for season metadata
const MAX_CACHE_SIZE = 500; // Limit cache size

export const GET = async (request) => {
  try {
    // Input validation
    if (!request?.url) {
      throw new Error('Invalid request URL');
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('matchId'); // Bug fix: parameter name should be 'seasonId'

    const tournamentId = searchParams.get('tournamentId');

    const requestId =
      seasonId?.toString().split(':').pop() ??
      tournamentId?.toString().split(':').pop();
    // Validate seasonId
    validateId(requestId, 'Season');

    // Check cache first
    const cachedData = getCachedData(requestId);
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

    const fetchSeasonMeta = async (retries = 2) => {
      const url = `${BASE_URL}/stats_season_meta/${requestId}${SPORTRADAR_API_KEY}`;
      const timestamp = Date.now();

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: {
              ...SPORTRADAR_HEADERS,
              'If-None-Match': `"${requestId}-${timestamp}"`,
            },
            timeout: 5000, // 5 second timeout
            validateStatus: (status) => [200, 304].includes(status),
          });

          // Handle 304 Not Modified
          if (response.status === 304 && cachedData) {
            return cachedData;
          }

          // Optimize metadata response
          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    const data = await fetchSeasonMeta();

    // Cache the new data
    setCacheData(requestId, data);

    // Return response with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=1800',
        ETag: `"${requestId}-${Date.now()}"`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    return new NextResponse(JSON.stringify(errorResponse), {
      status: errorResponse.code,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};

// Optimize metadata to reduce payload size
const optimizeMetadata = (data) => {
  if (!data) return data;

  return {
    id: data.id,
    name: data.name,
    year: data.year,
    competition: data.competition && {
      id: data.competition.id,
      name: data.competition.name,
      type: data.competition.type,
    },
    statistics: data.statistics,
    // Remove unnecessary fields
  };
};

// Cache helper functions
const getCachedData = (seasonId) => {
  const cached = CACHE.get(seasonId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  CACHE.delete(seasonId);
  return null;
};

const setCacheData = (seasonId, data) => {
  if (CACHE.size >= MAX_CACHE_SIZE) {
    const oldestKey = Array.from(CACHE.keys()).sort(
      (a, b) => CACHE.get(a).timestamp - CACHE.get(b).timestamp
    )[0];
    CACHE.delete(oldestKey);
  }

  CACHE.set(seasonId, {
    data,
    timestamp: Date.now(),
  });
};

// Less frequent cache cleanup for season metadata
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of CACHE.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      CACHE.delete(key);
    }
  }
}, CACHE_TTL / 2);

// Cleanup handler
if (process.env.NODE_ENV === 'development') {
  process.on('SIGTERM', () => {
    clearInterval(cleanup);
    CACHE.clear();
  });
}

export const revalidate = 0;
