import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  BASE_URL,
  handleError,
  validateId,
  SPORTRADAR_API_KEY,
} from '@/utils/sportradar';

// Cache configuration - very short TTL for delta updates
const CACHE = new Map();
const CACHE_TTL = 5000; // 5 seconds for delta updates
const MAX_CACHE_SIZE = 2000; // Larger cache for delta updates

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
          'Cache-Control': 'private, max-age=5',
          'X-Cache': 'HIT',
        },
      });
    }

    const fetchTimelineDelta = async (retries = 3) => {
      const url = `${BASE_URL}/match_timelinedelta/${matchId}${SPORTRADAR_API_KEY}`;
      const timestamp = Date.now();

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: {
              ...SPORTRADAR_HEADERS,
              'If-None-Match': `"${matchId}-${timestamp}"`,
            },
            timeout: 2000, // 2 second timeout for delta updates
            validateStatus: (status) => [200, 304].includes(status),
          });

          // Handle 304 Not Modified
          if (response.status === 304 && cachedData) {
            return cachedData;
          }

          // Optimize delta data
          return optimizeDeltaData(response.data);
        } catch (err) {
          if (i === retries - 1) throw err;
          // Very short backoff for delta updates
          await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1)));
        }
      }
    };

    const data = await fetchTimelineDelta();

    // Cache the new data
    setCacheData(matchId, data);

    // Return response with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=5',
        ETag: `"${matchId}-${Date.now()}"`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    // Enhanced error logging with rate limiting
    if (process.env.NODE_ENV === 'production') {
      logError(error, searchParams?.get('matchId'));
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

// Optimize delta data to reduce payload size
const optimizeDeltaData = (data) => {
  if (!data || !data.changes) return data;

  return {
    ...data,
    changes: data.changes.map((change) => ({
      type: change.type,
      path: change.path,
      value: change.value,
      // Only include essential fields
      timestamp: change.timestamp,
    })),
  };
};

// Error logging with rate limiting
const errorLogs = new Map();
const ERROR_LOG_LIMIT = 10; // Max errors per minute per matchId

const logError = (error, matchId) => {
  const now = Date.now();
  const key = `${matchId}-${Math.floor(now / 60000)}`; // Key by minute

  const currentCount = errorLogs.get(key) || 0;
  if (currentCount < ERROR_LOG_LIMIT) {
    console.error('Timeline Delta API Error:', {
      matchId,
      error: error.message,
      timestamp: new Date(now).toISOString(),
    });
    errorLogs.set(key, currentCount + 1);
  }
};

// Cache helper functions
const getCachedData = (matchId) => {
  const cached = CACHE.get(matchId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  CACHE.delete(matchId);
  return null;
};

const setCacheData = (matchId, data) => {
  if (CACHE.size >= MAX_CACHE_SIZE) {
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

// Very frequent cache cleanup for delta updates
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of CACHE.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      CACHE.delete(key);
    }
  }
}, 1000); // Clean every second

// Cleanup handler
if (process.env.NODE_ENV === 'development') {
  process.on('SIGTERM', () => {
    clearInterval(cleanup);
    CACHE.clear();
  });
}

export const revalidate = 0;
