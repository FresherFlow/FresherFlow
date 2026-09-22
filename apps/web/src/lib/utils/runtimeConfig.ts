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

export const SITE_URL = normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.PUBLIC_WEB_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL,
    getFallbackUrlFromHost(
        process.env.PUBLIC_WEB_HOST ||
        process.env.NEXT_PUBLIC_PUBLIC_WEB_HOST ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL
    ) || getFallbackUrl(3000)
);

export const API_URL = normalizeUrl(
    process.env.NEXT_PUBLIC_USER_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL,
    getFallbackUrl(5000)
);

export const SHARE_BASE_URL = normalizeUrl(
    process.env.NEXT_PUBLIC_SHARE_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL,
    SITE_URL
);

export const PUBLIC_WEB_HOST = normalizeHost(
    process.env.PUBLIC_WEB_HOST ||
    process.env.NEXT_PUBLIC_PUBLIC_WEB_HOST ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL,
    getFallbackHost()
);

export const APP_WEB_HOST = normalizeHost(
    process.env.APP_WEB_HOST ||
    process.env.NEXT_PUBLIC_APP_WEB_HOST,
    getFallbackHost()
);

export const ADMIN_WEB_HOST = normalizeHost(
    process.env.ADMIN_WEB_HOST ||
    process.env.NEXT_PUBLIC_ADMIN_WEB_HOST,
    getFallbackHost()
);

export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL as string;

/**
 * Feed source switch (testing).
 *
 * FEED_SOURCE=cdn  (default) — all feeds come from the production CDN.
 * FEED_SOURCE=local           — all feeds come from local static JSON files
 *                               served by Next itself (apps/web/public/…).
 *                               Override the host with LOCAL_FEED_URL.
 *                               No signatures, no network dependency: lets us
 *                               test pages, Lighthouse and scale offline.
 */
const FEED_SOURCE = (process.env.FEED_SOURCE || 'cdn').toLowerCase();
export const IS_LOCAL_FEED = FEED_SOURCE === 'local';

export const LOCAL_FEED_BASE =
    (process.env.LOCAL_FEED_URL && process.env.LOCAL_FEED_URL.replace(/\/+$/, '')) ||
    (IS_LOCAL_FEED ? SITE_URL : '');

/** CDN when live; the local static host when FEED_SOURCE=local. */
export const FEED_CDN_BASE = IS_LOCAL_FEED ? LOCAL_FEED_BASE : CDN_URL;

export const BOOTSTRAP_FEED_URL =
    process.env.NEXT_PUBLIC_BOOTSTRAP_FEED_URL ||
    process.env.BOOTSTRAP_FEED_URL ||
    `${FEED_CDN_BASE}/feeds/bootstrap-feed.min.json`;

export const FEED_INDEX_URL =
    process.env.NEXT_PUBLIC_FEED_INDEX_URL ||
    `${FEED_CDN_BASE}/feeds/feed-index.json`;

export const EXPIRED_FEED_URL =
    process.env.NEXT_PUBLIC_EXPIRED_FEED_URL ||
    process.env.EXPIRED_FEED_URL ||
    `${FEED_CDN_BASE}/feeds/expired-feed.min.json`;

export const GOVERNMENT_FEED_URL =
    process.env.NEXT_PUBLIC_GOVERNMENT_FEED_URL ||
    process.env.GOVERNMENT_FEED_URL ||
    `${FEED_CDN_BASE}/feeds/government-feed.json`;

export const FEED_VERSION_URL =
    IS_LOCAL_FEED ? `${FEED_CDN_BASE}/feeds/feed-version.json` : `${CDN_URL}/meta/feed-version.json`;

export const SITEMAP_DATA_URL =
    process.env.NEXT_PUBLIC_SITEMAP_DATA_URL ||
    process.env.SITEMAP_DATA_URL ||
    `${FEED_CDN_BASE}/sitemaps/sitemap-data.json`;

export const LINKS_FEED_URL =
    process.env.NEXT_PUBLIC_LINKS_FEED_URL ||
    process.env.LINKS_FEED_URL ||
    `${FEED_CDN_BASE}/feeds/links.min.json`;

export const GET_CATEGORY_SHARD_URL = (id: string) =>
    `${FEED_CDN_BASE}/categories/${id}.json`;

export const GET_COMPANY_SHARD_URL = (slug: string) =>
    `${FEED_CDN_BASE}/companies/${slug}.json`;

export const EDUCATION_METADATA_URL = `${FEED_CDN_BASE}/education.json`;

export const SKILLS_METADATA_URL = `${FEED_CDN_BASE}/skills.json`;

export const COMPANIES_METADATA_URL = `${FEED_CDN_BASE}/companies.json`;

export const CITIES_METADATA_URL = `${FEED_CDN_BASE}/cities.json`;

