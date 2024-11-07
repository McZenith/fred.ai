// app/api/team/versus/route.js
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
    const team1Idtemp = searchParams.get('teamId1');
    const team2Idtemp = searchParams.get('teamId2');

    const team1Id = team1Idtemp.toString().split(':').pop();
    const team2Id = team2Idtemp.toString().split(':').pop();

    // Validate both team IDs
    validateId(team1Id, 'Team 1');
    validateId(team2Id, 'Team 2');

    const fetchVersusData = async (retries = 2) => {
      const url = `${BASE_URL}/stats_team_versusrecent/${team1Id}/${team2Id}${SPORTRADAR_API_KEY}`;

      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers: SPORTRADAR_HEADERS,
            timeout: 5000, // 5 second timeout
            validateStatus: (status) => status === 200,
          });

          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    const data = await fetchVersusData();

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);

    // Log errors in production with rate limiting
    if (process.env.NODE_ENV === 'production') {
      logError('team-versus', error, {
        team1Id: searchParams?.get('team1Id'),
        team2Id: searchParams?.get('team2Id'),
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

// Error logging with rate limiting
const errorLogs = new Map();
const ERROR_LOG_LIMIT = 5; // Max errors per minute per endpoint

const logError = (endpoint, error, context) => {
  const now = Date.now();
  const key = `${endpoint}-${Math.floor(now / 60000)}`; // Key by minute

  const currentCount = errorLogs.get(key) || 0;
  if (currentCount < ERROR_LOG_LIMIT) {
    console.error(`${endpoint} API Error:`, {
      ...context,
      error: error.message,
      timestamp: new Date(now).toISOString(),
    });
    errorLogs.set(key, currentCount + 1);
  }
};

export const revalidate = 0;
