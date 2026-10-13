import { logger } from './logger.js';
import { config } from './config.js';
import { SubmitOpportunityInput, SubmitOpportunityOutput } from './schemas.js';

/**
 * Thin client over the existing FresherFlow API.
 *
 * The MCP server holds NO business logic and NO database access — the single
 * tool call goes through POST /api/opportunities/mcp-submit.
 */

const API_BASE_URL = config.apiBaseUrl;
const API_KEY = process.env.FRESHERFLOW_API_KEY;

// The API's CSRF gate rejects any non-safe method without this header (or the
// INTERNAL_API_SECRET as x-api-key). Browsers cannot set it cross-origin, so it
// does not weaken CSRF. Without it the POST returns 403.
const FIRST_PARTY_CLIENT_HEADER = 'fresherflow-client';

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

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(path, API_BASE_URL);
    // Defense-in-depth: only allow http(s) to the configured API origin.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Unsupported API protocol');
    }

    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-From': FIRST_PARTY_CLIENT_HEADER,
    };
    if (API_KEY) headers['x-api-key'] = API_KEY;
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
        throw new Error('The submission endpoint was not found on the FresherFlow API.');
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

// ─── submit_opportunity ──────────────────────────────────────────────────────

/**
 * Submit an opportunity for FresherFlow moderation.
 * The server NEVER fetches jobUrl/sourceUrl — they are stored as data only.
 * Returns PENDING_REVIEW unless the opportunity already exists.
 */
export async function submitOpportunity(input: SubmitOpportunityInput): Promise<SubmitOpportunityOutput> {
    const body: Record<string, unknown> = {
        title: input.title,
        companyName: input.companyName,
        jobUrl: input.jobUrl,
    };
    if (input.location) body.location = input.location;
    if (input.employmentType) body.employmentType = input.employmentType;
    if (input.category) body.category = input.category;
    if (input.dates) body.dates = input.dates;
    if (input.dateRange) body.dateRange = input.dateRange;
    if (input.timeRange) body.timeRange = input.timeRange;
    if (input.venueAddress) body.venueAddress = input.venueAddress;
    if (input.salary) body.salary = input.salary;
    if (input.description) body.description = input.description;
    if (input.eligibility) body.eligibility = input.eligibility;
    if (input.sourceUrl) body.sourceUrl = input.sourceUrl;
    if (input.contactEmail) body.contactEmail = input.contactEmail;

    // Bulk tiering rides the x-api-key header, never the body: per-call key
    // first (the operator pasting it into chat), server env key second, none
    // third (anonymous 10/hour tier). The key is never logged anywhere here.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (input.submitKey) headers['x-api-key'] = input.submitKey;

    const data = await apiFetch<SubmitOpportunityOutput>('/api/opportunities/mcp-submit', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    return SubmitOpportunityOutput.parse(data);
}
