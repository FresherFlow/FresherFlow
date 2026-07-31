export const AMAZON_API_URL = 'https://www.amazon.jobs/api/jobs/search';

export const AMAZON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'Accept-Encoding': 'identity',
  'User-Agent': 'Mozilla/5.0',
};

export const AMAZON_PAGE_SIZE = 25;
export const AMAZON_MAX_RETRIES = 3;
export const AMAZON_REQUEST_DELAY_MS = 500;
