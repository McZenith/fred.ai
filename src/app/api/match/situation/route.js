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
            timeout: 4000,
            validateStatus: (status) => [200, 304].includes(status),
          });

          if (response.status === 304) return null;
          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
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
          'Cache-Control': 'no-store',
        },
      });
    }

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ETag: `"${matchId}-${Date.now()}"`,
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
