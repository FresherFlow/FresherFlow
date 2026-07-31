/** Ashby API base URL */
export const ASHBY_API_URL = 'https://api.ashbyhq.com/posting-api/job-board';

/**
 * Query string that opts the job-board endpoint into serializing the
 * `compensation` payload. Without it, the public (unauthenticated) API
 * omits compensation entirely (live probe 2026-06-11: ramp board returned
 * 0/110 jobs with compensation without the param, 110/110 with it).
 */
export const ASHBY_INCLUDE_COMPENSATION_QUERY = 'includeCompensation=true';

/** Maximum number of retries (after the initial attempt) for the public GET. */
export const ASHBY_PUBLIC_MAX_RETRIES = 2;

/**
 * Exponential-backoff parameters for the public GET retry:
 * delay = baseDelayMs * 2^attempt + random(0..jitterMaxMs).
 *
 * Deliberately a mutable object (not frozen) so unit tests can shrink the
 * delays to ~1 ms and restore them afterwards.
 */
export const ASHBY_RETRY_BACKOFF = {
  baseDelayMs: 1000,
  jitterMaxMs: 500,
};

/** Default headers for Ashby API requests */
export const ASHBY_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};
