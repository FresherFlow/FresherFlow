/**
 * iCIMS is a JS-rendered SPA that requires Playwright for reliable scraping.
 *
 * Company slug format: subdomain (e.g., `facebook`)
 * Search URL: https://{company}.icims.com/jobs/search?ss=1&searchKeyword={term}&searchLocation={location}
 * Gateway JSON URL: https://{company}.icims.com/jobs/search?pr=0&schemaId=&o={offset}&mode=job&iis=Internet
 * Page size: 20
 * Delay: 3000-5000ms
 */

/** Default page size for iCIMS pagination */
export const ICIMS_PAGE_SIZE = 20;

/** Minimum delay between iCIMS requests (ms) */
export const ICIMS_DELAY_MIN = 3000;

/** Maximum delay between iCIMS requests (ms) */
export const ICIMS_DELAY_MAX = 5000;

/** Default headers for iCIMS gateway requests */
export const ICIMS_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/html, */*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

/**
 * Build the iCIMS search page URL (used for Playwright fallback).
 */
export function buildIcimsSearchUrl(
  company: string,
  keyword?: string,
  location?: string,
  page?: number,
): string {
  const base = `https://${company}.icims.com/jobs/search`;
  const params = new URLSearchParams();
  params.set('ss', '1');
  if (keyword) params.set('searchKeyword', keyword);
  if (location) params.set('searchLocation', location);
  if (page && page > 1) {
    params.set('pr', String((page - 1) * ICIMS_PAGE_SIZE));
  }
  return `${base}?${params.toString()}`;
}

/**
 * Build the iCIMS gateway JSON endpoint URL (tried first before Playwright).
 */
export function buildIcimsGatewayUrl(company: string, offset: number): string {
  const params = new URLSearchParams();
  params.set('pr', String(offset));
  params.set('schemaId', '');
  params.set('o', String(offset));
  params.set('mode', 'job');
  params.set('iis', 'Internet');
  return `https://${company}.icims.com/jobs/search?${params.toString()}`;
}
