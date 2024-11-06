export const MATCH_PERIODS = {
  FIRST_HALF: 'firstHalf',
  SECOND_HALF: 'secondHalf',
  HALF_TIME: 'halftime',
};

// In utils/constants.js
export const filterOptions = [
  { value: 'desc', label: 'Latest First', isDefault: true },
  { value: 'asc', label: 'Oldest First' },
  { value: 'firstHalf', label: '1st Half' },
  { value: 'secondHalf', label: '2nd Half' },
  { value: 'halftime', label: 'Half Time' },
  { value: 'highProbability', label: 'High Probability' },
  { value: 'inCart', label: 'In Cart' },
  { value: 'over1.5', label: 'Over 1.5' },
  { value: 'over2.5', label: 'Over 2.5' },
  { value: 'over3.5', label: 'Over 3.5' },
];

export const FILTER_GROUPS = {
  HALF: ['firstHalf', 'secondHalf', 'halftime'],
  SORT: ['asc', 'desc'],
  PROBABILITY: ['over1.5', 'over2.5', 'over3.5', 'highProbability'],
  CART: ['inCart'],
};

export const REFRESH_INTERVALS = {
  LIVE_DATA: 1000,
  UPCOMING_DATA: 60000,
};

export const PROBABILITY_THRESHOLD = 0.7;

export const LOCAL_STORAGE_KEYS = {
  CART: 'matchCart',
};
