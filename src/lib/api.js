export const API_ROUTES = {
  MATCH_INFO: '/api/match/info',
  MATCH_TIMELINE: '/api/match/timeline',
  MATCH_TIMELINE_DELTA: '/api/match/timelinedelta',
  MATCH_SITUATION: '/api/match/situation',
  MATCH_DETAILS: '/api/match/details',
  SEASON_META: '/api/season/meta',
  CUP_BRACKETS: '/api/cup/brackets',
  MATCH_PHRASES: '/api/match/phrases',
  MATCH_ODDS: '/api/match/odds',
  MATCH_SQUADS: '/api/match/squads',
  TEAM_VERSUS: '/api/team/versus',
  TEAM_FORM: '/api/team/form',
};

export const sportRadarApi = {
  async getMatchInfo(matchId) {
    const response = await fetch(`${API_ROUTES.MATCH_INFO}?matchId=${matchId}`);
    return response.json();
  },

  async getMatchTimeline(matchId) {
    const response = await fetch(
      `${API_ROUTES.MATCH_TIMELINE}?matchId=${matchId}`
    );
    return response.json();
  },

  async getMatchTimelineDelta(matchId) {
    const response = await fetch(
      `${API_ROUTES.MATCH_TIMELINE_DELTA}?matchId=${matchId}`
    );
    return response.json();
  },

  async getMatchSituation(matchId) {
    const response = await fetch(
      `${API_ROUTES.MATCH_SITUATION}?matchId=${matchId}`
    );
    return response.json();
  },

  async getMatchDetails(matchId) {
    const response = await fetch(
      `${API_ROUTES.MATCH_DETAILS}?matchId=${matchId}`
    );
    return response.json();
  },

  async getSeasonMeta(seasonId) {
    const response = await fetch(
      `${API_ROUTES.SEASON_META}?seasonId=${seasonId}`
    );
    return response.json();
  },

  async getCupBrackets(cupId) {
    const response = await fetch(`${API_ROUTES.CUP_BRACKETS}?cupId=${cupId}`);
    return response.json();
  },
};

// React hook for live match data
export const useLiveMatch = (matchId, interval = 1000) => {
  const [matchData, setMatchData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timeoutId;

    const fetchData = async () => {
      try {
        const [info, situation, timeline] = await Promise.all([
          sportRadarApi.getMatchInfo(matchId),
          sportRadarApi.getMatchSituation(matchId),
          sportRadarApi.getMatchTimelineDelta(matchId),
        ]);

        setMatchData({ info, situation, timeline });
        setIsLoading(false);
      } catch (err) {
        setError(err);
        setIsLoading(false);
      }

      timeoutId = setTimeout(fetchData, interval);
    };

    fetchData();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [matchId, interval]);

  return { matchData, isLoading, error };
};
