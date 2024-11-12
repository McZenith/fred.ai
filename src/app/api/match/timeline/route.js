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

    const fetchTimeline = async (retries = 2) => {
      const url = `${BASE_URL}/match_timeline/${matchId}${SPORTRADAR_API_KEY}`;

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: SPORTRADAR_HEADERS,
            timeout: 3000, // 3 second timeout for timeline data
          });

          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          // Very short backoff for timeline data
          await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
        }
      }
    };

    const data = await fetchTimeline();

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
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

export const revalidate = 0;
