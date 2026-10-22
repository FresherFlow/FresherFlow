import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The caller's OAuth 2.1 access token, scoped to one HTTP request.
 *
 * The MCP server is stateless: one server + transport per request. The transport
 * runs each request inside `runWithAccessToken`, so a tool call made while
 * handling that request reads the right token, and two concurrent callers can
 * never see each other's credential. A module-level variable would race.
 *
 * This is the only place a token is stored. Everything else asks
 * `currentAccessToken()` through the HTTP client.
 */
const accessTokenStore = new AsyncLocalStorage<{ token: string | null }>();

export function runWithAccessToken<T>(token: string | null, run: () => T): T {
    return accessTokenStore.run({ token }, run);
}

/** The token for the request currently being handled, if any. */
export function currentAccessToken(): string | null {
    return accessTokenStore.getStore()?.token ?? null;
}

/** Reads the caller credential off an incoming MCP request. */
export function bearerFromHeaders(headers: Record<string, unknown>): string | null {
    const raw = headers['authorization'];
    const value = Array.isArray(raw) ? String(raw[0]) : typeof raw === 'string' ? raw : '';
    return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : null;
}
