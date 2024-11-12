// app/api/team/form/route.js
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
    const teamIdtemp = searchParams.get('teamId');

    const teamId = teamIdtemp.toString().split(':').pop();

    // Validate teamId
    validateId(teamId, 'Team');

    const fetchTeamForm = async (retries = 2) => {
      const url = `${BASE_URL}/stats_team_lastx/${teamId}${SPORTRADAR_API_KEY}`;
      const timestamp = Date.now();

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: {
              ...SPORTRADAR_HEADERS,
              'If-None-Match': `"${teamId}-${timestamp}"`,
            },
            timeout: 5000, // 5 second timeout
            validateStatus: (status) => [200, 304].includes(status),
          });

          // Optimize form data
          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    const data = await fetchTeamForm();

    // Return response without cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    // Log errors in production with rate limiting
    if (process.env.NODE_ENV === 'production') {
      logError('team-form', error, searchParams?.get('teamId'));
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
