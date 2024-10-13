// pages/api/predictOver1_5Goals.js
import axios from 'axios';
import { NextResponse } from 'next/server';

export default async function GET(req) {
  try {
    const { liveMatches, upcomingMatches } = req.body; // Expect an array of matches from the client
    const { SPORTMONKS_API_KEY } = process.env;

    let predictions = [];

    for (let match of [...liveMatches, ...upcomingMatches]) {
      const fixtureId = match.eventId;

      // Fetch probabilities for each fixture
      const probabilitiesResponse = await axios.get(
        `https://api.sportmonks.com/v3/football/predictions/probabilities/fixtures/${fixtureId}?api_token=${SPORTMONKS_API_KEY}`
      );

      const probabilities = probabilitiesResponse.data.data;

      // Extract Over 1.5 goals prediction
      const overUnderPrediction = probabilities.find(
        (p) => p.type && p.type.name === 'Over/Under'
      );

      if (overUnderPrediction) {
        const over1_5 = overUnderPrediction.predictions?.find(
          (pred) => pred.desc === 'Over 1.5'
        );

        if (over1_5) {
          const isHighProbability = parseFloat(over1_5.probability) > 0.6;

          predictions.push({
            fixtureId,
            match,
            probability: parseFloat(over1_5.probability),
            isHighProbability,
          });
        }
      }
    }

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('Error predicting over 1.5 goals:', error);
    return NextResponse.json(
      { error: 'Failed to predict over 1.5 goals' },
      { status: 500 }
    );
  }
}
