/**
 * Constants for the PeopleStrong candidate-portal platform.
 *
 * PeopleStrong (peoplestrong.com — a large India / APAC enterprise HCM + Talent
 * Acquisition suite, "Alt Recruit") powers each customer's branded, public,
 * unauthenticated candidate-facing career portal on the shared host, addressed by its
 * tenant slug as a sub-domain of the root domain:
 *
 *   https://{tenant}.peoplestrong.com/                       (candidate portal shell + open-roles board)
 *   https://{tenant}.peoplestrong.com/job/detail/{jobId}     (per-role public detail / apply page)
 *
 * Unlike a server-rendered board, the PeopleStrong candidate portal is a **client-rendered
 * single-page application**: the server HTML is a thin shell (only a "Candidate Portal"
 * heading) and the open-roles board is hydrated client-side from a tenant-scoped JSON
 * endpoint. The adapter therefore probes a small set of documented candidate-portal JSON
 * board endpoints under the tenant origin (no auth, no API key, no headless browser), and
 * — as a defensive fallback — scans the served HTML for an embedded JSON data island or
 * schema.org `JobPosting` JSON-LD, should a tenant pre-render its board. The first source
 * that yields a roles array wins; everything else degrades gracefully to an empty result.
 *
 * Each role is expected to carry a stable id (the final segment of the canonical detail
 * URL `/job/detail/{jobId}`), a title, a location, a department / business-unit label,
 * and an optional description / posted-date. The adapter narrows every field defensively
 * so cross-tenant or future-shape drift never throws.
 *
 * The caller addresses a tenant by `companySlug` (the sub-domain label, e.g.
 * `exlcareers`) or by `companyUrl` (a candidate-portal URL on a `peoplestrong.com` host
 * whose leading sub-domain label is the tenant). An unknown tenant, a tenant with no open
 * roles, or an empty board degrades naturally to an empty result. A fetch error, an HTTP
 * 4xx/5xx, a DNS failure, or a malformed body degrades to an empty / partial result
 * rather than throwing, so a single bad tenant never nukes a batch run.
 *
 * Surface confidence (researched 2026-06-03, no authentication):
 *  - CONFIRMED the platform + tenant addressing (`{tenant}.peoplestrong.com`) and real,
 *    named tenant portals on it: `exlcareers` (EXL), `ummeed-careers` (Ummeed),
 *    `nkwcareers`, `emamicareer` (Emami), `sobha-careers` (Sobha), `careers-oppo` (Oppo),
 *    `apg-smgcareer`, `redealerhrrecruit`, plus the platform-default `careers`.
 *  - CONFIRMED the per-role detail URL pattern `/job/detail/{jobId}` against real ids
 *    (`careers` → `/job/detail/PST_S-TD_612554`; `sobha-careers` → `/job/detail/Requisition11289`).
 *  - The candidate portal is a CLIENT-RENDERED SPA: the served HTML is a thin shell with
 *    no embedded roles / no JSON-LD; the board is hydrated from a tenant-scoped JSON
 *    endpoint that, when probed anonymously, answered with auth/CSRF-guarded statuses
 *    (HTTP 403/500) — i.e. the JSON board surface EXISTS but could not be confirmed
 *    anonymously live. The open-roles payload shape is therefore DOCUMENTED-BUT-UNVERIFIED
 *    and the adapter is built defensively. verified=false.
 */

/** Root domain — used to recognise tenant hosts / URLs passed via `companyUrl`. */
export const PEOPLESTRONG_ROOT_DOMAIN = 'peoplestrong.com';

/** Hosted candidate-portal host suffix — tenant sites live at `{tenant}.peoplestrong.com`. */
export const PEOPLESTRONG_CAREER_HOST_SUFFIX = '.peoplestrong.com';

/** Builds a tenant's candidate-portal origin from its slug. */
export const peopleStrongCareerOrigin = (tenant: string): string =>
  `https://${tenant}${PEOPLESTRONG_CAREER_HOST_SUFFIX}`;

/**
 * Per-role public detail path segments (used to build the canonical
 * `/job/detail/{jobId}` URL and to recognise it). Confirmed live 2026-06-03.
 */
export const PEOPLESTRONG_JOB_PATH = 'job';
export const PEOPLESTRONG_JOB_DETAIL_SEGMENT = 'detail';

/**
 * Candidate-portal JSON board endpoints, tried in order under the tenant origin. The
 * portal is a client-rendered SPA whose board is hydrated from a tenant-scoped JSON
 * endpoint; the exact path varies across deployments, so the adapter probes the
 * documented candidate-facing variants and takes the first that returns a roles array.
 * Every probe degrades gracefully (non-JSON / HTTP error → try next).
 */
export const PEOPLESTRONG_BOARD_PATHS: readonly string[] = [
  'api/careers/openings',
  'api/openings',
  'api/jobs',
  'careers/api/openings',
  'recruit/api/openings',
];

/**
 * Candidate-portal landing paths scanned as a defensive HTML fallback (for a tenant that
 * pre-renders its board or exposes an embedded data island / JSON-LD). The first page
 * whose island / JSON-LD yields a roles array wins.
 */
export const PEOPLESTRONG_INDEX_PATHS: readonly string[] = ['', 'jobs', 'careers'];

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: when a caller omits
 * `resultsWanted` entirely we ingest up to 100 of the tenant's open roles.
 */
export const PEOPLESTRONG_DEFAULT_RESULTS = 100;

/**
 * Hard ceiling on board/landing probes per scrape. The board is expected to come back in
 * a single tenant-scoped JSON document (no server-side pagination of the job set modelled
 * here), so a couple of probes is the norm; the ceiling guards the endpoint-variant sweep.
 */
export const PEOPLESTRONG_MAX_PAGES = 10;

/**
 * Upper bound (seconds) on the per-request HTTP timeout. An unresponsive PeopleStrong
 * candidate host can connect-then-hang, so we cap the shared client's 60s default to keep
 * graceful-degradation well inside callers' budgets; a healthy tenant responds in well
 * under a second. A caller may request a SHORTER timeout — we only bound the upper end.
 */
export const PEOPLESTRONG_DEFAULT_TIMEOUT_SECONDS = 15;

/** Default request headers. The portal expects a browser-like UA; we accept JSON + HTML. */
export const PEOPLESTRONG_HEADERS: Record<string, string> = {
  Accept: 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
};

/**
 * Captures a generic JSON data island embedded in the candidate-portal HTML, used by the
 * defensive HTML fallback should a tenant pre-render / bootstrap its board into the page
 * (`<script id="__INITIAL_STATE__" type="application/json">{ … }</script>` and similar).
 * The capture group is the raw JSON text.
 */
export const PEOPLESTRONG_DATA_ISLAND_REGEX =
  /<script[^>]*(?:id|type)=["'](?:__INITIAL_STATE__|__APP_STATE__|application\/json)["'][^>]*>([\s\S]*?)<\/script>/i;

/**
 * Captures schema.org JSON-LD blocks (`<script type="application/ld+json">{ … }</script>`)
 * on a pre-rendered board / detail page, scanned for `@type: "JobPosting"` entries as a
 * defensive fallback. Global so every block can be enumerated.
 */
export const PEOPLESTRONG_JSON_LD_REGEX =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Detects remote / work-from-home roles across the title, location, and department fields
 * (the portal carries no single structured remote flag we can rely on cross-tenant).
 */
export const PEOPLESTRONG_REMOTE_REGEX =
  /\b(remote|work\s*from\s*home|wfh|home[\s-]?office|fully\s*remote|anywhere)\b/i;
