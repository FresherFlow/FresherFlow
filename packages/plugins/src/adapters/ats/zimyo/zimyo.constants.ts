/**
 * Constants for the Zimyo careers platform.
 *
 * Zimyo (zimyo.com, India — a fast-growing HRMS + recruitment / ATS suite) powers a
 * public, unauthenticated candidate-facing career board for each customer tenant. The
 * board is addressed by a numeric **organisation id** (the tenant key); the public
 * candidate-facing site is a single-page (Vite/React) widget app hosted at:
 *
 *   https://zimyo.work/recruit/careerJoblist/{base64(orgId)}          (open-roles board)
 *   https://zimyo.work/recruit/career/details/{base64(jobId)}/{base64(orgId)}  (detail / apply)
 *
 * The SPA itself ships no embedded role data; it hydrates from a **public JSON widget
 * API** on the ATS backend host (no auth, no API key, no per-tenant token). The adapter
 * talks to that API directly rather than driving a headless browser:
 *
 *   GET {API}/widget/joblist2?id={orgId}&per_page={n}&page={p}
 *     → { error, code, data: { result: ZimyoJobListItem[], totalCount, page } }
 *   GET {API}/widget/jobDetails?jobId={jobId}
 *     → { error, code, data: { jobDetail: ZimyoJobDetail } }   (rich HTML body, address…)
 *   GET {API}/widget/orgDetails?org_id={orgId}
 *     → { error, code, data: [ { ORG_NAME, ORG_ADDRESS, ORG_LOGO } ] }   (tenant brand)
 *
 * Each list role carries `JOB_ID` (the stable ATS id and the `jobDetails?jobId=` key /
 * the base64 segment of the canonical detail URL), `JOB_TITLE`, `DEPARTMENT_NAME`,
 * `LOCATION_NAME`, `EMPLOYEMENT` (employment type), and `CREATED_ON`. The per-role
 * detail endpoint adds the full HTML `JOB_DESCRIPTION`, `STREET_ADDRESS`, `ENTITY_NAME`
 * (brand), and an `ALL_DETAILS` JSON blob carrying `WORKPLACE_TYPE` (`On-site` / `Hybrid`
 * / `Remote`), `EMPLOYEMENT_TYPE`, and salary band.
 *
 * The caller addresses a tenant by `companySlug` (the numeric org id, e.g. `1`) or by
 * `companyUrl` (a `zimyo.work` career URL whose path encodes the base64 org id, which the
 * adapter decodes). An unknown / disabled org, a tenant with no open roles, or an empty
 * board degrades naturally to an empty result. A fetch error, an HTTP 4xx, a DNS failure,
 * or a malformed body degrades to an empty / partial result rather than throwing, so a
 * single bad tenant never nukes a batch run.
 *
 * Surface confidence (researched + verified live 2026-06-03, no authentication):
 *  - Confirmed the platform + the public widget API host `https://ats.zimyo.work/ats/ats`
 *    (extracted from the SPA bundle's `BASE_URL`), and that `widget/joblist2?id={orgId}`
 *    answers HTTP 200 with `{ data: { result, totalCount, page } }` for org `1` (Zimyo's
 *    own board — currently 0 live roles, exercising the empty-board path).
 *  - Confirmed `widget/jobDetails?jobId=11268` returns a real role
 *    (`Software Engineer Intern`, Engineering, Gurugram, India; full HTML
 *    `JOB_DESCRIPTION`; `ALL_DETAILS.WORKPLACE_TYPE = "On-site"`) and that the canonical
 *    public detail URL `/recruit/career/details/MTEyNjg=/MQ==` base64-decodes to
 *    jobId `11268` / orgId `1`. `widget/orgDetails?org_id=1` returned the tenant brand
 *    `{ ORG_NAME: "Zimyo", … }`. verified=true.
 */

/** Root domain — used to recognise tenant career URLs passed via `companyUrl`. */
export const ZIMYO_ROOT_DOMAIN = 'zimyo.work';

