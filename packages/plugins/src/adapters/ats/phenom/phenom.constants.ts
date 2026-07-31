/**
 * Default URL pattern template for Phenom career sites.
 * The companySlug is substituted at runtime.
 */
export const PHENOM_BASE_URL_TEMPLATE = 'https://jobs.{companySlug}.com/api/jobs';

/** Default headers for Phenom API requests */
export const PHENOM_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Default page size for paginated requests */
export const PHENOM_PAGE_SIZE = 25;

/** Delay in milliseconds between pagination requests */
export const PHENOM_REQUEST_DELAY_MS = 500;
