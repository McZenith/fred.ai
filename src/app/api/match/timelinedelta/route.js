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
            timeout: 2000,
            validateStatus: (status) => [200].includes(status),
          });

          return optimizeDeltaData(response.data);
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1)));
        }
      }
    };

    const data = await fetchTimelineDelta();

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
};

export const revalidate = 0;
