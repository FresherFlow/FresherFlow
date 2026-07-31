/**
 * Constants for the Snaphunt remote-hiring marketplace platform.
 *
 * Snaphunt (snaphunt.com, a global / APAC AI-assisted hiring marketplace) is a
 * board-style platform: companies post roles and each customer is given a branded,
 * public, unauthenticated career-site on its own sub-domain of `snaphunt.com`:
 *
 *   https://{tenant}.snaphunt.com/
 *
 * Because Snaphunt is a marketplace, the *company* is a per-job field rather than a
 * property of the host — every role on a tenant career-site carries its own
 * `hiringOrganization`. The stable, crawlable public surface is two-fold, mirroring
 * the sibling schema.org ATS adapters:
 *
 *  1. The tenant's XML sitemap, which enumerates every open role on that
 *     career-site:
 *
 *       GET https://{tenant}.snaphunt.com/sitemap.xml
 *         → <urlset> with one <url><loc>…/job/{jobId}</loc>
 *             <lastmod>{ISO date}</lastmod> …</url> per open position.
 *
 *     (The tenant career-site detail pages are client-rendered — a no-JS fetch of
 *     `{tenant}.snaphunt.com/job/{jobId}` returns only the app shell whose JSON-LD
 *     is still hydrating, so it carries placeholder `"undefined"` field values.)
 *
 *  2. Each role's canonical, server-rendered detail page on the apex host, which
 *     embeds a fully-rendered schema.org `JobPosting` JSON-LD block:
 *
 *       GET https://snaphunt.com/jobs/{jobId}
 *         → HTML carrying
 *             <script type="application/ld+json">
 *               { "@type": "JobPosting",
 *                 "title": "Search Quality Rater (Remote)",
 *                 "description": "<p>…HTML body…</p>",
 *                 "datePosted": "2024-10-17T09:56:56.455Z",
 *                 "validThrough": "2025-04-18T22:00:00.084Z",
 *                 "employmentType": ["PART_TIME"],
 *                 "jobLocationType": "TELECOMMUTE" (present when remote),
 *                 "hiringOrganization": { "@type": "Organization", "name": "…" },
 *                 "jobLocation": [ { "@type": "Place", "address": {
 *                   "addressLocality": "Sarasota",
 *                   "addressCountry": "United States" } } ],
 *                 "applicantLocationRequirements": [
 *                   { "@type": "Country", "name": "United States" } ],
 *                 "identifier": { "@type": "PropertyValue", "value": "{jobId}" } }
 *             </script>
 *           plus the usual `og:title` / `og:url` / `og:description` meta fallbacks.
 *
 * The sitemap returns every open role for the tenant in one document (no
 * server-side pagination of the job set), so we slice client-side to honour
 * `resultsWanted`. An unknown sub-domain (HTTP 404 / 4xx), a missing sitemap, a
 * malformed detail page, or a non-JSON JSON-LD block degrades to an empty
 * (graceful) result rather than throwing, so a single bad tenant never breaks a
 * batch run.
 *
 * Surface confidence (researched & verified live 2026-06-03, no authentication):
 *  - Confirmed the platform + tenant host pattern `{tenant}.snaphunt.com` and real,
 *    named tenants on it: `snappr`, `steenbok`, `totalshape`, `venture`,
 *    `personalbuero` (each serving a populated `/sitemap.xml` of `/job/{jobId}`
 *    entries).
 *  - Confirmed the canonical apex detail page `https://snaphunt.com/jobs/{jobId}`
 *    returns a fully-rendered schema.org `JobPosting` JSON-LD block (title,
 *    description HTML, datePosted, employmentType array, hiringOrganization,
 *    jobLocation[].address, applicantLocationRequirements, identifier.value,
 *    jobLocationType) plus `og:` meta. The tenant career-site detail pages are
 *    client-rendered, so role detail is read from the canonical apex page.
 */

/** Canonical tenant career-site host template (Snaphunt sub-domain). */
export const SNAPHUNT_HOST_TEMPLATE = 'https://{tenant}.snaphunt.com';

/** Root platform domain — used to recognise tenant hosts passed via `companyUrl`. */
export const SNAPHUNT_ROOT_DOMAIN = 'snaphunt.com';

/** Public, unauthenticated XML sitemap that enumerates a tenant's open roles. */
export const SNAPHUNT_SITEMAP_PATH = '/sitemap.xml';

/**
 * Canonical apex detail-page template. The tenant career-site detail pages are
 * client-rendered (their JSON-LD is still hydrating on a no-JS fetch), so role
 * detail is read from the fully server-rendered apex page for each `{jobId}`.
 */
export const SNAPHUNT_DETAIL_TEMPLATE = 'https://snaphunt.com/jobs/{jobId}';

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: the public DTO
 * default is small, but when a caller omits `resultsWanted` entirely we ingest
 * up to 100 of the tenant's open roles.
 */
export const SNAPHUNT_DEFAULT_RESULTS = 100;

/** Default request headers. The platform expects a browser-like UA. */
export const SNAPHUNT_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Extracts each `<loc>…</loc>` value from the sitemap XML. */
export const SNAPHUNT_SITEMAP_LOC_REGEX = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;

/** Extracts a single `<lastmod>…</lastmod>` value from a sitemap `<url>` block. */
export const SNAPHUNT_LASTMOD_REGEX = /<lastmod>\s*([^<\s]+)/i;

/**
 * Matches a tenant job-detail URL (in the sitemap's `<loc>` entries), capturing
 * the job id. Snaphunt career-site detail URLs are `…/job/{jobId}` (the apex
 * board uses `/jobs/{jobId}`); the job id is an alphanumeric token. Non-job pages
 * (the career-site home, about, etc.) carry no id and are skipped.
 */
export const SNAPHUNT_JOB_URL_REGEX = /\/jobs?\/([A-Za-z0-9]{6,})(?:[/?#]|$)/;

/**
 * Extracts every `<script type="application/ld+json">…</script>` block's inner
 * JSON text from a detail page. A page may carry several JSON-LD blocks
 * (Organization, BreadcrumbList, JobPosting); we scan them all for the
 * `JobPosting` object.
 */
export const SNAPHUNT_JSONLD_REGEX =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Extracts a `<meta property="og:…" content="…">` / `<meta name="…" content="…">` value. */
export const SNAPHUNT_OG_TITLE_REGEX = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i;
export const SNAPHUNT_OG_URL_REGEX = /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']*)["']/i;
export const SNAPHUNT_OG_DESCRIPTION_REGEX =
  /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']\s*\/?>/i;
export const SNAPHUNT_TITLE_TAG_REGEX = /<title>([\s\S]*?)<\/title>/i;

/**
 * Literal placeholder tokens the client-rendered career-site shell emits before
 * its JSON-LD hydrates (`"undefined"` / `"null"`). Treated as "field absent".
 */
export const SNAPHUNT_PLACEHOLDER_VALUES = new Set(['undefined', 'null', '']);

/** Detects remote / work-from-anywhere roles across the title, location, and body text. */
export const SNAPHUNT_REMOTE_REGEX =
  /\b(remote|work\s*from\s*(?:home|anywhere)|wfh|telecommute|fully\s*remote|anywhere)\b/i;
