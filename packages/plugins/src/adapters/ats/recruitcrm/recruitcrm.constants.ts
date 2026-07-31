/**
 * Constants for the Recruit CRM hosted career-page platform.
 *
 * Recruit CRM is a recruiting-agency CRM and ATS.  Each agency that uses
 * the platform can publish a public-facing jobs page at:
 *
 *   https://recruitcrm.io/jobs/{account_job_page_name}
 *
 * where `account_job_page_name` is the slug the agency chose when setting up
 * their jobs page (e.g. `Terra_Careers`, `somewhere`).
 *
 * ## Public anonymous jobs feed
 *
 * The jobs listing SPA at `recruitcrm.io/jobs/{slug}` fetches open positions
 * from the Albatross backend service — the same service that powers the Recruit
 * CRM application itself:
 *
 *   POST https://albatross.recruitcrm.io/v1/external-pages/jobs-by-account/get
 *        ?account={accountSlug}&batch=true
 *
 *   Request body (JSON):
 *     {
 *       "limit":    <number>,   // page size
 *       "offset":   <number>,   // 0-based row offset
 *       "search_data": {},      // empty = no server-side filter
 *       "onlyJobs": true        // omit talent-pool submissions
 *     }
 *
 *   Response (HTTP 200 JSON):
 *     {
 *       "status":       "success" | "fail",
 *       "message":      "",
 *       "message_type": "is-success",
 *       "data": {
 *         "jobs": [RecruitCrmJob, ...]
 *       }
 *     }
 *
 * Pagination uses `offset`; when the returned array is shorter than `limit`,
 * all open roles for the account have been exhausted.  The response provides
 * no `total_count` field.
 *
 * CORS: the server allows `Origin: https://recruitcrm.io` (and presumably any
 * origin the tenant's custom domain is published under).  We always send
 * `Origin: https://recruitcrm.io` for the anonymous public call.
 *
 * ## Public job-detail page
 *
 *   https://recruitcrm.io/jobs/{jobSlug}
 *   (the `slug` field on each job object is the unique public identifier)
 *
 * ## Wire shape (per-job, snake_case)
 *
 * ```jsonc
 * {
 *   "slug":        "17798145903860064349Ukx",  // unique job id / URL key
 *   "srno":        "145",                       // serial number (string)
 *   "name":        "Ingeniero/a de Sonido…",   // job title → title
 *   "companyname": "Acme Recruiting",           // client company name
 *   "showcompany": 2,                           // 0 = hide, else show
 *   "jobcode":     null,                        // optional job code
 *   "description": "",                          // plain-text summary (often empty)
 *   "details":     null,                        // file attachment slug
 *   "detailfilename": null,                     // attachment display name
 *   "city":        "New York",                  // free-text city
 *   "locality":    "Manhattan",                 // sub-region / district
 *   "jdtext":      "<h1>…</h1>",               // full HTML job description
 *   "remote":      "Remote",                    // free-text remote label (or "")
 *   "postalcode":  "10001"                      // postal code (or "")
 * }
 * ```
 *
 * ## Authentication
 *
 * The endpoint is **fully public and anonymous** — no API key, no OAuth token.
 * The CORS `Access-Control-Allow-Origin` header is set to `https://recruitcrm.io`
 * on every 200 response, confirming it is designed for unauthenticated browser
 * access from the public jobs page.
 *
 * ## Live verification
 *
 * Verified against account `Terra_Careers` on 2026-06-03:
 *   POST https://albatross.recruitcrm.io/v1/external-pages/jobs-by-account/get
 *        ?account=Terra_Careers&batch=true
 *   → HTTP 200, `status: "success"`, 14 jobs returned with fully shaped objects.
 */

/** Base URL of the Albatross backend service that hosts the public jobs feed. */
export const RECRUITCRM_ALBATROSS_BASE = 'https://albatross.recruitcrm.io/v1';

/**
 * Path template for the public jobs-by-account endpoint.
 * `{account}` is replaced at runtime with the tenant's account slug.
 */
export const RECRUITCRM_JOBS_PATH_TEMPLATE =
  '/external-pages/jobs-by-account/get?account={account}&batch=true';

/** Base URL of the public-facing jobs page (used for detail-page URL and CORS origin). */
export const RECRUITCRM_JOBS_PAGE_BASE = 'https://recruitcrm.io/jobs';

/**
 * URL template for the public job-detail page.
 * `{slug}` is the unique job slug from the API response.
 */
export const RECRUITCRM_JOB_DETAIL_TEMPLATE = 'https://recruitcrm.io/jobs/{slug}';

/**
 * The `Origin` header value we include on every anonymous request.
 * Albatross's CORS policy allows this origin and returns
 * `Access-Control-Allow-Origin: https://recruitcrm.io` on 200 responses.
 */
export const RECRUITCRM_ORIGIN = 'https://recruitcrm.io';

/** Server-side page size we request per call; combined with `offset` to paginate. */
export const RECRUITCRM_PAGE_SIZE = 50;

/** Maximum number of additional pages to fetch concurrently per tenant. */
export const RECRUITCRM_MAX_CONCURRENCY = 6;

/** Delay (ms) between sequential pagination rounds, to stay polite. */
export const RECRUITCRM_REQUEST_DELAY_MS = 250;

/**
 * Default internal results cap.  Mirrors the sibling ATS adapters: the public
 * DTO default is 15, but when a caller omits `resultsWanted` entirely we ingest
 * up to 100 of the tenant's open roles.
 */
export const RECRUITCRM_DEFAULT_RESULTS = 100;

/** Default request headers sent with every call to the Albatross service. */
export const RECRUITCRM_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};
