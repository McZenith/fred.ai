import { NextResponse } from 'next/server';
import axios from 'axios';
import { saveMatchesData } from '@/utils/redis';

export const GET = async () => {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? 'https://' + process.env.VERCEL_URL
      : 'http://localhost:3000';

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

    // Single call to save all matches
    await saveMatchesData(flattenedData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error fetching/saving matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch/save matches' },
      { status: 500 }
    );
  }
};
