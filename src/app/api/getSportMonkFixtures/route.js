import axios from 'axios';
import { NextResponse } from 'next/server';

// Helper function to get today's date in YYYY-MM-DD format
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export async function GET() {
  try {
    const version = 'v3';
    const sport = 'football';
    const date = getTodayDate();
    const perPage = 25; // Based on the sample response

    const API_TOKEN = process.env.SPORTMONKS_API_KEY;

    let currentPage = 1;
    let hasMore = true;
    const allFixtures = [];

    // Keep fetching while there are more pages
    while (hasMore) {
      const url = `https://api.sportmonks.com/${version}/${sport}/fixtures/date/${date}`;

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

      // Add fixtures from current page to our collection
      const fixtures = response.data.data || [];
      allFixtures.push(...fixtures);

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
        total: allFixtures.length,
        fixtures: allFixtures,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    // Send the accumulated response data back to the client
    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error('Error fetching Sportmonks data:', error);

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
