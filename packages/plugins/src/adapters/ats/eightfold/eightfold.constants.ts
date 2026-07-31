/**
 * Constants for the Eightfold AI ("PCSX" / SmartApply) careers platform.
 *
 * Eightfold powers the careers sites of many large enterprises. Every tenant
 * exposes the same public positions API under one of two host shapes:
 *   - `https://{slug}.eightfold.ai`           — Eightfold-hosted (most tenants)
 *   - a custom apply domain (e.g. `https://apply.careers.<company>.com`)
 *
 * We default to the public SmartApply endpoint `/api/apply/v2/jobs`, which
 * returns `{ positions: [...], count: <total> }` and is reachable without
 * auth across tenants. The PCSX search endpoint `/api/pcsx/search` is the
 * documented alternative; we keep its path here for completeness.
 */

/** Host template for Eightfold-hosted tenants; `{slug}` is substituted at runtime. */
export const EIGHTFOLD_HOST_TEMPLATE = 'https://{slug}.eightfold.ai';

/** Public SmartApply positions endpoint path (primary). */
export const EIGHTFOLD_JOBS_PATH = '/api/apply/v2/jobs';

/** PCSX search endpoint path (documented alternative). */
export const EIGHTFOLD_PCSX_SEARCH_PATH = '/api/pcsx/search';

/**
 * Server-fixed page size. Eightfold caps each positions response at 10
 * regardless of the requested `num`/`size`; pagination is via `start`.
 */
export const EIGHTFOLD_PAGE_SIZE = 10;

/** Maximum number of position pages to fetch concurrently per tenant. */
export const EIGHTFOLD_MAX_CONCURRENCY = 8;

/** Delay (ms) between sequential pagination rounds, to stay polite. */
export const EIGHTFOLD_REQUEST_DELAY_MS = 300;

/** Default request headers. Eightfold expects a browser-like UA + JSON accept. */
export const EIGHTFOLD_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};
