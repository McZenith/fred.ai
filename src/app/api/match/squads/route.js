// app/api/match/squads/route.js
import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  BASE_URL,
  handleError,
  validateId,
  SPORTRADAR_API_KEY,
} from '@/utils/sportradar';

// Cache configuration - longer TTL for squads as they change less frequently
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for squad data

export const GET = async (request) => {
  try {
    // Input validation
    if (!request?.url) {
      throw new Error('Invalid request URL');
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    // Validate matchId
    validateId(matchId, 'Match');

    // Check cache first
    const cachedData = getCachedData(matchId);
    if (cachedData) {
      return new NextResponse(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300',
          'X-Cache': 'HIT',
        },
      });
    }

    const fetchSquads = async (retries = 2) => {
      const url = `${BASE_URL}/match_squads/${matchId}${SPORTRADAR_API_KEY}`;
      const timestamp = Date.now();

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: {
              ...SPORTRADAR_HEADERS,
              'If-None-Match': `"${matchId}-${timestamp}"`,
            },
            timeout: 5000, // 5 second timeout
            validateStatus: (status) => [200, 304].includes(status),
          });

          // Handle 304 Not Modified
          if (response.status === 304 && cachedData) {
            return cachedData;
          }

          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          // Longer backoff for squad data is acceptable
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    const data = await fetchSquads();

    // Cache the new data
    setCacheData(matchId, data);

    // Return response with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300',
        ETag: `"${matchId}-${Date.now()}"`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    // Enhanced error logging in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Match Squads API Error:', {
        matchId: searchParams?.get('matchId'),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
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

// Cache helper functions with data compression
const getCachedData = (matchId) => {
  const cached = CACHE.get(matchId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  CACHE.delete(matchId); // Clean up expired cache
  return null;
};

const setCacheData = (matchId, data) => {
  // Implement cache size limit
  if (CACHE.size > 500) {
    // Limit cache to 500 entries
    const oldestKey = Array.from(CACHE.keys()).sort(
      (a, b) => CACHE.get(a).timestamp - CACHE.get(b).timestamp
    )[0];
    CACHE.delete(oldestKey);
  }

  CACHE.set(matchId, {
    data,
    timestamp: Date.now(),
  });
};

// Clean up expired cache entries periodically
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of CACHE.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      CACHE.delete(key);
    }
  }
}, CACHE_TTL);

// Cleanup handler
if (process.env.NODE_ENV === 'development') {
  process.on('SIGTERM', () => {
    clearInterval(cleanup);
    CACHE.clear();
  });
}

export const revalidate = 0;
