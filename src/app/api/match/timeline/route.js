import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  BASE_URL,
  handleError,
  validateId,
  SPORTRADAR_API_KEY,
} from '@/utils/sportradar';

// Cache configuration - short TTL for timeline data
const CACHE = new Map();
const CACHE_TTL = 10000; // 10 seconds for timeline data

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
          'Cache-Control': 'private, max-age=10',
          'X-Cache': 'HIT',
        },
      });
    }

    const fetchTimeline = async (retries = 2) => {
      const url = `${BASE_URL}/match_timeline/${matchId}${SPORTRADAR_API_KEY}`;
      const timestamp = Date.now();

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: {
              ...SPORTRADAR_HEADERS,
              'If-None-Match': `"${matchId}-${timestamp}"`,
            },
            timeout: 3000, // 3 second timeout for timeline data
            validateStatus: (status) => [200, 304].includes(status),
          });

          // Handle 304 Not Modified
          if (response.status === 304 && cachedData) {
            return cachedData;
          }

          // Process and optimize timeline data
          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          // Very short backoff for timeline data
          await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
        }
      }
    };

    const data = await fetchTimeline();

    // Cache the new data
    setCacheData(matchId, data);

    // Return response with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=10',
        ETag: `"${matchId}-${Date.now()}"`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    // Enhanced error logging
    if (process.env.NODE_ENV === 'production') {
      console.error('Match Timeline API Error:', {
        matchId: searchParams?.get('matchId'),
        error: error.message,
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

// Optimize timeline data to reduce payload size
const optimizeTimelineData = (data) => {
  if (!data || !data.events) return data;

  return {
    ...data,
    events: data.events.map((event) => ({
      id: event.id,
      type: event.type,
      time: event.time,
      team: event.team,
      player: event.player?.name,
      // Only include essential fields
      details: event.details
        ? {
            score: event.details.score,
            reason: event.details.reason,
            card: event.details.card,
          }
        : null,
    })),
  };
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
    // Limit cache to 1000 entries
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

// Clean up expired cache entries frequently
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of CACHE.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      CACHE.delete(key);
    }
  }
}, CACHE_TTL / 2); // Run cleanup more frequently for timeline data

// Cleanup handler
if (process.env.NODE_ENV === 'development') {
  process.on('SIGTERM', () => {
    clearInterval(cleanup);
    CACHE.clear();
  });
}

export const revalidate = 0;
