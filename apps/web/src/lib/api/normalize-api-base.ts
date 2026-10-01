/**
 * The one place an API base URL becomes something we can call.
 *
 * It exists because the browser client (`core.ts`) and the server client
 * (`server-client.ts`) each carried a character-identical private copy of it.
 * The two read *different* env vars — browser code can only see `NEXT_PUBLIC_*`,
 * while the server side prefers the unprefixed names and falls back to the
 * public ones — so the sources stay per-file and only the rule is shared.
 *
 * `https://` is assumed for a bare host, so a scheme-less value can never
 * resolve against our own origin, and the trailing slash is dropped so callers
 * can join paths with a single leading slash.
 */
export function normalizeApiBase(raw?: string): string {
    const value = (raw || '').trim();
    if (!value) return '';
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return withProtocol.replace(/\/+$/, '');
}