/**
 * Public widget API base. The candidate-facing SPA at `zimyo.work/recruit` hydrates the
 * board from this host (its bundled `BASE_URL`); the `widget/*` routes are anonymous.
 */
export const ZIMYO_API_BASE = 'https://ats.zimyo.work/ats/ats';

/** Public career-site origin — the SPA the API backs (used to build canonical URLs). */
export const ZIMYO_CAREER_ORIGIN = 'https://zimyo.work';

/** Public widget endpoint — paginated open-roles list for a tenant org id. */
export const ZIMYO_JOBLIST_PATH = 'widget/joblist2';

/** Public widget endpoint — rich per-role detail (HTML body, address, workplace type). */
export const ZIMYO_JOB_DETAIL_PATH = 'widget/jobDetails';

/** Public widget endpoint — tenant org metadata (brand name, address, logo). */
export const ZIMYO_ORG_DETAIL_PATH = 'widget/orgDetails';

/** Builds the canonical public detail / apply URL for a role (base64 jobId / orgId). */
export const zimyoDetailUrl = (orgId: string, jobId: string): string =>
  `${ZIMYO_CAREER_ORIGIN}/recruit/career/details/${zimyoB64(jobId)}/${zimyoB64(orgId)}`;

/** Builds the canonical public open-roles board URL for a tenant (base64 orgId). */
export const zimyoBoardUrl = (orgId: string): string =>
  `${ZIMYO_CAREER_ORIGIN}/recruit/career/joblist/${zimyoB64(orgId)}`;

/**
 * URL-safe-agnostic base64 of an ASCII token. The SPA encodes the bare orgId / jobId
 * with standard `btoa`; we mirror that so the detail URLs we emit resolve in a browser.
 */
export const zimyoB64 = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64');

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: when a caller omits
 * `resultsWanted` entirely we ingest up to 100 of the tenant's open roles.
 */
export const ZIMYO_DEFAULT_RESULTS = 100;

/**
 * Page size requested from `joblist2`. The endpoint paginates; we page through it up to
 * the page cap, each page returning up to this many roles, until `resultsWanted` or the
 * reported `totalCount` is reached.
 */
export const ZIMYO_PAGE_SIZE = 50;

/**
 * Hard ceiling on list pages fetched per scrape. Guards against an unbounded paginator
 * (a runaway `totalCount` / a server that never signals the end) while still covering a
 * large board: `ZIMYO_MAX_PAGES * ZIMYO_PAGE_SIZE` roles is the practical ceiling.
 */
export const ZIMYO_MAX_PAGES = 20;

/**
 * Upper bound (seconds) on the per-request HTTP timeout. An unresponsive Zimyo widget
 * host can connect-then-hang, so we cap the shared client's 60s default to keep
 * graceful-degradation well inside callers' budgets; a healthy tenant responds in well
 * under a second. A caller may request a SHORTER timeout — we only bound the upper end.
 */
export const ZIMYO_DEFAULT_TIMEOUT_SECONDS = 15;

/** Default request headers. The widget API expects a browser-like UA + JSON Accept. */
export const ZIMYO_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
  // The widget API is candidate-facing and CORS-open to the career-site origin; sending a
  // matching Origin keeps the request shaped like the real SPA's.
  Origin: ZIMYO_CAREER_ORIGIN,
  Referer: `${ZIMYO_CAREER_ORIGIN}/recruit/`,
};

/** The `WORKPLACE_TYPE` token Zimyo emits for fully-remote roles. */
export const ZIMYO_REMOTE_WORKPLACE_TYPE = 'remote';

/**
 * Detects remote / work-from-home roles across the title, location, and department
 * fields, complementing the structured `WORKPLACE_TYPE` flag.
 */
export const ZIMYO_REMOTE_REGEX =
  /\b(remote|work\s*from\s*home|wfh|fully\s*remote|home[\s-]?based|anywhere)\b/i;
