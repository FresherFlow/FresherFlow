import { logger } from '../logger.js';
import { currentAccessToken } from './token.js';

/**
 * The one authenticated HTTP client for the FresherFlow API.
 *
 * The MCP server holds NO business logic and NO database access: every tool is
 * an HTTP call, authenticated with the caller's own OAuth token. This process
 * holds no service key, so it cannot act as an unattributable identity.
 *
 * Resource modules in `src/api/` own endpoint paths and payload shapes; this
 * module owns how a request is made and how an upstream failure is reported.
 */

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

/** One field-level failure, as the API reports it. */
interface ApiFieldIssue {
    field: string;
    message: string;
}

interface SafeApiError {
    message: string;
    details?: unknown;
}

function asFieldIssues(details: unknown): ApiFieldIssue[] {
    if (!Array.isArray(details)) return [];
    return details.flatMap((entry) => {
        if (typeof entry === 'string' && entry.trim()) return [{ field: '', message: entry.trim() }];
        if (!entry || typeof entry !== 'object') return [];
        const record = entry as Record<string, unknown>;
        const field = typeof record.field === 'string' ? record.field : '';
        const message = typeof record.message === 'string' ? record.message : '';
        if (!message.trim()) return [];
        return [{ field, message: message.trim() }];
    });
}

/**
 * Build a safe, useful error from a non-2xx upstream response.
 *
 * The API returns `{ error: { message, details } }`, where `details` names every
 * failing field. Dropping `details` (and slicing the message at 300 chars) is
 * why an agent used to see only the first problem, or a bare "API error (400)".
 */
async function toSafeApiError(res: Response): Promise<SafeApiError> {
    const fallback = `FresherFlow API error (${res.status})`;
    try {
        const contentType = res.headers.get('content-type') ?? '';
        const text = await readBoundedText(res, 16_384);
        if (!text || contentType.includes('text/html') || /^\s*</.test(text)) return { message: fallback };
        const body = JSON.parse(text) as {
            error?: { message?: unknown; details?: unknown };
            message?: unknown;
            details?: unknown;
        };
        const details = body?.error?.details ?? body?.details;
        const raw = body?.error?.message ?? body?.message;
        const base = typeof raw === 'string' && raw.trim() ? scrubErrorText(raw) : fallback;

        // Append any detail the message does not already mention, one line per
        // field. Duplicates are common because Zod's message is the same list.
        const missing = asFieldIssues(details).filter((issue) => {
            if (!issue.field) return false;
            return !base.includes(issue.field);
        });
        const withDetails = missing.length > 0
            ? `${base}\n${missing.map((issue) => `- ${issue.field}: ${issue.message}`).join('\n')}`
            : base;

        // 2000 chars fits a full field list; 300 used to cut later fields off.
        return { message: withDetails.slice(0, 2000) || fallback, details };
    } catch {
        return { message: fallback };
    }
}

/** Read a response without allowing an upstream body to consume unbounded memory. */
async function readBoundedText(res: Response, maxBytes: number): Promise<string> {
    if (!res.body) return '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let totalBytes = 0;
    const chunks: string[] = [];
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            if (totalBytes > maxBytes) {
                await reader.cancel();
                throw new Error('FresherFlow API response exceeded the configured size limit');
            }
            chunks.push(decoder.decode(value, { stream: true }));
        }
        chunks.push(decoder.decode());
        return chunks.join('');
    } finally {
        reader.releaseLock();
    }
}

function discardResponseBody(res: Response): void {
    if (!res.body) return;
    try {
        void res.body.cancel().catch(() => {});
    } catch {
        // Body cleanup is best-effort; the HTTP status remains authoritative.
    }
}

/**
 * A failure that carries the HTTP status it should be answered with.
 *
 * `worker.ts` maps this to a response by `status` — never by message text:
 * the API's wording is human-readable and changes, and matching on it is what
 * once turned an inactive account's 403 ("…not active…") into a 401
 * "reconnect" challenge. Transport failures (unreachable, timeout,
 * unparseable body) stay plain `Error`s: they have no upstream status and
 * map to a generic internal error.
 */
export class ApiHttpError extends Error {
    readonly status: number;
    /** Field-level issues from the API, when the error carries them. */
    readonly details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = 'ApiHttpError';
        this.status = status;
        this.details = details;
    }
}

let apiBaseUrl: string;

export function setApiBaseUrl(url: string): void {
    const parsed = new URL(url);
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
        || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
        throw new Error('FresherFlow API URL must be a plain HTTP(S) origin');
    }
    apiBaseUrl = parsed.origin;
}

/** One authenticated request. Every API module goes through this. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!apiBaseUrl) throw new Error('FresherFlow API URL is not configured');
    const url = new URL(path, apiBaseUrl);
    // Tool modules pass fixed relative paths; enforce that invariant so a bad
    // path cannot turn this authenticated client into an arbitrary fetch proxy.
    if (url.origin !== apiBaseUrl || !path.startsWith('/')) {
        throw new Error('FresherFlow API requests must stay on the configured origin');
    }

    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-From': FIRST_PARTY_CLIENT_HEADER,
    };

    // The only credential this server ever holds is the caller's own token.
    const callerToken = currentAccessToken();
    if (!callerToken) {
        // No token in the request scope is a credential problem, not a server
        // bug: answer with the same 401 challenge as an upstream rejection.
        throw new ApiHttpError(
            'FresherFlow tools need a signed-in account. Ask the user to connect FresherFlow '
            + 'and sign in, then retry.',
            401,
        );
    }
    headers['Authorization'] = `Bearer ${callerToken}`;

    if (init.headers) {
        for (const [key, value] of Object.entries(init.headers as Record<string, string>)) {
            headers[key] = value;
        }
    }

    let res: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
        res = await fetch(url, {
            ...init,
            headers,
            signal: controller.signal,
            // Cloudflare Workers supports `follow` and `manual`, not `error`.
            // Manual keeps API calls on the configured origin and lets the
            // status mapper fail closed on any redirect.
            redirect: 'manual',
        });
        if (res.status === 404) {
            discardResponseBody(res);
            throw new ApiHttpError('The requested FresherFlow API endpoint was not found.', 404);
        }
        if (res.status === 401 || res.status === 403) {
            logger.error('FresherFlow API rejected the caller credentials', { path, status: res.status });
            // A 403 is an authorization decision, not a broken credential.
            if (res.status === 403) {
                const safe = await toSafeApiError(res);
                throw new ApiHttpError(safe.message, 403, safe.details);
            }
            discardResponseBody(res);
            throw new ApiHttpError(
                'FresherFlow rejected this connection\'s access token. Disconnect and reconnect '
                + 'FresherFlow in your AI client to sign in again.',
                401,
            );
        }
        if (!res.ok) {
            logger.error('FresherFlow API request failed', { path, status: res.status });
            const safe = await toSafeApiError(res);
            throw new ApiHttpError(safe.message, res.status, safe.details);
        }
        try {
            const contentType = res.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) throw new Error('Unexpected content type');
            return JSON.parse(await readBoundedText(res, 5_242_880)) as T;
        } catch {
            logger.error('FresherFlow API returned an invalid or oversized JSON response', { path });
            throw new Error('Unexpected response from the FresherFlow API. Please try again shortly.');
        }
    } catch (error) {
        if (error instanceof ApiHttpError) throw error;
        logger.error('FresherFlow API unreachable or timed out', { path });
        throw new Error('Cannot reach the FresherFlow API. Please try again shortly.');
    } finally {
        clearTimeout(timeoutId);
    }
}
