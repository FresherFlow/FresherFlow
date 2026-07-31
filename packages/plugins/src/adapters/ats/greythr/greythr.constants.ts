/**
 * Constants for the greytHR (greytHR Recruit) careers platform.
 *
 * greytHR (greythr.com, by Greytip Software — India's largest cloud HR & Payroll suite,
 * 23,000+ organisations) powers each customer tenant's branded, public,
 * unauthenticated candidate-facing careers board on the shared host, addressed by the
 * tenant's company slug as a sub-domain of the root domain:
 *
 *   https://{tenant}.greythr.com/hire/jobs/                 (careers-board SPA shell)
 *   https://{tenant}.greythr.com/hire/jobs/{slug}           (per-role public detail / apply page)
 *
 * The careers board itself is a client-rendered single-page app (a `<div id="app">`
 * hydrated by a Semantic-UI bundle), so the open roles are NOT embedded in the landing
 * HTML. Instead the SPA fetches the full published-role set from a **public, anonymous**
 * JSON endpoint on the same host:
 *
 *   POST https://{tenant}.greythr.com/hire/api/career/published_jobs/
 *        body: {}  (an empty JSON object)
 *        → { "data": [ { …role… }, … ] }
 *
 * (The endpoint is a Django-REST view that rejects GET with HTTP 405 and answers POST;
 * the SPA's jQuery layer prefixes every API path with `/hire`, hence the `/hire/api/...`
 * absolute path.) The adapter calls that endpoint, reads `data`, and maps each role —
 * rather than scraping a client-rendered DOM, driving a headless browser, or using the
 * authenticated OAuth2 `api.greythr.com` REST API.
 *
 * Each role carries a UUID `id` (the stable ATS id), a `title`, a `slug`, a human
 * requisition `req_id`, `created_at` / `published_on_career_page` ISO timestamps, a
 * `locations` array of opaque numeric location-id strings (not human-readable in the
 * anonymous payload), an HTML `description`, a `job_type` (employment type, e.g.
 * `Full-time`), an `is_remote` boolean, a `designation` (role-family label), and a
 * fully-built public `apply_url` (`https://{tenant}.greythr.com/hire/jobs/{slug}`).
 *
 * The caller addresses a tenant by `companySlug` (e.g. `greytip`) or by `companyUrl` (a
 * careers-site URL on a `greythr.com` host whose leading sub-domain label is the tenant).
 * An unknown tenant, one with no open roles, or an empty board degrades naturally to an
 * empty result. A fetch error, an HTTP 4xx/5xx, a DNS failure, or a malformed body
 * degrades to an empty / partial result rather than throwing, so a single bad tenant
 * never nukes a batch run.
 *
 * Surface confidence (researched + verified live 2026-06-03, no authentication):
 *  - Confirmed the platform + tenant addressing (`{tenant}.greythr.com/hire/jobs/`) and
 *    real, named tenants on it: `greytip` (Greytip Software Pvt. Ltd. — multiple live
 *    roles) and `fint` (FINT Solutions Pvt. Ltd. — 2 live roles).
 *  - Confirmed the SPA fetches the full published-role set from the anonymous endpoint
 *    `POST /hire/api/career/published_jobs/` (body `{}`) which returns `{ data: [ … ] }`,
 *    each role carrying a UUID `id`, `title`, `slug`, HTML `description`, `job_type`,
 *    `is_remote`, and a server-built `apply_url` whose detail page (`/hire/jobs/{slug}`)
 *    returned HTTP 200. verified=true.
 */

/** Root domain — used to recognise tenant hosts / URLs passed via `companyUrl`. */
export const GREYTHR_ROOT_DOMAIN = 'greythr.com';

/** Hosted careers host suffix — tenant sites live at `{tenant}.greythr.com`. */
export const GREYTHR_CAREER_HOST_SUFFIX = '.greythr.com';

/** Builds a tenant's careers-site origin from its slug. */
export const greythrCareerOrigin = (tenant: string): string =>
  `https://${tenant}${GREYTHR_CAREER_HOST_SUFFIX}`;

/**
 * Public, anonymous published-roles endpoint path (relative to the tenant origin). The
 * greytHR Recruit careers SPA POSTs an empty JSON body here and reads `data`. It is a
 * Django-REST view: GET is rejected with HTTP 405, POST returns the role array.
 */
export const GREYTHR_PUBLISHED_JOBS_PATH = '/hire/api/career/published_jobs/';

/**
 * Candidate-facing per-role detail/apply path prefix on the tenant origin
 * (`/hire/jobs/{slug}`). Used only as a fallback when a role omits the server-built
 * `apply_url`; the API normally supplies a fully-qualified `apply_url`.
 */
export const GREYTHR_JOB_PATH = '/hire/jobs';

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: when a caller omits
 * `resultsWanted` entirely we ingest up to 100 of the tenant's open roles.
 */
export const GREYTHR_DEFAULT_RESULTS = 100;

/**
 * Upper bound (seconds) on the per-request HTTP timeout. An unresponsive greytHR careers
 * host can connect-then-hang (an unknown tenant's wildcard host resolves but the app
 * stalls), so we cap the shared client's 60s default to keep graceful-degradation well
 * inside callers' budgets; a healthy tenant responds in well under a second. A caller may
 * request a SHORTER timeout — we only bound the upper end.
 */
export const GREYTHR_DEFAULT_TIMEOUT_SECONDS = 15;

/**
 * Default request headers. The published-roles endpoint is a JSON POST; we send a JSON
 * Accept + Content-Type, a browser-like UA, and the XHR marker the SPA itself sends.
 */
export const GREYTHR_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
};

/** Empty JSON body the published-roles POST expects (the SPA sends `{}`). */
export const GREYTHR_PUBLISHED_JOBS_BODY: Record<string, never> = {};

/**
 * Detects remote / home-working roles from the textual fields (title / designation),
 * complementing the structured `is_remote` boolean the API supplies.
 */
export const GREYTHR_REMOTE_REGEX =
  /\b(remote|home[\s-]?office|work\s*from\s*home|wfh|fully\s*remote|anywhere)\b/i;
