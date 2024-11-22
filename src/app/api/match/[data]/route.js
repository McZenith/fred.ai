import { NextResponse } from 'next/server';
import { getMatchData } from '@/utils/redis';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchDate = searchParams.get('matchDate');

    // Get list of match IDs for the date
    const matchIds = await getMatchData(`date:${matchDate}`);

    if (!matchIds) {
      return NextResponse.json({ matches: [] });
    }

    // Fetch all matches for the date
    const matches = await Promise.all(
      matchIds.map(async (id) => {
        return getMatchData(`match:${matchDate}:${id}`);
      })
    );

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
