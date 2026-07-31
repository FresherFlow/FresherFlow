/**
 * Constants for the TurboHire applicant-tracking / recruitment-automation platform.
 *
 * TurboHire (turbohire.co, India / global) is an AI recruitment-automation ATS whose
 * candidate-facing product is a hosted careers portal. Every customer tenant
 * publishes a branded, public, unauthenticated career site. The observed public
 * candidate-facing forms are:
 *
 *   https://{tenant}.turbohire.co/                     (tenant careers sub-domain)
 *   https://{tenant}.turbohire.co/dashboardv2?orgId={uuid}
 *   https://careers.turbohire.co/                       (shared careers host)
 *
 * and a per-role public detail page on the shared portal host:
 *
 *   https://portal.turbohire.co/job/publicjobs/{token}
 *   https://app.turbohire.co/job/publicjobs/{token}
 *
 * The careers portal is a client-rendered SPA (the listing page carries no
 * server-side job links), so the crawlable public surface is the JSON API the SPA
 * itself consumes on `api.turbohire.co`, keyed by the tenant's public org
 * identifier. The adapter addresses a tenant by `companySlug` (the careers
 * sub-domain label / org slug, e.g. `tatamotors`) or by `companyUrl` (a
 * `turbohire.co` portal URL whose sub-domain / `orgId` query encodes the tenant).
 *
 *  1. The paginated public open-roles list (keyed by org / company slug):
 *
 *       GET https://api.turbohire.co/api/careerpage/publicjobs?companySlug={tenant}&page={n}&pageSize={size}
 *         → { "totalCount": 12,
 *             "page": 1, "pageSize": 20,
 *             "data": [
 *               { "id": "1dUzhMe2tYOz9jTRiOZUBM33ka",
 *                 "publicId": "1dUzhMe2tYOz9jTRiOZUBM33ka",
 *                 "title": "Senior Software Engineer",
 *                 "departmentName": "Engineering",
 *                 "employmentType": "Full Time",
 *                 "city": "Hyderabad", "state": "Telangana", "country": "India",
 *                 "isRemote": false,
 *                 "publicUrl": "https://portal.turbohire.co/job/publicjobs/1dUz…" }, … ] }
 *
 *  2. The per-role public detail object (full HTML body + metadata):
 *
 *       GET https://api.turbohire.co/api/careerpage/publicjobs/{id}?companySlug={tenant}
 *         → { "id": "1dUzhMe2tYOz9jTRiOZUBM33ka",
 *             "title": "Senior Software Engineer",
 *             "descriptionHtml": "<div>…HTML body…</div>",
 *             "employmentType": "Full Time",
 *             "departmentName": "Engineering",
 *             "city": "Hyderabad", "state": "Telangana", "country": "India",
 *             "isRemote": false, "workplaceType": "Onsite",
 *             "createdOn": "2026-04-21T10:30:00Z",
 *             "applyUrl": "https://portal.turbohire.co/job/publicjobs/1dUz…" }
 *
 * The list endpoint paginates (`totalCount` / `page` / `pageSize`), so we walk pages
 * until we have `resultsWanted` roles. An unknown tenant is expected to return an
 * empty list (or a 4xx), so it degrades naturally to an empty result. A fetch error,
 * an HTTP 4xx, a malformed body, or a single bad role degrades to an empty / partial
 * result rather than throwing, so a single bad tenant never breaks a batch run.
 *
 * Surface confidence (researched 2026-06-03, no authentication):
 *  - CONFIRMED live: the platform + tenant addressing — the shared careers host
 *    `careers.turbohire.co`, tenant careers sub-domains `{tenant}.turbohire.co`
 *    (real named tenant observed: `tatamotors`, Tata Motors, addressed as
 *    `https://tatamotors.turbohire.co/dashboardv2?orgId=39ddba0d-…`), and the
 *    per-role public detail host `portal.turbohire.co/job/publicjobs/{token}`
 *    (and the `app.turbohire.co` mirror).
 *  - NOT confirmed live: the exact JSON wire shapes + the `api.turbohire.co` list /
 *    detail paths. The careers portal is a client-rendered SPA whose backing API
 *    could not be observed unauthenticated, and TurboHire publishes no public API
 *    docs. The endpoint paths + field names below are a DEFENSIVE design modelled on
 *    the documented public URL pattern and the conventions of sibling ATS adapters;
 *    every consumed field is optional and defensively narrowed, and every network
 *    call degrades gracefully so a wrong guess never throws. (verified=false)
 */

/** Public, unauthenticated JSON API origin backing every tenant careers portal. */
export const TURBOHIRE_API_BASE = 'https://api.turbohire.co';

/** Canonical public per-role detail / apply host (candidate-facing SPA). */
export const TURBOHIRE_PORTAL_BASE = 'https://portal.turbohire.co';

/** Root portal domain — used to recognise tenant hosts passed via `companyUrl`. */
export const TURBOHIRE_ROOT_DOMAIN = 'turbohire.co';

/** Public open-roles list endpoint (paginated; keyed by company / org slug). */
export const TURBOHIRE_JOBS_PATH = '/api/careerpage/publicjobs';

/** Per-role public detail path under the portal host (`/job/publicjobs/{token}`). */
export const TURBOHIRE_PUBLIC_JOB_PATH = '/job/publicjobs';

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: the public DTO
 * default is small, but when a caller omits `resultsWanted` entirely we ingest
 * up to 100 of the tenant's open roles.
 */
export const TURBOHIRE_DEFAULT_RESULTS = 100;

/** Page size requested from the list endpoint when walking pages. */
export const TURBOHIRE_PAGE_SIZE = 20;

/**
 * Hard ceiling on list pages walked per scrape, so a pathological page chain (or a
 * very large tenant with a high `resultsWanted`) can never spin unbounded.
 */
export const TURBOHIRE_MAX_PAGES = 50;

/** Default request headers. The API expects a browser-like UA + JSON Accept. */
export const TURBOHIRE_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Detects remote / home-working roles across the title, location, and workplace fields. */
export const TURBOHIRE_REMOTE_REGEX =
  /\b(remote|home[\s-]?(?:based|working)|work\s*from\s*home|wfh|telecommute|fully\s*remote)\b/i;
