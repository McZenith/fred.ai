import { enrichMatch } from '@/utils/matchEnricher';
// matchWorker.js
self.onmessage = async (e) => {
  const { match, type } = e.data;
  try {
    const enrichedData = await enrichMatch[type](match);
    self.postMessage({ matchId: match.eventId, data: enrichedData });
  } catch (error) {
    self.postMessage({ matchId: match.eventId, error: error.message });
  }
};
