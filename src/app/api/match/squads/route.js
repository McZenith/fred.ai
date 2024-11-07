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

    const fetchSquads = async (retries = 2) => {
      const url = `${BASE_URL}/match_squads/${matchId}${SPORTRADAR_API_KEY}`;

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: SPORTRADAR_HEADERS,
            timeout: 5000, // 5 second timeout
          });

          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    const data = await fetchSquads();

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
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

export const revalidate = 0;
