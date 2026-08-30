export const GETRO_API_URL = 'https://api.getro.com/api/v2';

export const GETRO_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export const GETRO_DEFAULT_TIMEOUT = 25000;
export const GETRO_MAX_RETRIES = 3;
export const GETRO_RETRY_BACKOFF = 1000;
