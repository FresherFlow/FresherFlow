const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function normalizeUrl(value: string | undefined, fallback: string): string {
    const raw = (value || '').trim();
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
    const raw = (value || '').trim();
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
    process.env.PUBLIC_WEB_URL,
    getFallbackUrlFromHost(
        process.env.PUBLIC_WEB_HOST ||
        process.env.NEXT_PUBLIC_PUBLIC_WEB_HOST ||
        process.env.NEXT_PUBLIC_SITE_URL
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
    process.env.NEXT_PUBLIC_SITE_URL,
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
