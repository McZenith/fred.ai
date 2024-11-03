export const MATCH_PERIODS = {
  FIRST_HALF: 'firstHalf',
  SECOND_HALF: 'secondHalf',
  HALF_TIME: 'halftime',
};

export const filterOptions = [
  { value: 'asc', label: 'Sort by Time: Ascending', isDefault: false },
  { value: 'desc', label: 'Sort by Time: Descending', isDefault: true },
  { value: 'over1.5', label: 'Over 1.5 (Probability)', isDefault: false },
  { value: 'over2.5', label: 'Over 2.5 (Probability)', isDefault: false },
  { value: 'over3.5', label: 'Over 3.5 (Probability)', isDefault: false },
  {
    value: 'highProbability',
    label: 'High Probability Matches',
    isDefault: false,
  },
  { value: 'firstHalf', label: 'First Half', isDefault: false },
  { value: 'secondHalf', label: 'Second Half', isDefault: false },
  { value: 'halftime', label: 'Half Time', isDefault: false },
  { value: 'inCart', label: 'In Cart', isDefault: false },
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
