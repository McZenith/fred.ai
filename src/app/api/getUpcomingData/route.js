import axios from 'axios';
import { NextResponse } from 'next/server';

export const GET = async () => {
  try {
    const pageSize = 100;
    const pageLimit = 9;
    const timestamp = Math.floor(Date.now() / 1000); // Dynamic timestamp

    // Create URL generator function to avoid repetition
    const createUrl = (pageNum) =>
      `https://www.sportybet.com/api/ng/factsCenter/pcUpcomingEvents?sportId=sr%3Asport%3A1&marketId=1%2C18%2C10%2C29%2C11%2C26%2C36%2C14%2C60100&pageSize=${pageSize}&pageNum=${pageNum}&option=1&timeline=24&_t=${timestamp}`;

    const headers = {
      Connection: 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded',
      // Cookie moved to separate constant for clarity
    };

    // Use Promise.all with map instead of manual array pushing
    const responses = await Promise.all(
      Array.from({ length: pageLimit }, (_, i) =>
        axios.get(createUrl(i + 1), { headers }).catch((err) => {
          console.error(`Failed to fetch page ${i + 1}:`, err.message);
          return { data: { data: { tournaments: [] } } }; // Fallback data
        })
      )
    );

    const allTournaments = responses.flatMap(
      (response) => response.data.data?.tournaments ?? []
    );

    const totalNum = responses[0]?.data.data?.totalNum ?? 0;

    return NextResponse.json({
      bizCode: 10000,
      message: '0#0',
      data: {
        totalNum,
        tournaments: allTournaments,
      },
    });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
};

export const revalidate = 0;
