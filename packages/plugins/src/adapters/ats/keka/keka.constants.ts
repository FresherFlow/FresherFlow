/**
 * Constants for the Keka applicant-tracking / hiring careers platform.
 *
 * Keka (keka.com, India HR + payroll + hiring suite; product "Keka Hire") powers
 * each customer tenant's candidate-facing career site on its own sub-domain of
 * `keka.com`:
 *
 *   https://{tenant}.keka.com/careers/
 *
 * The career site is a client-rendered single-page app, so the listing page
 * carries no server-side job links. Its open roles are loaded over a public,
 * unauthenticated JSON API the SPA calls on boot, and each role additionally has
 * a stable, server-pre-rendered (for Google-for-Jobs) detail page that embeds a
 * schema.org `JobPosting` JSON-LD block. The crawlable public surface is
 * therefore two-fold, mirroring the sibling schema.org ATS adapters:
 *
 *  1. The tenant's public published-jobs JSON feed, which enumerates every open
 *     role for the tenant in one document (no server-side pagination of the job
 *     set):
 *
 *       GET https://{tenant}.keka.com/k/careers/api/mwf/careers/jobs
 *         → { data: [ { id|jobId: 41450, title: "…",
 *               jobDescription: "<p>…HTML body…</p>",
 *               city|location: "Noida", state: "Uttar Pradesh", country: "India",
 *               department: "Engineering", employmentType: "Full Time",
 *               isRemote: false, postedDate|createdDate: "2026-05-20T…",
 *               jobDetailUrl: "…/careers/jobdetails/41450" }, … ] }
 *
 *     Several historical / alias paths front the same feed across tenant
 *     versions; we probe them in order and use the first that yields roles.
 *
 *  2. Each role's server-rendered detail page, which embeds a schema.org
 *     `JobPosting` JSON-LD block (used as a fallback / enrichment source):
 *
 *       GET https://{tenant}.keka.com/careers/jobdetails/{jobId}
 *         → HTML carrying
 *             <script type="application/ld+json">
 *               { "@type": "JobPosting",
 *                 "title": "…", "description": "<p>…HTML body…</p>",
 *                 "datePosted": "2026-05-20",
 *                 "employmentType": "FULL_TIME",
 *                 "hiringOrganization": { "name": "…" },
 *                 "jobLocation": { "address": {
 *                   "addressLocality": "Noida", "addressRegion": "Uttar Pradesh",
 *                   "addressCountry": "IN" } },
 *                 "identifier": { "value": "{jobId}" },
 *                 "jobLocationType": "TELECOMMUTE" (present when remote) }
 *             </script>
 *           plus the usual `og:title` / `og:url` / `og:description` meta fallbacks.
 *
 * The JSON feed returns every open role for the tenant in one document, so we
 * slice client-side to honour `resultsWanted`. An unknown sub-domain
 * (HTTP 404 / 4xx), a missing feed, a malformed page, or a non-JSON JSON-LD
 * block degrades to an empty (graceful) result rather than throwing, so a single
 * bad tenant never breaks a batch run.
 *
 * Surface confidence (researched 2026-06-03, no authentication):
 *  - Confirmed the platform + tenant host pattern `{tenant}.keka.com/careers/`
 *    and the real, indexed detail-page URL shape
 *    `{tenant}.keka.com/careers/jobdetails/{jobId}` (live example:
 *    `algoworks.keka.com/careers/jobdetails/41450`). Real tenants on the platform
 *    include `algoworks`, `turno`, `adda247`.
 *  - The career site is a JS-rendered SPA, so an unauthenticated HTML fetch
 *    returns only the app shell; the rendered published-jobs JSON feed's exact
 *    byte-level shape could NOT be confirmed via a no-JS fetch. The JSON list +
 *    JSON-LD `JobPosting` surfaces are the documented patterns Keka's careers
 *    product advertises, so the parser is written defensively around them
 *    (verified=false).
 */

/** Canonical tenant careers-portal host template. */
export const KEKA_HOST_TEMPLATE = 'https://{tenant}.keka.com';

/** Root portal domain — used to recognise tenant hosts passed via `companyUrl`. */
export const KEKA_ROOT_DOMAIN = 'keka.com';

/**
 * Public, unauthenticated published-jobs JSON feed paths. Keka's careers SPA has
 * fronted this feed under a handful of paths across versions; we probe them in
 * order and use the first that yields roles.
 */
export const KEKA_JOBS_API_PATHS = [
  '/k/careers/api/mwf/careers/jobs',
  '/careersapi/published-jobs',
  '/careers/api/jobs',
];

/** Path template for a single role's server-rendered detail page. */
export const KEKA_JOB_DETAIL_PATH_TEMPLATE = '/careers/jobdetails/{jobId}';

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: the public DTO
 * default is small, but when a caller omits `resultsWanted` entirely we ingest
 * up to 100 of the tenant's open roles.
 */
export const KEKA_DEFAULT_RESULTS = 100;

/** Default request headers. The portal expects a browser-like UA + JSON Accept. */
export const KEKA_HEADERS: Record<string, string> = {
  Accept: 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Extracts every `<script type="application/ld+json">…</script>` block's inner
 * JSON text from a detail page. A page may carry several JSON-LD blocks
 * (Organization, BreadcrumbList, JobPosting); we scan them all for the
 * `JobPosting` object.
 */
export const KEKA_JSONLD_REGEX =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Extracts a `<meta property="og:…" content="…">` / `<meta name="…" content="…">` value. */
export const KEKA_OG_TITLE_REGEX = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i;
export const KEKA_OG_URL_REGEX = /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']*)["']/i;
export const KEKA_OG_DESCRIPTION_REGEX =
  /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']\s*\/?>/i;
export const KEKA_TITLE_TAG_REGEX = /<title>([\s\S]*?)<\/title>/i;

/** Detects remote / home-working roles across the title, location, and body text. */
export const KEKA_REMOTE_REGEX =
  /\b(remote|work\s*from\s*home|wfh|home[\s-]?(?:based|working)|telecommute|fully\s*remote|anywhere)\b/i;
