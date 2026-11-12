const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function normalizeUrl(value: string | undefined, fallback: string): string {
    const raw = (value || '').trim().replace(/^['"]|['"]$/g, '');
    if (!raw) return fallback;
    try {
        return new URL(raw).origin.replace(/\/+$/, '');
    } catch {
        try {
            return new URL(`https://${raw}`).origin.replace(/\/+$/, '');
        } catch {
            return fallback;
        }
    }
}

function normalizeHost(value: string | undefined, fallback: string): string {
    const raw = (value || '').trim().replace(/^['"]|['"]$/g, '');
    if (!raw) return fallback;
    try {
        return new URL(raw).hostname.toLowerCase();
    } catch {
        return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    }
}

function getFallbackUrl(defaultPort: number): string {
    return IS_PRODUCTION ? '' : `http://localhost:${defaultPort}`;
}

function getFallbackHost(): string {
    return IS_PRODUCTION ? '' : 'localhost';
}

function getFallbackUrlFromHost(value: string | undefined): string {
    const host = normalizeHost(value, '');
    if (!host) return '';
    return `https://${host}`;
}

// NEXT_PUBLIC_SITE_URL is the one configured name. VERCEL_* are supplied
// automatically by the platform, so they are a safety net, not a second name.
export const SITE_URL = normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL,
    getFallbackUrlFromHost(
        process.env.PUBLIC_WEB_HOST ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL
    ) || getFallbackUrl(3000)
);

export const API_URL = normalizeUrl(
    process.env.NEXT_PUBLIC_API_URL,
    getFallbackUrl(5000)
);

/**
 * User and admin API bases, resolved once for both the browser client
 * (`core.ts`) and the server client (`server-client.ts`). Both used to carry a
 * private copy of this precedence.
 */
export const USER_API_URL = normalizeUrl(
    process.env.NEXT_PUBLIC_USER_API_URL,
    API_URL
);

export const USE_SEPARATE_ADMIN_API =
    process.env.NEXT_PUBLIC_USE_SEPARATE_ADMIN_API === 'true';

export const ADMIN_API_URL = USE_SEPARATE_ADMIN_API
    ? normalizeUrl(process.env.NEXT_PUBLIC_ADMIN_API_URL, API_URL)
    : API_URL;

export const SHARE_BASE_URL = normalizeUrl(
    process.env.NEXT_PUBLIC_SHARE_BASE_URL,
    SITE_URL
);

export const PUBLIC_WEB_HOST = normalizeHost(
    process.env.PUBLIC_WEB_HOST ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL,
    getFallbackHost()
);

export const ADMIN_WEB_HOST = normalizeHost(
    process.env.ADMIN_WEB_HOST,
    getFallbackHost()
);

/**
 * Validates a configured base URL while keeping any path prefix.
 *
 * `CDN_URL` used to be `process.env.NEXT_PUBLIC_CDN_URL as string`, so a
 * missing value produced `undefined/feeds/bootstrap-feed.min.json` at runtime
 * and every feed read failed with an unhelpful parser error. Returning the
 * fallback keeps the app serving from a known base instead.
 */
function normalizeBaseUrl(value: string | undefined, fallback: string): string {
    const raw = (value || '').trim().replace(/^['"]|['"]$/g, '');
    if (!raw) return fallback;
    try {
        const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return fallback;
        return url.toString().replace(/\/+$/, '');
    } catch {
        return fallback;
    }
}

/**
 * CDN base for feed snapshots. Required when FEED_SOURCE=cdn; an unset value
 * falls back to the API, which serves the same artifacts from Postgres — slower
 * than the CDN, but correct, and better than a base named `undefined`.
 */
export const CDN_URL = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_CDN_URL,
    API_URL
);

/**
 * Feed source switch.
 *
 * Postgres is the source of truth; the CDN serves derived snapshots of it.
 * This one flag selects which read path the web app uses — no consumer code
 * changes:
 *
 * FEED_SOURCE=cdn    (default) — production: feeds come from the CDN (R2 snapshots).
 * FEED_SOURCE=db                — local dev and pre-CDN testing: feeds come from
 *                                 the API, generated from Postgres. No signatures,
 *                                 no CDN dependency.
 *
 * There is no third mode. Local development is just the web app pointed at the
 * API; a checkout needs no feed files and no extra switch.
 */
const FEED_SOURCE = (process.env.FEED_SOURCE || 'cdn').toLowerCase();
export const IS_DB_FEED = FEED_SOURCE === 'db';

/**
 * CDN in production; the API (Postgres-backed feed routes) in db mode.
 */
export const FEED_CDN_BASE = IS_DB_FEED ? API_URL : CDN_URL;

// Every artifact derives from the one base above. There are deliberately no
// per-endpoint URL env vars: six independent overrides were six ways to point
// one page at a different host from the rest, and FEED_SOURCE already selects
// the base for all of them at once.
export const BOOTSTRAP_FEED_URL = `${FEED_CDN_BASE}/feeds/bootstrap-feed.min.json`;

export const FEED_INDEX_URL = `${FEED_CDN_BASE}/feeds/feed-index.json`;

export const EXPIRED_FEED_URL = `${FEED_CDN_BASE}/feeds/expired-feed.min.json`;

export const GOVERNMENT_FEED_URL = `${FEED_CDN_BASE}/feeds/government-feed.json`;

export const FEED_VERSION_URL = `${FEED_CDN_BASE}/meta/feed-version.json`;

/** Feed counts manifest — { opportunities, timestamp }. CDN in cdn mode, API (Postgres) in db mode. */
export const FEED_STATS_URL = `${FEED_CDN_BASE}/meta/stats.json`;

export const SITEMAP_DATA_URL = `${FEED_CDN_BASE}/sitemaps/sitemap-data.json`;

export const LINKS_FEED_URL = `${FEED_CDN_BASE}/feeds/links.min.json`;

export const GET_CATEGORY_SHARD_URL = (id: string) =>
    `${FEED_CDN_BASE}/categories/${id}.json`;

export const GET_COMPANY_SHARD_URL = (slug: string) =>
    `${FEED_CDN_BASE}/companies/${slug}.json`;

export const EDUCATION_METADATA_URL = `${FEED_CDN_BASE}/education.json`;

export const SKILLS_METADATA_URL = `${FEED_CDN_BASE}/skills.json`;

export const COMPANIES_METADATA_URL = `${FEED_CDN_BASE}/companies.json`;

/**
 * Every /companies/{slug} this platform has ever published, plus the retired
 * slug -> replacement map. The company page reads it so a crawled URL can only
 * ever 308 (renamed) or render (no jobs now) - never 404.
 */
export const COMPANY_SLUG_HISTORY_URL = `${FEED_CDN_BASE}/meta/company-slug-history.json`;

export const CITIES_METADATA_URL = `${FEED_CDN_BASE}/cities.json`;

