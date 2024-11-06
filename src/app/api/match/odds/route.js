// app/api/match/odds/route.js
import axios from 'axios';
import { NextResponse } from 'next/server';
import {
  SPORTRADAR_HEADERS,
  BASE_URL,
  handleError,
  validateId,
  SPORTRADAR_API_KEY,
} from '@/utils/sportradar';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    validateId(matchId, 'Match');

    const response = await axios.get(
      `${BASE_URL}/match_bookmakerodds/${matchId}${SPORTRADAR_API_KEY}`,
      { headers: SPORTRADAR_HEADERS }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.code });
  }
}

export const revalidate = 0;
