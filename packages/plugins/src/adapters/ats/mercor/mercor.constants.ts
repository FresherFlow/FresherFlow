/**
 * Spec 013 / T05 — Mercor constants.
 *
 * Values mirror the upstream Python client
 * (`OTHERS/Ats-scrapers/mercor/api_client.py`) so a future contributor
 * can `git diff` the two and convince themselves the wire format
 * matches: literal `Authorization: Bearer` (empty token) header, fixed
 * explore-page endpoint, browser-shaped UA + `Accept` header set, and
 * the `https://work.mercor.com` origin/referer pair the API rejects
 * requests without.
 */

/** Base URL for the Mercor API host. Matches upstream Python's `MercorClient.BASE_URL`. */
export const MERCOR_API_BASE_URL = 'https://aws.api.mercor.com';

/** Path component for the explore-page endpoint (catalogue-wide single GET — Spec 013 / FR-6). */
export const MERCOR_EXPLORE_PATH = '/work/listings-explore-page';

/** Public-site origin for the candidate-experience UI. Used both as `Origin`/`Referer` headers AND as the base for constructed `JobPostDto.jobUrl` values. */
export const MERCOR_PUBLIC_ORIGIN = 'https://work.mercor.com';

/** Ceiling on jobs returned when `input.resultsWanted` is unset. */
export const MERCOR_DEFAULT_RESULTS_WANTED = 100;

/**
 * Headers used on every Mercor request. Matches upstream Python's
 * `MercorClient.session.headers` exactly — including the literal
 * `Authorization: Bearer` (empty token) string per Spec 013 / FR-8 and
 * the `x-client-ip: true` flag the API gateway uses for client IP
 * forwarding when traffic is proxied.
 */
export const MERCOR_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Authorization: 'Bearer',
  Origin: MERCOR_PUBLIC_ORIGIN,
  Referer: `${MERCOR_PUBLIC_ORIGIN}/`,
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'X-Client-IP': 'true',
};

/**
 * Sentinel error code (Spec 013 / § 7.3 / FR-7). Recorded via
 * `Logger.warn` when the explore-page response is missing the
 * `listings[]` envelope (typical of a backend deploy in flight or an
 * upstream auth-shape change). NOT thrown — `scrape()` always resolves
 * with an empty `JobResponseDto` per FR-12 / `AGENTS.md §10`.
 */
export const MERCOR_ERR_ENVELOPE = 'ERR_MERCOR_ENVELOPE';

/**
 * Sentinel error code recorded when the underlying HTTP request fails
 * (network error, 5xx, etc.). Same disposition as
 * `MERCOR_ERR_ENVELOPE` — caught + logged, never thrown.
 */
export const MERCOR_ERR_FETCH_FAILED = 'ERR_MERCOR_FETCH_FAILED';
