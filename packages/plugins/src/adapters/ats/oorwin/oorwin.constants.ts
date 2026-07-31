/**
 * Constants for the Oorwin staffing and recruiting platform.
 *
 * Oorwin is a cloud-based Talent Intelligence platform (ATS + CRM + HRMS) used
 * primarily by staffing firms and recruitment agencies. Every customer tenant
 * is served from its own sub-domain under the shared apex `oorwin.com`
 * (e.g. `https://purpledrive.oorwin.com/careers/`), and some tenants may use
 * custom domains.
 *
 * The platform's Angular SPA makes two anonymous, unauthenticated API calls to
 * render a public career portal:
 *
 *   1. **Portal init** — `POST https://api.oorwin.ai/api/v2/careers`
 *      Body: `{ sub_domain: "{tenant}" }`
 *      Returns company metadata, branding, and portal configuration.
 *      HTTP 200 `{ success: 1, ... }` on a valid tenant; `{ status: 404 }` for
 *      an unknown tenant (no throw needed — just return empty).
 *
 *   2. **Job listing** — `POST https://api.oorwin.ai/api/v2/careers/getJobList`
 *      Body (required fields):
 *        `{ sub_domain, limit, page, order, sort, list_type, getDefaultData }`
 *      Returns:
 *        `{ status: 1, data: { list_details: { data: OorwinJob[], total: N,
 *           last_page: N }, header_columns: {...} } }`
 *      Pagination is driven by `page` (1-based) and `limit`; `total` on the
 *      first page gives the tenant's total published-job count; `last_page`
 *      is the ceiling page number.
 *
 *   3. **Job detail** — `POST https://api.oorwin.ai/api/v2/careers/job_view`
 *      Body: `{ sub_domain, job_id: "{computed_sha1_job_id}", view_type: "1" }`
 *      Returns `{ data: { job_details: { job_description: "<html>..." } } }`.
 *      The listing endpoint does NOT embed the job description — a per-job
 *      detail fetch is required to get HTML. We fetch detail pages concurrently
 *      with a bounded `Promise.allSettled`, tolerating individual failures.
 *
 * Tenant resolution: the sub-domain label is taken from `companySlug`, or
 * derived as the first sub-domain label of `companyUrl`
 * (e.g. `purpledrive` from `https://purpledrive.oorwin.com/careers/`).
 *
 * The public job-detail page URL follows the pattern:
 *   `https://{tenant}.oorwin.com/careers/#/job/{job_id}`
 * where `{job_id}` is the numeric `id` field (not the SHA1 hash used by the
 * API; the hash is used only for the `job_view` detail call).
 *
 * Verified live against `purpledrive.oorwin.com` on 2026-06-03:
 *   - `POST /api/v2/careers` → HTTP 200, `success: 1`, company_id 2407.
 *   - `POST /api/v2/careers/getJobList` → HTTP 200, 2 804 total jobs, 561 pages.
 *   - `POST /api/v2/careers/job_view` → HTTP 200, full HTML description returned.
 */

/** Base URL for the Oorwin public REST API (production environment). */
export const OORWIN_API_BASE = 'https://api.oorwin.ai/api/v2/';

/** Shared apex for every Oorwin-hosted tenant sub-domain. */
export const OORWIN_APEX = 'oorwin.com';

/** Host template for Oorwin-hosted tenants; `{tenant}` is substituted at runtime. */
export const OORWIN_HOST_TEMPLATE = 'https://{tenant}.oorwin.com';

/** Path fragment for the public career portal SPA. */
export const OORWIN_CAREERS_PATH = '/careers/';

/** Hash-routing pattern for the public job-detail page. */
export const OORWIN_JOB_PAGE_TEMPLATE = '/careers/#/job/{id}';

/** Anonymous portal-init endpoint path (appended to OORWIN_API_BASE). */
export const OORWIN_PORTAL_INIT_PATH = 'careers';

/** Anonymous job-listing endpoint path (appended to OORWIN_API_BASE). */
export const OORWIN_JOB_LIST_PATH = 'careers/getJobList';

/** Anonymous job-detail endpoint path (appended to OORWIN_API_BASE). */
export const OORWIN_JOB_VIEW_PATH = 'careers/job_view';

/** Server-side page size we request per listing call. */
export const OORWIN_PAGE_SIZE = 50;

/** Maximum number of detail-fetch calls we issue concurrently per pagination round. */
export const OORWIN_MAX_CONCURRENCY = 6;

/** Delay (ms) between sequential pagination rounds, to stay polite. */
export const OORWIN_REQUEST_DELAY_MS = 250;

/**
 * Default internal results cap. The public DTO default is 15, but when a
 * caller omits `resultsWanted` entirely we ingest up to 100 of the tenant's
 * open roles.
 */
export const OORWIN_DEFAULT_RESULTS = 100;

/**
 * Sort order for the job listing: most-recently-published first.
 * The `order` field must be `cp_published_on` and `sort` must be `desc`.
 */
export const OORWIN_DEFAULT_ORDER = 'cp_published_on';
export const OORWIN_DEFAULT_SORT = 'desc';

/**
 * `list_type: 1` means the public (unauthenticated) job listing.
 * Values 2 and 3 are for authenticated "my jobs" / "saved jobs" views.
 */
export const OORWIN_LIST_TYPE_PUBLIC = 1;

/** Default request headers. The Oorwin API accepts plain JSON with no special headers. */
export const OORWIN_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};
