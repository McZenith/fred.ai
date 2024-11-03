import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const version = 'v3';
    const perPage = 25;

    // Your Sportmonks API token should be stored in environment variables
    const API_TOKEN = process.env.SPORTMONKS_API_KEY;

    let currentPage = 1;
    let hasMore = true;
    const allTypes = [];

    // Keep fetching while there are more pages
    while (hasMore) {
      const url = `https://api.sportmonks.com/${version}/core/types`;

      const response = await axios.get(url, {
        headers: {
          authorization: API_TOKEN,
          Accept: 'application/json',
        },
        params: {
          page: currentPage,
          per_page: perPage,
        },
      });

      // Add types from current page to our collection
      const types = response.data.data || [];
      allTypes.push(...types);

      // Check pagination info
      const pagination = response.data.pagination;
      hasMore = pagination.has_more;
      currentPage++;

      // Optional: Add a small delay to avoid hitting rate limits
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Construct the final response object
    const finalResponse = {
      status: 'success',
      data: {
        total: allTypes.length,
        types: allTypes,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    // Send the accumulated response data back to the client
    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error('Error fetching Sportmonks types:', error);

    // Enhanced error handling with more specific error messages
    const errorMessage = error.response?.data?.message || 'Error fetching data';
    const statusCode = error.response?.status || 500;

    return NextResponse.json(
      {
        status: 'error',
        message: errorMessage,
        code: statusCode,
      },
      { status: statusCode }
    );
  }
}

// Disable caching to always get fresh data
export const revalidate = 0;
