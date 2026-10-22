const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function normalizeUrl(value: string | undefined, fallback: string): string {
    const raw = (value || '').split(',')[0].trim();
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

function normalizeHost(value: string | undefined, fallback = ''): string {
    const raw = (value || '').split(',')[0].trim();
    if (!raw) return fallback;
    try {
        return new URL(raw).hostname.toLowerCase();
    } catch {
        return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    }
}

function getConfiguredOrigins(): string[] {
    return [
        process.env.PUBLIC_FRONTEND_URL,
        process.env.PUBLIC_WEB_URL,
        process.env.APP_FRONTEND_URL,
        process.env.APP_WEB_URL,
        process.env.ADMIN_FRONTEND_URL,
        process.env.ADMIN_WEB_URL,
        process.env.FRONTEND_URL,
        ...(process.env.FRONTEND_URLS || '').split(','),
    ]
        .flatMap((value) => (value || '').split(','))
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => normalizeUrl(value, ''))
        .filter(Boolean);
}

function getFallbackOrigin(defaultPort: number): string {
    return IS_PRODUCTION ? '' : `http://localhost:${defaultPort}`;
}

function getFallbackHost(): string {
    return IS_PRODUCTION ? '' : 'localhost';
}

function getRootDomainFromOrigins(): string | null {
    const hosts = getConfiguredOrigins()
        .map((origin) => normalizeHost(origin))
        .filter((host) => host && host !== 'localhost' && !/^[0-9.]+$/.test(host));

    for (const host of hosts) {
        const parts = host.split('.').filter(Boolean);
        if (parts.length >= 2) {
            return parts.slice(-2).join('.');
        }
    }

    return null;
}

function getSiblingOrigin(prefix: '' | 'app' | 'admin'): string {
    const rootDomain = getRootDomainFromOrigins();
    if (!rootDomain) return '';
    const hostname = prefix ? `${prefix}.${rootDomain}` : rootDomain;
    return `https://${hostname}`;
}

export function getPublicSiteUrl(): string {
    return normalizeUrl(
        process.env.PUBLIC_FRONTEND_URL ||
        process.env.PUBLIC_WEB_URL ||
        process.env.FRONTEND_URL,
        getSiblingOrigin('') || getFallbackOrigin(3000)
    );
}

export function getAppSiteUrl(): string {
    return normalizeUrl(
        process.env.APP_FRONTEND_URL ||
        process.env.APP_WEB_URL ||
        process.env.NEXT_PUBLIC_APP_WEB_URL ||
        process.env.FRONTEND_URL,
        getSiblingOrigin('app') || getPublicSiteUrl() || getFallbackOrigin(3000)
    );
}

export function getAdminSiteUrl(): string {
    return normalizeUrl(
        process.env.ADMIN_FRONTEND_URL ||
        process.env.ADMIN_WEB_URL ||
        process.env.ADMIN_WEB_HOST,
        getSiblingOrigin('admin') || getFallbackOrigin(3001)
    );
}

export function getAdminHost(): string {
    return normalizeHost(
        process.env.ADMIN_WEB_HOST ||
        process.env.NEXT_PUBLIC_ADMIN_WEB_HOST ||
        getAdminSiteUrl(),
        getFallbackHost()
    );
}

export function getCanonicalShareOrigin(): string {
    return normalizeUrl(
        process.env.SOCIAL_FRONTEND_URL ||
        process.env.PUBLIC_FRONTEND_URL ||
        process.env.PUBLIC_WEB_URL ||
        process.env.FRONTEND_URL,
        getPublicSiteUrl() || getFallbackOrigin(3000)
    );
}

export function getRootDomainHost(): string | null {
    return getRootDomainFromOrigins();
}

/**
 * The API's own public origin. This is the OAuth 2.1 issuer identifier, and it
 * must be byte-identical everywhere it appears (metadata `issuer`, the `iss`
 * response parameter, and the protected-resource `authorization_servers` list):
 * OpenAI hosts compare it with exact string comparison and reject a mismatch.
 */
export function getApiPublicUrl(): string {
    return normalizeUrl(process.env.API_URL || process.env.PUBLIC_API_URL, getFallbackOrigin(5000));
}

/**
 * The MCP server's public origin — the OAuth 2.1 resource identifier. Distinct
 * from the API host: the MCP server is the resource server, the API is the
 * authorization server. Unset in production means the discovery documents cannot
 * name the resource, so `/oauth` reports it rather than guessing.
 */
export function getMcpPublicUrl(): string {
    return normalizeUrl(process.env.MCP_PUBLIC_URL, '');
}

export function getCookieDomain(): string | undefined {
    const explicit = normalizeHost(process.env.AUTH_COOKIE_DOMAIN || process.env.ADMIN_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN);
    if (explicit) {
        return explicit.startsWith('.') ? explicit : `.${explicit.replace(/^\./, '')}`;
    }

    const rootDomain = getRootDomainFromOrigins();
    if (!rootDomain) return undefined;
    return `.${rootDomain}`;
}
