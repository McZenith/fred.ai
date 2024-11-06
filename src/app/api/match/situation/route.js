import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  BASE_URL,
  handleError,
  validateId,
  SPORTRADAR_API_KEY,
} from '@/utils/sportradar';

// Cache configuration for match situations
const CACHE = new Map();
const CACHE_TTL = 20000; // 20 seconds for match situations

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
          'Cache-Control': 'private, max-age=20',
          'X-Cache': 'HIT',
        },
      });
    }

    const fetchSituation = async (retries = 2) => {
      const url = `${BASE_URL}/stats_match_situation/${matchId}${SPORTRADAR_API_KEY}`;
      const timestamp = Date.now();

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: {
              ...SPORTRADAR_HEADERS,
              'If-None-Match': `"${matchId}-${timestamp}"`,
            },
            timeout: 4000, // 4 second timeout
            validateStatus: (status) => [200, 304].includes(status),
          });

          if (response.status === 304) return null;
          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          // Short backoff for live data
          await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
        }
      }
    };

    const data = await fetchSituation();

    // Handle 304 Not Modified
    if (data === null) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'Cache-Control': 'private, max-age=20',
        },
      });
    }

    // Cache the new data
    setCacheData(matchId, data);

    // Return response with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=20',
        ETag: `"${matchId}-${Date.now()}"`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    // Log errors in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Match Situation API Error:', {
        matchId: searchParams?.get('matchId'),
        error: error.message,
        stack: error.stack,
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

// Cache helper functions
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
  if (CACHE.size > 1000) {
    const oldestKey = CACHE.keys().next().value;
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

// Cleanup handler for when the module is unloaded
if (process.env.NODE_ENV === 'development') {
  process.on('SIGTERM', () => {
    clearInterval(cleanup);
    CACHE.clear();
  });
}

export const revalidate = 0;
