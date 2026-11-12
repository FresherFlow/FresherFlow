import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The caller's access token for the duration of one request.
 *
 * A module-level variable is not safe here: a Worker isolate handles concurrent
 * requests and interleaves them at every `await`, so one caller's token would be
 * visible to another caller's API call. AsyncLocalStorage keeps the token bound
 * to the request that arrived with it.
 *
 * The token is never logged.
 */
const accessTokenStore = new AsyncLocalStorage<string>();

/** The bearer token of the request currently being served, if any. */
export function currentAccessToken(): string | null {
  return accessTokenStore.getStore() ?? null;
}

/** Run `fn` with `token` bound as the current caller's token. */
export function runWithAccessToken<T>(token: string, fn: () => Promise<T>): Promise<T> {
  return accessTokenStore.run(token, fn);
}

/**
 * Marks one request as running in the local-dev no-auth scope
 * (`MCP_AUTH_MODE=local_noauth`), where there is no caller token at all.
 *
 * Separate store, same reason as the token: a module-level flag would leak
 * across concurrent requests in one isolate, so a tool call from a normal
 * OAuth request could be mistaken for a local-dev one. There is no shared
 * state between the two scopes — a request carries exactly one of them.
 */
const localDevStore = new AsyncLocalStorage<true>();

/** True while the current request runs in the local-dev no-auth scope. */
export function isLocalDevScope(): boolean {
  return localDevStore.getStore() === true;
}

/** Run `fn` in the local-dev scope: no access token, no OAuth challenge. */
export function runWithLocalDevScope<T>(fn: () => Promise<T>): Promise<T> {
  return localDevStore.run(true, fn);
}

/** Read a bearer token from request headers. Case-insensitive per RFC 7235. */
export function bearerFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match ? match[1].trim() : null;
}
