export const normalizeMatchPeriod = (period) => {
  if (!period) return null;
  period = period.toString().toLowerCase().trim();

  // First Half identifiers
  if (['1h', 'h1', 'first half', '1st', 'first', '1'].includes(period)) {
    return 'firstHalf';
  }
  // Second Half identifiers
  if (['2h', 'h2', 'second half', '2nd', 'second', '2'].includes(period)) {
    return 'secondHalf';
  }
  // Halftime identifiers
  if (['ht', 'half time', 'halftime'].includes(period)) {
    return 'halftime';
  }

  return period;
};

export const getMatchHalf = (event) => {
  if (!event) return null;

  // Check for halftime
  const status = (event.matchStatus || '').toLowerCase().trim();
  const period = (event.period || '').toLowerCase().trim();

  // Direct halftime checks
  if (
    ['ht', 'halftime', 'half time'].includes(status) ||
    ['ht', 'halftime', 'half time'].includes(period)
  ) {
    return 'halftime';
  }

  // First half checks
  if (
    period.includes('1st') ||
    period.includes('first') ||
    period === '1' ||
    period === '1h'
  ) {
    return 'firstHalf';
  }

  // Second half checks
  if (
    period.includes('2nd') ||
    period.includes('second') ||
    period === '2' ||
    period === '2h'
  ) {
    return 'secondHalf';
  }

  // Check played time if available
  if (event.playedSeconds) {
    let minutes = 0;

    if (typeof event.playedSeconds === 'string') {
      const [mins] = event.playedSeconds.split(':').map(Number);
      minutes = mins;
    } else if (typeof event.playedSeconds === 'number') {
      minutes = Math.floor(event.playedSeconds / 60);
    }

    if (!isNaN(minutes)) {
      if (minutes < 45) return 'firstHalf';
      if (minutes > 45) return 'secondHalf';
      if (minutes === 45) return 'halftime';
    }
  }

  // Check status text
  if (status.includes('1st') || status.includes('first')) return 'firstHalf';
  if (status.includes('2nd') || status.includes('second')) return 'secondHalf';

  return null;
};

export const isHighProbabilityMatch = (event) => {
  // Check if current goals are over 1
  const currentGoals = event.setScore
    ?.split(':')
    .reduce((a, b) => parseInt(a) + parseInt(b), 0) || 0;
  const isOverOneGoal = currentGoals > 1;

  // Check if it's first half
  const isFirstHalf = event.matchStatus === 'H1';

  // Check Over 1.5 market probability
  const over1_5Market = event.markets?.find(
    m => m.desc === 'Over/Under' && m.specifier === 'total=1.5'
  );
  const over1_5Probability = over1_5Market?.outcomes?.[0]?.probability
    ? parseFloat(over1_5Market.outcomes[0].probability) * 100
    : 0;
  const isHighOver1_5Probability = over1_5Probability > 70;

  return isOverOneGoal && isFirstHalf && isHighOver1_5Probability;
};

export const getOver1_5Market = (event) => {
  if (!Array.isArray(event?.markets)) return null;

  const market = event.markets.find((market) =>
    market.outcomes?.some((outcome) => outcome.desc === 'Over 1.5')
  );

  if (market) {
    const outcome = market.outcomes.find(
      (outcome) => outcome.desc === 'Over 1.5'
    );

    if (outcome && outcome.probability > 0.7) {
      return {
        marketName: market.name,
        odds: outcome.odds,
        probability: outcome.probability,
      };
    }
  }

  return null;
};

export const parseScore = (scoreString) => {
  if (!scoreString || typeof scoreString !== 'string') return 0;
  const scores = scoreString.split(':').map((s) => parseInt(s.trim(), 10));
  return scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
};

// Debug utilities
export const debug = {
  logMatchDetails: (event) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(
        `Match Details: ${event.homeTeamName} vs ${event.awayTeamName}`
      );
      console.log({
        period: event.period,
        normalizedPeriod: normalizeMatchPeriod(event.period),
        status: event.matchStatus,
        playedTime: event.playedSeconds,
        detectedHalf: getMatchHalf(event),
      });
      console.groupEnd();
    }
  },
};
