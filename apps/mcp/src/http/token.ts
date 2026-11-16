import { AsyncLocalStorage } from 'node:async_hooks';

/** Bind each caller's token to its request so concurrent Worker requests never share identity. */
const accessTokenStore = new AsyncLocalStorage<string>();

export function currentAccessToken(): string | null {
  return accessTokenStore.getStore() ?? null;
}

export function runWithAccessToken<T>(token: string, fn: () => Promise<T>): Promise<T> {
  return accessTokenStore.run(token, fn);
}

/** Read a bearer token from request headers. Case-insensitive per RFC 7235. */
export function bearerFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match ? match[1].trim() : null;
}
