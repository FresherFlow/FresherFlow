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

const DEFAULT_CDN_HOST = 'https://cdn.fresherflow.in';

export const BOOTSTRAP_FEED_URL =
    process.env.NEXT_PUBLIC_BOOTSTRAP_FEED_URL ||
    process.env.BOOTSTRAP_FEED_URL ||
    (process.env.NEXT_PUBLIC_CDN_URL
        ? `${process.env.NEXT_PUBLIC_CDN_URL}/bootstrap-feed.min.json`
        : `${DEFAULT_CDN_HOST}/bootstrap-feed.min.json`);

export const SITEMAP_DATA_URL =
    process.env.NEXT_PUBLIC_SITEMAP_DATA_URL ||
    process.env.SITEMAP_DATA_URL ||
    (process.env.NEXT_PUBLIC_CDN_URL
        ? `${process.env.NEXT_PUBLIC_CDN_URL}/sitemap-data.json`
        : `${DEFAULT_CDN_HOST}/sitemap-data.json`);

export const GET_CATEGORY_SHARD_URL = (id: string) =>
    process.env.NEXT_PUBLIC_CDN_URL
        ? `${process.env.NEXT_PUBLIC_CDN_URL}/categories/${id}.json`
        : `${DEFAULT_CDN_HOST}/categories/${id}.json`;

export const EDUCATION_METADATA_URL =
    process.env.NEXT_PUBLIC_CDN_URL
        ? `${process.env.NEXT_PUBLIC_CDN_URL}/education.json`
        : `${DEFAULT_CDN_HOST}/education.json`;

export const SKILLS_METADATA_URL =
    process.env.NEXT_PUBLIC_CDN_URL
        ? `${process.env.NEXT_PUBLIC_CDN_URL}/skills.json`
        : `${DEFAULT_CDN_HOST}/skills.json`;

export const CITIES_METADATA_URL =
    process.env.NEXT_PUBLIC_CDN_URL
        ? `${process.env.NEXT_PUBLIC_CDN_URL}/cities.json`
        : `${DEFAULT_CDN_HOST}/cities.json`;

