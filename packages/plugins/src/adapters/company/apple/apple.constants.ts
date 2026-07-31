export const APPLE_BASE_URL = 'https://jobs.apple.com';
export const APPLE_API_BASE = `${APPLE_BASE_URL}/api/v1`;
export const APPLE_CSRF_ENDPOINT = `${APPLE_API_BASE}/CSRFToken`;
export const APPLE_SEARCH_ENDPOINT = `${APPLE_API_BASE}/search`;

export const APPLE_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  Origin: APPLE_BASE_URL,
  Referer: `${APPLE_BASE_URL}/en-us/search`,
  browserlocale: 'en-us',
  locale: 'EN_US',
};

export const APPLE_PAGE_SIZE = 20;
export const APPLE_REQUEST_DELAY_MS = 300;
