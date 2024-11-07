import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  BASE_URL,
  handleError,
  validateId,
  SPORTRADAR_API_KEY,
} from '@/utils/sportradar';

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

    const fetchMatchInfo = async (retries = 2) => {
      const url = `${BASE_URL}/match_info/${matchId}${SPORTRADAR_API_KEY}`;
      const timestamp = Date.now();

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: {
              ...SPORTRADAR_HEADERS,
              'If-None-Match': `"${matchId}-${timestamp}"`, // Enable HTTP caching
            },
            timeout: 5000, // 5 second timeout
            validateStatus: (status) => status === 200 || status === 304, // Accept both OK and Not Modified
          });

          // Return null for 304 responses
          if (response.status === 304) return null;
          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
      }
    };

    const data = await fetchMatchInfo();

    // If data hasn't changed, return 304
    if (data === null) {
      return new NextResponse(null, {
        status: 304,
      });
    }

    // Return response with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=30', // Cache for 30 seconds
        ETag: `"${matchId}-${Date.now()}"`,
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    // Add error logging in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Match Info API Error:', {
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

export const revalidate = 0;
