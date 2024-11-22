import { NextResponse } from 'next/server';
import axios from 'axios';
import { saveMatchData, getMatchData } from '@/utils/redis';

export const GET = async () => {
  try {
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get day after tomorrow
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];

    const baseUrl = process.env.VERCEL_URL
      ? 'https://' + process.env.VERCEL_URL
      : 'http://localhost:3000';

    // Fetch matches for tomorrow and day after
    const response = await axios.get(`${baseUrl}/api/getUpcomingData`, {
      cache: 'no-store',
    });
    const result = response.data;

    if (!result?.data) {
      return;
    }

    let flattenedData = [];

    if (Array.isArray(result.data)) {
      flattenedData = result.data
        .filter((tournament) => tournament && tournament.events)
        .flatMap((tournament) => {
          return Array.isArray(tournament.events)
            ? tournament.events.map((event) => ({
                ...event,
                tournamentName: tournament.name || 'Unknown Tournament',
              }))
            : [];
        });
    } else if (result.data?.tournaments) {
      flattenedData = (result.data.tournaments || [])
        .filter((tournament) => tournament && tournament.events)
        .flatMap((tournament) => {
          return Array.isArray(tournament.events)
            ? tournament.events.map((event) => ({
                ...event,
                tournamentName: tournament.name || 'Unknown Tournament',
              }))
            : [];
        });
    }

    const matches = flattenedData;

    // Process and save matches by date
    for (const match of matches) {
      const matchDate = new Date(match.estimateStartTime)
        .toISOString()
        .split('T')[0];

      if (matchDate === tomorrowStr || matchDate === dayAfterTomorrowStr) {
        // Save with date-based key for easy retrieval
        await saveMatchData(`match:${matchDate}:${match.eventId}`, match);
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
};
