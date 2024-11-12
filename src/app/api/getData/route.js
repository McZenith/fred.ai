import axios from 'axios';
import { NextResponse } from 'next/server';

export const GET = async () => {
  try {
    const timestamp = Math.floor(Date.now() / 1000); // Dynamic timestamp
    const url = `https://www.sportybet.com/api/ng/factsCenter/liveOrPrematchEvents?sportId=sr%3Asport%3A1&_t=${timestamp}`;

    const headers = {
      Connection: 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded',
      // Cookie moved to separate constant for clarity and should be in env variables
    };

    // Add timeout and retry logic
    const fetchWithRetry = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url, {
            headers,
            timeout: 5000, // 5 second timeout
          });
          return response.data;
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
      }
    };

    const data = await fetchWithRetry();

    // Cache headers for better client-side caching
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
    return NextResponse.json(
      {
        message: 'Error fetching data',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      {
        status: error.response?.status || 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
};

export const revalidate = 0;

