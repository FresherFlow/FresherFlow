/**
 * Constants for the Zwayam applicant-tracking / recruitment careers platform.
 *
 * Zwayam (zwayam.com, India — founded out of the Naukri.com / Info Edge stable,
 * now part of SHL) is an end-to-end recruitment-automation suite (ATS). Its
 * candidate-facing product is a hosted, branded "career site" that every customer
 * tenant publishes publicly and unauthenticated. Tenants are addressed by a custom
 * career domain (e.g. `https://{tenant}.openings.co/` or a vanity host such as
 * `https://careers.beacon-india.com/`) and the career page itself lives under a
 * tenant slug path:
 *
 *   https://{careerHost}/{tenant}/        (e.g. careers.beacon-india.com/beacon-india/)
 *
 * The career page is a client-rendered single-page app, so the listing page carries
 * no server-side job links. The page is served + powered by Zwayam's shared public
 * API origin (`api.zwayam.com`, mirrored as `public.zwayam.com`). The stable,
 * machine-readable public surface keyed by the tenant is:
 *
 *  1. The open-roles list (per tenant, addressed by the tenant slug + career host):
 *
 *       GET https://api.zwayam.com/company/{tenant}/jobs?host={careerHost}&page={n}&size={k}
 *         → { "totalElements": 23, "totalPages": 2, "number": 0,
 *             "content": [
 *               { "jobId": "inside-sales-executive-pune-2025012912063817",
 *                 "jobTitle": "Inside Sales Executive",
 *                 "location": "Pune", "city": "Pune", "state": "Maharashtra",
 *                 "country": "India", "department": "Sales",
 *                 "employmentType": "Full Time", "remote": false,
 *                 "jobDescription": "<p>…HTML body…</p>",
 *                 "postedDate": "2025-01-29T12:06:38+05:30" }, … ] }
 *
 *  2. The per-role detail object (full HTML body + metadata), addressed by the role's
 *     `jobUrl` slug — the same identifier the public preview page consumes:
 *
 *       GET https://api.zwayam.com/job_preview/?jobUrl={jobSlug}&host={careerHost}&apiDomain=api.zwayam.com
 *         → { "jobId": "…", "jobTitle": "…", "jobDescription": "<p>…</p>",
 *             "location": "…", "department": "…", "employmentType": "…", … }
 *
 * The canonical public, shareable detail / apply URL for a role (observed live in
 * shared LinkedIn links) is:
 *
 *   https://api.zwayam.com/job_preview/?jobUrl={jobSlug}&host={careerHost}&apiDomain=api.zwayam.com
 *
 * The list endpoint paginates (`totalPages` / `number`), so we walk pages until we
 * have `resultsWanted` roles. An unknown / disabled tenant returns an empty list (or
 * an HTTP 4xx), so it degrades naturally to an empty result. A fetch error, an HTTP
 * 4xx, a malformed body, or a single bad role degrades to an empty / partial result
 * rather than throwing, so a single bad tenant never breaks a batch run.
 *
 * Surface confidence (researched 2026-06-03, no authentication):
 *  - CONFIRMED live: the platform; the candidate-facing career-site addressing
 *    (`https://{careerHost}/{tenant}/`, e.g. `careers.beacon-india.com/beacon-india/`
 *    via a 301 to the tenant-slug path); the shared API origin `api.zwayam.com`
 *    (mirrored `public.zwayam.com`); and the canonical public per-role preview URL
 *    `https://api.zwayam.com/job_preview/?jobUrl={jobSlug}&host={careerHost}` (seen
 *    in real shared job links for tenants `tuvsud.openings.co` and
 *    `careers.beacon-india.com`).
 *  - NOT byte-confirmed: the exact open-roles *list* JSON wire shape. The career site
 *    is a client-rendered SPA and the live API hosts time out / 403 to anonymous
 *    crawlers, so the list endpoint + field names below are a DEFENSIVE design based
 *    on the documented public URL pattern, not a verified byte-level capture
 *    (verified=false). Every consumed field is optional and defensively narrowed, and
 *    any fetch / parse failure degrades to an empty / partial result.
 */

/** Public, unauthenticated API origin powering every tenant career site. */
export const ZWAYAM_API_BASE = 'https://api.zwayam.com';

/** Mirror of the public API origin (used by some tenant career sites). */
export const ZWAYAM_PUBLIC_BASE = 'https://public.zwayam.com';

/** Root platform domain — used to recognise Zwayam hosts passed via `companyUrl`. */
export const ZWAYAM_ROOT_DOMAIN = 'zwayam.com';

/**
 * Common default tenant career-host suffix. Zwayam hands tenants a free career site
 * under `{tenant}.openings.co`; many tenants also front it with a vanity domain.
 */
export const ZWAYAM_OPENINGS_DOMAIN = 'openings.co';

/** Public open-roles list endpoint template (keyed by the tenant slug + career host). */
export const ZWAYAM_JOBS_PATH = '/company';

/** Public per-role preview / detail endpoint (the SPA + share links consume this). */
export const ZWAYAM_JOB_PREVIEW_PATH = '/job_preview/';

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: the public DTO
 * default is small, but when a caller omits `resultsWanted` entirely we ingest up to
 * 100 of the tenant's open roles.
 */
export const ZWAYAM_DEFAULT_RESULTS = 100;

/**
 * Bounded per-request timeout (seconds) used when the caller does not pass a
 * shorter one. The Zwayam careers host can connect-then-hang, and
 * `ScraperInputDto` defaults `requestTimeout` to 60s, so without a cap a single
 * unresponsive tenant would hang the whole scrape on the shared client's 60s
 * default — well past callers' (and the e2e suite's) 30s budget. Capping at 15s
 * keeps the graceful-degradation path fast (a healthy tenant responds in well
 * under a second); a caller may still request a SHORTER timeout — we only bound
 * the upper end.
 */
export const ZWAYAM_DEFAULT_TIMEOUT_SECONDS = 15;

/** Page size requested from the list endpoint. */
export const ZWAYAM_PAGE_SIZE = 50;

/**
 * Hard ceiling on list pages walked per scrape, so a pathological page chain (or a
 * very large tenant with a high `resultsWanted`) can never spin unbounded.
 */
export const ZWAYAM_MAX_PAGES = 50;

/** Default request headers. The API expects a browser-like UA + JSON Accept. */
export const ZWAYAM_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Detects remote / home-working roles across the title, location, and workplace fields. */
export const ZWAYAM_REMOTE_REGEX =
  /\b(remote|home[\s-]?(?:based|working)|work\s*from\s*home|wfh|telecommute|fully\s*remote)\b/i;
