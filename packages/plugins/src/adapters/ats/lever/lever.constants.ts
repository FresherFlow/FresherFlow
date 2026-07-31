/** Lever API base URL */
export const LEVER_API_URL = 'https://api.lever.co/v0/postings';

/** Default headers for Lever API requests */
export const LEVER_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

/** Delay between requests in milliseconds */
export const LEVER_DELAY_MS = 1000;
