function normalizeUrl(value: string | undefined, fallback: string): string {
    const raw = (value || '').trim();
    if (!raw) return fallback;
    try {
        const parsed = new URL(raw);
        return parsed.origin.replace(/\/+$/, '');
    } catch {
        try {
            return new URL(`https://${raw}`).origin.replace(/\/+$/, '');
        } catch {
            return fallback;
        }
    }
}

function normalizeHostFromUrl(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    }
}

export function getPublicSiteUrl(): string {
    return normalizeUrl(
        process.env.PUBLIC_FRONTEND_URL ||
        process.env.PUBLIC_WEB_URL ||
        process.env.FRONTEND_URL,
        'http://localhost:3000'
    );
}

export function getAppSiteUrl(): string {
    return normalizeUrl(
        process.env.APP_FRONTEND_URL ||
        process.env.APP_WEB_URL ||
        process.env.NEXT_PUBLIC_APP_WEB_URL ||
        process.env.FRONTEND_URL,
        getPublicSiteUrl()
    );
}

export function getAdminSiteUrl(): string {
    return normalizeUrl(
        process.env.ADMIN_FRONTEND_URL ||
        process.env.ADMIN_WEB_URL ||
        process.env.ADMIN_WEB_HOST,
        'http://localhost:3001'
    );
}

export function getAdminHost(): string {
    return normalizeHostFromUrl(getAdminSiteUrl());
}

export function getCanonicalShareOrigin(): string {
    const configuredOrigin =
        process.env.SOCIAL_FRONTEND_URL ||
        process.env.PUBLIC_FRONTEND_URL ||
        process.env.PUBLIC_WEB_URL ||
        process.env.FRONTEND_URL;

    if (!configuredOrigin) {
        return getPublicSiteUrl();
    }

    const normalized = normalizeUrl(configuredOrigin, getPublicSiteUrl());
    if (/localhost|127\.0\.0\.1/i.test(normalized)) {
        return getPublicSiteUrl();
    }

    return normalized;
}

export function getRootDomainHost(): string | null {
    const publicHost = normalizeHostFromUrl(getPublicSiteUrl());
    if (!publicHost || publicHost === 'localhost' || /^[0-9.]+$/.test(publicHost)) return null;
    const parts = publicHost.split('.').filter(Boolean);
    if (parts.length <= 2) return publicHost;
    return parts.slice(-2).join('.');
}
