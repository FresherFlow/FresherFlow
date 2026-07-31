export const MICROSOFT_BASE_URL = 'https://apply.careers.microsoft.com';
export const MICROSOFT_SEARCH_ENDPOINT = `${MICROSOFT_BASE_URL}/api/pcsx/search`;

export const MICROSOFT_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0',
};

export const MICROSOFT_PAGE_SIZE = 10;
export const MICROSOFT_REQUEST_DELAY_MS = 500;
