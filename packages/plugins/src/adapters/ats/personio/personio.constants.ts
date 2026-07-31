/** Personio public XML feed URL patterns (slug interpolated at runtime) */
export const PERSONIO_XML_URL_DE = 'https://{slug}.jobs.personio.de/xml';
export const PERSONIO_XML_URL_COM = 'https://{slug}.jobs.personio.com/xml';

/** Base URL for constructing job detail links */
export const PERSONIO_JOB_URL_DE = 'https://{slug}.jobs.personio.de/job';
export const PERSONIO_JOB_URL_COM = 'https://{slug}.jobs.personio.com/job';

/** Default headers for Personio XML requests */
export const PERSONIO_HEADERS: Record<string, string> = {
  Accept: 'application/xml, text/xml',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

/** Personio official API endpoints */
export const PERSONIO_API_AUTH_URL = 'https://api.personio.de/v1/auth';
export const PERSONIO_API_POSITIONS_URL =
  'https://api.personio.de/v1/recruiting/positions';
