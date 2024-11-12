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
  const mainMarket = event.markets.find(
    (m) => m.id === '1' && m.desc === '1X2'
  );
  if (!mainMarket) return false;

  const highestProb = Math.max(
    ...mainMarket.outcomes.map((o) => parseFloat(o.probability))
  );

  return highestProb > 0.6; // 60% probability threshold
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

// Helper function to process match data
export const processMatchData = (event) => {
  const {
    eventId,
    homeTeamName,
    awayTeamName,
    estimateStartTime,
    status,
    playedSeconds,
    matchStatus,
    gameScore,
    markets,
    sport
  } = event;

  // Get the main 1X2 market
  const mainMarket = markets.find(m => m.id === '1' && m.desc === '1X2');
  
  // Get Over/Under markets
  const overUnderMarkets = markets.filter(m => 
    m.id === '18' && 
    m.desc === 'Over/Under'
  ).sort((a, b) => {
    const totalA = parseFloat(a.specifier.split('=')[1]);
    const totalB = parseFloat(b.specifier.split('=')[1]);
    return totalA - totalB;
  });

  return {
    id: eventId,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    startTime: estimateStartTime,
    status,
    playedTime: playedSeconds,
    matchStatus,
    score: gameScore,
    tournament: sport?.category?.tournament?.name || '',
    odds: mainMarket ? {
      home: mainMarket.outcomes.find(o => o.desc === 'Home')?.odds,
      draw: mainMarket.outcomes.find(o => o.desc === 'Draw')?.odds,
      away: mainMarket.outcomes.find(o => o.desc === 'Away')?.odds
    } : null,
    overUnder: overUnderMarkets.map(market => ({
      total: market.specifier.split('=')[1],
      over: market.outcomes.find(o => o.desc.includes('Over'))?.odds,
      under: market.outcomes.find(o => o.desc.includes('Under'))?.odds
    }))
  };
};
