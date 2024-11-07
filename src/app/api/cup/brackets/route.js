import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  SPORTRADAR_API_KEY,
  BASE_URL,
  handleError,
  validateId,
} from '@/utils/sportradar';

export const GET = async (request) => {
  try {
    // Input validation
    if (!request?.url) {
      throw new Error('Invalid request URL');
    }

    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('bracketsId');

    const requestId = tournamentId?.toString().split(':').pop();

    // Validate tournamentId
    validateId(requestId, 'Tournament');

    // Add timeout and retry logic
    const fetchBrackets = async (retries = 2) => {
      const url = `${BASE_URL}/stats_cup_brackets/gm-${requestId}${SPORTRADAR_API_KEY}`;

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: SPORTRADAR_HEADERS,
            timeout: 5000, // 5 second timeout
          });
          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
      }
    };

    const data = await fetchBrackets();

    // Return response with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Expires: '-1',
        Pragma: 'no-cache',
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
