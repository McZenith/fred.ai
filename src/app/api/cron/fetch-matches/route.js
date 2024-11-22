import { NextResponse } from 'next/server';
import { saveMatchData, getMatchData } from '@/utils/redis';

export async function GET() {
  try {
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get day after tomorrow
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];

    // Fetch matches for tomorrow and day after
    const response = await fetch('/api/getUpcomingData', {
      cache: 'no-store',
    });
    const result = await response.json();

    if (!result?.data) {
      return;
    }

    let flattenedData = [];

    if (Array.isArray(result.data)) {
      flattenedData = result.data
        .filter((tournament) => tournament && tournament.events)
        .flatMap((tournament) => {
          return Array.isArray(tournament.events)
            ? tournament.events.map((event) =>
                processMatchData({
                  ...event,
                  tournamentName: tournament.name || 'Unknown Tournament',
                })
              )
            : [];
        });
    } else if (result.data?.tournaments) {
      flattenedData = (result.data.tournaments || [])
        .filter((tournament) => tournament && tournament.events)
        .flatMap((tournament) => {
          return Array.isArray(tournament.events)
            ? tournament.events.map((event) =>
                processMatchData({
                  ...event,
                  tournamentName: tournament.name || 'Unknown Tournament',
                })
              )
            : [];
        });
    }
    const matches = flattenedData;

    // Process and save matches by date
    for (const match of matches.data) {
      const matchDate = new Date(match.startTime).toISOString().split('T')[0];

      if (matchDate === tomorrowStr || matchDate === dayAfterTomorrowStr) {
        // Save with date-based key for easy retrieval
        await saveMatchData(`match:${matchDate}:${match.id}`, match);

        // Also save to a date-index for easy listing
        const dateIndex = (await getMatchData(`date:${matchDate}`)) || [];
        if (!dateIndex.includes(match.id)) {
          dateIndex.push(match.id);
          await saveMatchData(`date:${matchDate}`, dateIndex);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error fetching/saving matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch/save matches' },
      { status: 500 }
    );
  }
}
