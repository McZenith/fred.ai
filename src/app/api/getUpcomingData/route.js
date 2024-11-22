import axios from 'axios';
import { NextResponse } from 'next/server';

// Create axios instance with default config
const api = axios.create({
  timeout: 15000, // 15 seconds
  headers: {
    Connection: 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

// Fetch with retry logic
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const jitter = Math.random() * 1000;
      const backoffTime = attempt > 0 ? Math.min(1000 * Math.pow(2, attempt) + jitter, 10000) : 0;
      
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }

      const response = await api.get(url, options);
      return response.data;
    } catch (error) {
      lastError = error;
      
      if (error.response?.status === 404 || error.response?.status === 403) {
        throw error;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Retry attempt ${attempt + 1} for URL ${url} failed:`, error.message);
      }

      if (attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw lastError;
};

// Chunk array to manage concurrent requests
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const GET = async () => {
  try {
    const pageSize = 100;
    const pageLimit = 9;
    const timestamp = Math.floor(Date.now() / 1000);
    const concurrentRequests = 3; // Number of concurrent requests

    const createUrl = (pageNum) =>
      `https://www.sportybet.com/api/ng/factsCenter/pcUpcomingEvents?sportId=sr%3Asport%3A1&marketId=1%2C18%2C19%2C20%2C10%2C29%2C11%2C26%2C36%2C14%2C60100&pageSize=${pageSize}&pageNum=${pageNum}&option=1&timeline=24&_t=${timestamp}`;
    // Create array of page numbers
    const pageNumbers = Array.from({ length: pageLimit }, (_, i) => i + 1);

    // Split into chunks for concurrent processing
    const chunks = chunkArray(pageNumbers, concurrentRequests);

    let allTournaments = [];
    let totalNum = 0;

    // Process chunks sequentially, but requests within chunks concurrently
    for (const chunk of chunks) {
      try {
        const chunkResponses = await Promise.all(
          chunk.map((pageNum) =>
            fetchWithRetry(createUrl(pageNum), {
              validateStatus: (status) => status === 200,
            }).catch((error) => {
              console.error(`Error fetching page ${pageNum}:`, error.message);
              return { data: { tournaments: [] } };
            })
          )
        );

        // Process responses
        chunkResponses.forEach((response, index) => {
          if (response?.data?.tournaments) {
            allTournaments = [...allTournaments, ...response.data.tournaments];
          }
          // Store totalNum from first successful response
          if (index === 0 && response?.data?.totalNum) {
            totalNum = response.data.totalNum;
          }
        });
      } catch (error) {
        console.error('Error processing chunk:', error);
        // Continue with next chunk even if current one fails
      }
    }

    // Deduplicate tournaments based on some unique identifier
    const uniqueTournaments = Array.from(
      new Map(allTournaments.map((t) => [t.id, t])).values()
    );

    const response = {
      bizCode: 10000,
      message: '0#0',
      data: {
        totalNum: totalNum || uniqueTournaments.length,
        tournaments: uniqueTournaments,
      },
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Expires: '-1',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    const errorResponse = {
      bizCode: 50000,
      message: 'Internal server error',
      error:
        process.env.NODE_ENV === 'development'
          ? {
              message: error.message,
              stack: error.stack,
            }
          : undefined,
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        message: error.message,
        stack: error.stack,
      });
    }

    return new NextResponse(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};

// Add dynamic config
export const dynamic = 'force-dynamic';
export const revalidate = 0;