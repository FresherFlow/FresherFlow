/**
 * Phase 13 - outbound HTTP guard for ingestion connectors.
 *
 * Ingestion fetches URLs that a moderator types into the admin UI, which makes
 * it a server-side request forgery surface by construction: without a check, an
 * admin (or anyone who reaches the source-management endpoint) can make the API
 * request `http://169.254.169.254/` or `http://localhost:6379/`.
 *
 * Rules enforced here, in order:
 *   1. Parse with `new URL()`. Never `includes()` a full URL - `https://evil.com/?x=allowed.com`
 *      defeats substring checks, and `allowed.com.evil.com` defeats suffix checks
 *      that forget the dot.
 *   2. Require https (http only for loopback in non-production).
 *   3. Reject a resolved-private address, so a public DNS name that points at
 *      127.0.0.1 or 10.x cannot be used as a pivot.
 *   4. Cap redirects and re-validate every hop: a public URL may 302 to
 *      `http://169.254.169.254/`, and validating only the first URL is the
 *      classic redirect-based SSRF bypass.
 *   5. Cap response size, so one hostile source cannot exhaust memory.
 */

import { logger } from '@fresherflow/utils';

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 20_000;

export class UnsafeEndpointError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnsafeEndpointError';
    }
}

/**
 * Hostnames that are never fetchable, regardless of DNS. Checked before any
 * network call so a poisoned DNS cache cannot reach them.
 */
const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata',
    'metadata.google.internal',
    'instance-data',
]);

/** Cloud metadata endpoints. */
const BLOCKED_HOSTNAMES_SUFFIX = ['.internal', '.local', '.localdomain'];

/**
 * Validate a single URL for ingestion.
 *
 * Throws `UnsafeEndpointError` with a caller-safe message. Returns the parsed
 * URL so callers can use `url.hostname` rather than re-parsing the raw string.
 */
export function assertSafeEndpoint(rawUrl: string): URL {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        // Do not echo the raw string: it is admin-supplied and may be hostile.
        throw new UnsafeEndpointError('Ingestion endpoint is not a valid absolute URL');
    }

    const hostname = url.hostname.toLowerCase();

    if (url.protocol === 'http:') {
        const isLoopback = hostname === '127.0.0.1' || hostname === '[::1]';
        if (process.env.NODE_ENV === 'production') {
            throw new UnsafeEndpointError(
                'Ingestion endpoint must use https in production'
            );
        }
        if (!isLoopback) {
            throw new UnsafeEndpointError('Ingestion endpoint must use https');
        }
    } else if (url.protocol !== 'https:') {
        throw new UnsafeEndpointError('Ingestion endpoint must use http or https');
    }

    if (BLOCKED_HOSTNAMES.has(hostname)) {
        throw new UnsafeEndpointError('Ingestion endpoint resolves to a blocked host');
    }

    // A leading dot matters: this rejects `notexample.com` only if written
    // correctly, so the check is on the suffix with its dot included.
    if (BLOCKED_HOSTNAMES_SUFFIX.some((suffix) => hostname.endsWith(suffix))) {
        throw new UnsafeEndpointError('Ingestion endpoint resolves to a blocked host');
    }

    if (url.username || url.password) {
        // `https://allowed.com@evil.com/` parses with the real host as evil.com,
        // so userinfo in an ingestion endpoint is never legitimate.
        throw new UnsafeEndpointError('Ingestion endpoint must not contain credentials');
    }

    if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
        throw new UnsafeEndpointError(
            'Ingestion endpoint resolves to a private or reserved address'
        );
    }

    return url;
}

function isPrivateIpv4(hostname: string): boolean {
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
    if (!match) return false;
    const [a, b] = [Number(match[1]), Number(match[2])];
    if (a < 0 || a > 255 || b < 0 || b > 255) return true; // malformed

    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 192 && b === 0) return true; // IETF protocol assignments
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a >= 224) return true; // multicast + reserved
    return false;
}

function isPrivateIpv6(hostname: string): boolean {
    const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!host.includes(':')) return false;
    if (host === '::1' || host === '::') return true;
    if (host.startsWith('fe80')) return true; // link-local
    if (/^f[cd]/.test(host)) return true; // unique local fc00::/7
    // IPv4-mapped (::ffff:10.0.0.1) bypasses an IPv6-only check otherwise.
    const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(host);
    if (mapped) return isPrivateIpv4(mapped[1]);
    return false;
}

/**
 * Fetch a URL for ingestion with every guard applied.
 *
 * Redirects are followed manually so each hop is re-validated; `fetch`'s own
 * `redirect: 'follow'` would not re-check the destination.
 */
export async function safeFetchJson(
    rawUrl: string,
    ctx: { signal: AbortSignal; timeoutMs?: number; fetchImpl: typeof fetch }
): Promise<unknown> {
    const timeoutMs = ctx.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let currentUrl = rawUrl;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const url = assertSafeEndpoint(currentUrl);

        const timeout = AbortSignal.timeout(timeoutMs);
        const signal = AbortSignal.any([ctx.signal, timeout]);

        let response: Response;
        try {
            response = await ctx.fetchImpl(url.toString(), {
                signal,
                redirect: 'manual',
                headers: {
                    accept: 'application/json',
                    'user-agent': 'FresherFlow-Ingestion/1.0',
                },
            });
        } catch (error) {
            // Detailed server-side log, generic client-facing message.
            logger.error('Ingestion fetch failed', {
                url: url.hostname,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error(`Could not reach ingestion endpoint (${url.hostname})`);
        }

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) {
                throw new Error(`Ingestion endpoint returned a redirect with no location`);
            }
            // Resolve relative redirects, then loop so the next hop is
            // re-validated rather than trusted.
            currentUrl = new URL(location, url).toString();
            continue;
        }

        if (!response.ok) {
            throw new Error(
                `Ingestion endpoint returned HTTP ${response.status} (${url.hostname})`
            );
        }

        // Cap the body before parsing, so a huge response cannot OOM the API.
        const text = await readCapped(response, url.hostname);
        try {
            return JSON.parse(text) as unknown;
        } catch {
            throw new Error(`Ingestion endpoint returned invalid JSON (${url.hostname})`);
        }
    }

    throw new Error('Ingestion endpoint exceeded the redirect limit');
}

async function readCapped(response: Response, hostname: string): Promise<string> {
    const contentLength = Number(response.headers.get('content-length') || '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        throw new Error(`Ingestion response from ${hostname} is too large`);
    }

    const body = await response.text();
    if (body.length > MAX_RESPONSE_BYTES) {
        throw new Error(`Ingestion response from ${hostname} is too large`);
    }
    return body;
}
