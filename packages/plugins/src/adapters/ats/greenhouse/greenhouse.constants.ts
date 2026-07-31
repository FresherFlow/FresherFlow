/** Greenhouse public job board API base URL */
export const GREENHOUSE_API_URL = 'https://api.greenhouse.io/v1/boards';

/** Greenhouse Harvest (authenticated) API base URL */
export const GREENHOUSE_HARVEST_API_URL = 'https://harvest.greenhouse.io/v1';

/** Default headers for Greenhouse API requests */
export const GREENHOUSE_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};
