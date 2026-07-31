/**
 * Constants for the Darwinbox applicant-tracking careers platform.
 *
 * Darwinbox (darwinbox.com) is a large, India-headquartered, end-to-end cloud
 * HRMS suite widely deployed across India and South-East Asia. Each customer
 * tenant publishes a branded, public careers portal on its own sub-domain of
 * the regional Darwinbox host:
 *
 *   https://{tenant}.darwinbox.in/ms/candidate/careers      (primary, India region)
 *   https://{tenant}.darwinbox.com/ms/candidate/careers     (global region)
 *
 * That portal is a single-page Angular application (it bootstraps an
 * `<app-root>` with `<base href="/ms/candidate/">`). The open roles are not
 * server-rendered into the HTML; the SPA hydrates them client-side by calling
 * the tenant's candidate backend, whose API base is exposed in the bundle as
 * `apiURL: "/ms/candidateapi/"`. That backend answers with a consistent JSON
 * envelope of the shape `{ "status": "success" | "error", "data": { ... } }`.
 *
 * The tenant is addressed by its sub-domain label (e.g. `dbox`), which the SPA
 * itself derives from `window.location` and forwards to the candidate API to
 * resolve the company / careers configuration before listing jobs. When a
 * caller supplies a human-friendly `companySlug` (the sub-domain label) or a
 * `companyUrl`, the adapter normalises it to that tenant label and queries the
 * candidate API; the careers portal URL is also used as a referer-style anchor.
 *
 * The candidate API returns the tenant's open roles in one response (the SPA
 * paginates client-side), so we fetch once and slice client-side to honour
 * `resultsWanted`. An unknown sub-domain, an HTTP 4xx, a bot-challenge
 * interstitial, or a malformed payload degrades to an empty (graceful) result
 * rather than throwing, so a single bad tenant never breaks a batch run.
 *
 * Live-verification note (2026-06-03, no authentication):
 *  - `GET https://dbox.darwinbox.in/ms/candidate/careers` → HTTP 200, an Angular
 *    SPA shell (`<app-root>`, `<base href="/ms/candidate/">`); the lazy careers
 *    chunk defines the candidate-API base `apiURL: "/ms/candidateapi/"` and the
 *    job-data store (`getTotalJobs`, `selectAllJobData`, …).
 *  - `GET https://dbox.darwinbox.in/ms/candidateapi/getCompanyDetails` → HTTP 404
 *    with the JSON envelope `{"status":"error","data":{"message":"The requested
 *    resource could not be found ..."}}`, confirming the `{status,data}` API
 *    contract on the candidate backend.
 *  - The candidate backend sits behind a Cloudflare WAF / Turnstile bot gate:
 *    many anonymous endpoint variants return an HTTP 403 Cloudflare challenge
 *    page rather than JSON. Because the exact public, always-anonymous job-list
 *    endpoint and its response field names could NOT be observed end-to-end
 *    without solving the bot challenge, the wire shape below is modelled
 *    defensively (snake_case primary + camelCase aliases) and the adapter's
 *    returned metadata is marked `verified: false`. The adapter still compiles,
 *    fetches once per tenant, and degrades gracefully on every failure mode.
 *
 * Known public tenant (for tests / citation): `dbox`
 * (`https://dbox.darwinbox.in/ms/candidate/careers`, Darwinbox's own portal).
 */

/** Regional host templates for a tenant's public careers portal + candidate API. */
export const DARWINBOX_HOST_TEMPLATE_IN = 'https://{tenant}.darwinbox.in';
export const DARWINBOX_HOST_TEMPLATE_COM = 'https://{tenant}.darwinbox.com';

/** Hosts probed, in order, when only a bare tenant label is known. */
export const DARWINBOX_HOST_TEMPLATES: string[] = [
  DARWINBOX_HOST_TEMPLATE_IN,
  DARWINBOX_HOST_TEMPLATE_COM,
];

/** Public careers-portal path (the Angular SPA entry point). */
export const DARWINBOX_CAREERS_PATH = '/ms/candidate/careers';

/** Candidate API base, as exposed in the SPA bundle (`apiURL`). */
export const DARWINBOX_API_BASE = '/ms/candidateapi';

/**
 * Candidate-API endpoint paths (relative to {@link DARWINBOX_API_BASE}). The
 * job-list path is modelled from the SPA's job-data store naming; the adapter
 * tries each candidate path in order and accepts the first that yields a
 * well-formed `{status:"success", data:{...}}` envelope, so cross-tenant /
 * future-version drift in the exact segment never breaks ingestion.
 */
export const DARWINBOX_JOB_LIST_PATHS: string[] = [
  '/getJobList',
  '/getAllJobs',
  '/getJobsList',
  '/getCareerJobs',
];

/** Public candidate-host suffixes used to recognise a Darwinbox `companyUrl`. */
export const DARWINBOX_HOST_SUFFIXES: string[] = ['darwinbox.in', 'darwinbox.com'];

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: when a caller
 * omits `resultsWanted` entirely we ingest up to 100 of the tenant's open roles.
 */
export const DARWINBOX_DEFAULT_RESULTS = 100;

/**
 * Default request headers. The candidate portal/API sits behind Cloudflare and
 * expects a browser-like UA plus a JSON accept header.
 */
export const DARWINBOX_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};
