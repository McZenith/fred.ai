import axios from 'axios';
import { NextResponse } from 'next/server';

// Create axios instance with default config
const api = axios.create({
  timeout: 10000, // 10 seconds
  headers: {
    Connection: 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.customMessage = 'Request timed out';
    } else if (!error.response) {
      error.customMessage = 'Network error occurred';
    } else {
      error.customMessage = error.response.data?.message || 'Server error occurred';
    }
    return Promise.reject(error);
  }
);

const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      const backoffTime =
        attempt > 0 ? Math.min(1000 * Math.pow(2, attempt) + jitter, 10000) : 0;

      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }

      const response = await api.get(url, {
        ...options,
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      return response.data;
    } catch (error) {
      lastError = error;

      // Don't retry on certain status codes
      if (error.response?.status === 404 || error.response?.status === 403) {
        throw error;
      }

      // Log retry attempts in development
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `Retry attempt ${attempt + 1} failed:`,
          error.customMessage
        );
      }

      // If it's the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const GET = async () => {
  try {
    // Add cache busting timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://www.sportybet.com/api/ng/factsCenter/liveOrPrematchEvents?sportId=sr%3Asport%3A1&_t=${timestamp}`;

    // Custom error for invalid URL
    if (!url) {
      throw new Error('Invalid URL configuration');
    }

    const data = await fetchWithRetry(url, {
      validateStatus: (status) => status === 200, // Only accept 200 status
    });

    // Validate response data
    if (!data) {
      throw new Error('Invalid response data');
    }

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Expires: '-1',
        Pragma: 'no-cache',
        // Add CORS headers if needed
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error) {
    // Enhanced error handling
    const errorResponse = {
      message: 'Error fetching data',
      code: error.code,
      status: error.response?.status || 500,
      detail:
        process.env.NODE_ENV === 'development'
          ? {
              message: error.customMessage || error.message,
              stack: error.stack,
            }
          : undefined,
    };

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        stack: error.stack,
      });
    }

    return NextResponse.json(errorResponse, {
      status: error.response?.status || 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  }
};

// Add dynamic config
export const dynamic = 'force-dynamic';
export const revalidate = 0;