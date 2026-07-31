/**
 * Constants for the HROne (hrone.cloud) careers platform.
 *
 * HROne (hrone.cloud, an India-based HRMS founded 2016, trusted by 2000+ organisations)
 * ships a recruitment module whose **public, candidate-facing career portal** is served per
 * tenant on a sub-domain of the shared host:
 *
 *   https://{tenant}.hrone.cloud/career-portal?appId={appId}&dc={domainCode}   (career portal SPA)
 *
 * The portal is an Angular single-page app that loads its open roles client-side from the
 * tenant's API host on the same domain family:
 *
 *   POST https://api.{tenant}.hrone.cloud/api/recruitment/referralposting/v1
 *        body:    { "positionId": 0, "pagination": { "pageNumber": n, "pageSize": k } }
 *        headers: { "apiKey": "{appId}", "domainCode": "{domainCode}", "AccessMode": "W" }
 *
 * This is the anonymous, candidate-facing job-opening feed: the SPA fetches it through an
 * `GetUnauthorized…WithAppId(url, apiKey, domainCode)` helper (no bearer token / no user
 * session — the per-tenant `appId` plays the role of a publishable read key, paired with the
 * `domainCode`). The adapter POSTs this feed, drains pages via the requested page size, and
 * maps each posting — rather than depending on a client-rendered DOM, a headless browser, or
 * the authenticated internal HRMS REST API (which DOES require a logged-in session token).
 *
 * The caller addresses a tenant by `companySlug` (the sub-domain label, e.g. `joy`) or by
 * `companyUrl` (a career-portal URL on a `hrone.cloud` host whose leading sub-domain label is
 * the tenant). The `appId` / `domainCode` read key may be supplied via `input.apiKey`
 * (apiKey) and/or encoded in the `companyUrl` query string (`appId` + `dc`); when only a
 * slug is known the adapter falls back to the slug as the `domainCode` and sends no `apiKey`
 * (degrading to an empty result if the tenant requires one). An unknown tenant, a tenant with
 * no open roles, a missing/incorrect read key, or a malformed body degrades naturally to an
 * empty / partial result rather than throwing, so a single bad tenant never nukes a batch.
 *
 * Distinct from `source-ats-hron` (HR-ON Recruit, hr-on.com — a Danish ATS). HROne is the
 * Indian HRMS at hrone.cloud; the two are unrelated platforms.
 *
 * Surface confidence (researched live 2026-06-03, no authentication): **verified=false**
 * (defensive adapter built from strong public evidence).
 *  - CONFIRMED: the platform + tenant addressing `{tenant}.hrone.cloud/career-portal`, a real
 *    live tenant (`joy` — HROne's own demo/career portal) and a real `appId`/`dc=joy` pair
 *    harvested from the public link on hrone.cloud; the per-tenant API host
 *    `https://api.{tenant}.hrone.cloud`; the job-opening endpoint path
 *    `POST /api/recruitment/referralposting/v1` and its `{ positionId, pagination }` request
 *    body; and the anonymous `apiKey` + `domainCode` + `AccessMode: W` header mechanism — all
 *    extracted from the portal's own Angular bundle + a real career-portal link. A live
 *    `GET .../JobOpening/Search` returned HTTP 405 (endpoint exists, wrong method), proving
 *    the API host + path are real and reachable.
 *  - ASSUMED (could not be confirmed via a clean anonymous fetch): the exact JSON response
 *    envelope and per-role field names. The live `referralposting/v1` POST returned HTTP 403
 *    behind a per-session signed request token (`rqt`) the SPA mints, which a non-browser
 *    client cannot reproduce. The role field names below (`jobTitle`, `jobCode`, `cityName`,
 *    `stateName`, `countryName`, `departmentName`, `description`, `experience`, `salary`,
 *    `noOfPosition`, `positionId`, `requestId`) are derived from the bundle's own data
 *    bindings, but the response wrapper shape is parsed defensively (multiple candidate
 *    envelope keys) so real-shape drift never throws. verified=false.
 */

/** Root domain — used to recognise tenant hosts / URLs passed via `companyUrl`. */
export const HRONE_ROOT_DOMAIN = 'hrone.cloud';

/** Hosted career-portal host suffix — tenant portals live at `{tenant}.hrone.cloud`. */
export const HRONE_CAREER_HOST_SUFFIX = '.hrone.cloud';

/** Builds a tenant's career-portal origin from its slug. */
export const hroneCareerOrigin = (tenant: string): string =>
  `https://${tenant}${HRONE_CAREER_HOST_SUFFIX}`;

/** Builds a tenant's API host origin (`https://api.{tenant}.hrone.cloud`). */
export const hroneApiOrigin = (tenant: string): string =>
  `https://api.${tenant}${HRONE_CAREER_HOST_SUFFIX}`;

/** Public career-portal SPA path on the tenant host (`/career-portal`). */
export const HRONE_CAREER_PORTAL_PATH = 'career-portal';

/**
 * Public, anonymous job-opening feed path on the tenant API host
 * (`POST /api/recruitment/referralposting/v1`). The portal SPA fetches its open roles here.
 */
export const HRONE_JOBS_PATH = 'api/recruitment/referralposting/v1';

/**
 * Header carrying the per-tenant publishable read key (the career-portal `appId`). The portal
 * sends it as `apiKey` on the anonymous, app-id-scoped request path.
 */
export const HRONE_API_KEY_HEADER = 'apiKey';

/** Header carrying the tenant domain code (the career-portal `dc` query value). */
export const HRONE_DOMAIN_CODE_HEADER = 'domainCode';

/** Access-mode header the portal sends on the anonymous read path (`W`). */
export const HRONE_ACCESS_MODE_HEADER = 'AccessMode';

/** Access-mode value the portal sends on the anonymous read path. */
export const HRONE_ACCESS_MODE = 'W';

/**
 * Page size requested per feed page. The portal itself requests a large page (1000) so a
 * typical board drains in a single page; we request a generous page and drain defensively for
 * larger boards.
 */
export const HRONE_PAGE_SIZE = 200;

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: when a caller omits
 * `resultsWanted` entirely we ingest up to 100 of the tenant's open roles.
 */
export const HRONE_DEFAULT_RESULTS = 100;

/**
 * Hard ceiling on feed pages fetched per scrape. The page size is large enough that most
 * tenants fit in one page; the ceiling guards against an unbounded / looping pagination
 * (8 × 200 = 1600 roles, well beyond any single-tenant board).
 */
export const HRONE_MAX_PAGES = 8;

/**
 * Upper bound (seconds) on the per-request HTTP timeout. An unresponsive HROne API host can
 * connect-then-hang, so we cap the shared client's 60s default to keep graceful-degradation
 * well inside callers' budgets; a healthy tenant responds in well under a second. A caller may
 * request a SHORTER timeout — we only bound the upper end.
 */
export const HRONE_DEFAULT_TIMEOUT_SECONDS = 15;

/** Default request headers. The JSON feed expects a browser-like UA + JSON Accept + JSON body. */
export const HRONE_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
};

/**
 * Detects remote / work-from-home roles across the title, location, and department fields,
 * complementing any structured signal HROne emits.
 */
export const HRONE_REMOTE_REGEX =
  /\b(remote|home[\s-]?office|telecommute|teleworking|wfh|work\s*from\s*home|fully\s*remote|anywhere)\b/i;
