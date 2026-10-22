import { logger } from '../logger.js';
import { config } from '../config.js';
import { currentAccessToken } from './token.js';

/**
 * The one authenticated HTTP client for the FresherFlow API.
 *
 * The MCP server holds NO business logic and NO database access: every tool is
 * an HTTP call, authenticated with the caller's own OAuth token. There is no
 * service-key path — an MCP connection without a signed-in account cannot do
 * anything, which is the whole point of the surface.
 *
 * Resource modules in `src/api/` own endpoint paths and payload shapes; this
 * module owns how a request is made and how an upstream failure is reported.
 */

const API_BASE_URL = config.apiBaseUrl;

// The API's CSRF gate rejects any non-safe method without this header. Browsers
// cannot set it cross-origin, so it does not weaken CSRF. Without it the POST
// returns 403.
const FIRST_PARTY_CLIENT_HEADER = 'fresherflow-client';

/** JSON headers for endpoints that take a body. The token is added by `apiFetch`. */
export const jsonHeaders = (): Record<string, string> => ({ 'Content-Type': 'application/json' });

/**
 * Strip filesystem paths and V8 stack frames from an upstream message so
 * server internals can never leak to MCP clients. URLs are left intact.
 */
function scrubErrorText(value: string): string {
    return value
        .replace(/[A-Za-z]:\\[^\s"'<>]*/g, '[path]')
        .replace(/\/[^\s"'<>]*node_modules\/[^\s"'<>]*/g, '[path]')
        .replace(/\n\s*at\s+[^\n]*/g, '')
        .trim();
}

/**
 * Build a safe, useful error message from a non-2xx upstream response.
 * Forwards the upstream message (minus paths/stacks); HTML bodies and
 * unparseable payloads collapse to a generic status message.
 */
async function toSafeApiError(res: Response): Promise<string> {
    const fallback = `FresherFlow API error (${res.status})`;
    try {
        const contentType = res.headers.get('content-type') ?? '';
        const text = await res.text();
        if (!text || contentType.includes('text/html') || /^\s*</.test(text)) return fallback;
        const body = JSON.parse(text) as { error?: { message?: unknown }; message?: unknown };
        const raw = body?.error?.message ?? body?.message;
        if (typeof raw !== 'string' || !raw.trim()) return fallback;
        return scrubErrorText(raw).slice(0, 300) || fallback;
    } catch {
        return fallback;
    }
}

/** One authenticated request. Every API module goes through this. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(path, API_BASE_URL);
    // Defense-in-depth: only allow http(s) to the configured API origin.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Unsupported API protocol');
    }

    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-From': FIRST_PARTY_CLIENT_HEADER,
    };
    // The caller's token is the only credential this client ever sends. A call
    // that reaches here without one is a bug in the transport, and it must fail
    // loudly rather than act as a service identity nobody signed in for.
    const callerToken = currentAccessToken();
    if (!callerToken) {
        throw new Error(
            'FresherFlow tools need a signed-in account. Ask the user to connect FresherFlow '
            + 'and sign in, then retry.',
        );
    }
    headers['Authorization'] = `Bearer ${callerToken}`;
    if (init.headers) {
        for (const [key, value] of Object.entries(init.headers as Record<string, string>)) {
            headers[key] = value;
        }
    }

    let res: Response;
    try {
        res = await fetch(url, {
            ...init,
            headers,
            signal: AbortSignal.timeout(10_000),
        });
    } catch {
        logger.error('FresherFlow API unreachable', { path });
        throw new Error('Cannot reach the FresherFlow API. Please try again shortly.');
    }
    if (res.status === 404) {
        throw new Error('The requested FresherFlow API endpoint was not found.');
    }
    if (res.status === 401 || res.status === 403) {
        logger.error('FresherFlow API rejected the caller credentials', { path, status: res.status });
        // With a caller token, a 403 is an authorization decision, not a broken
        // credential: the API is saying which permission is missing. Forward that
        // explanation — replacing it with "reconnect" would send the user to a
        // login page that cannot fix a permission problem.
        if (res.status === 403) {
            throw new Error(await toSafeApiError(res));
        }
        throw new Error(
            'FresherFlow rejected this connection\'s access token. Disconnect and reconnect '
            + 'FresherFlow in your AI client to sign in again.',
        );
    }
    if (!res.ok) {
        logger.error('FresherFlow API request failed', { path, status: res.status });
        throw new Error(await toSafeApiError(res));
    }
    try {
        return (await res.json()) as T;
    } catch {
        logger.error('FresherFlow API returned a non-JSON response', { path });
        throw new Error('Unexpected response from the FresherFlow API. Please try again shortly.');
    }
}
