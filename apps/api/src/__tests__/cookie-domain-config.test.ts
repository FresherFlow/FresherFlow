/**
 * The cookie domain is what lets the web app and the API share a session.
 *
 * When it cannot be derived, the API's cookies are host-only on the API host,
 * the web proxy never sees them, and the OAuth handoff bounces between /login
 * and /oauth/authorize. `apps/api/src/index.ts` logs that at boot; these cases
 * pin the resolution rules so a refactor cannot quietly remove the derivation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = [
    'AUTH_COOKIE_DOMAIN',
    'ADMIN_COOKIE_DOMAIN',
    'COOKIE_DOMAIN',
    'PUBLIC_FRONTEND_URL',
    'PUBLIC_WEB_URL',
    'APP_FRONTEND_URL',
    'ADMIN_FRONTEND_URL',
    'FRONTEND_URL',
    'FRONTEND_URLS',
] as const;

const saved = new Map<string, string | undefined>();

beforeEach(() => {
    for (const key of ENV_KEYS) {
        saved.set(key, process.env[key]);
        delete process.env[key];
    }
    vi.resetModules();
});

afterEach(() => {
    for (const key of ENV_KEYS) {
        const value = saved.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

async function getCookieDomain(): Promise<string | undefined> {
    const mod = await import('../utils/runtimeConfig');
    return mod.getCookieDomain();
}

describe('getCookieDomain', () => {
    it('uses the explicit setting and normalizes it to a leading dot', async () => {
        process.env.AUTH_COOKIE_DOMAIN = 'fresherflow.in';
        await expect(getCookieDomain()).resolves.toBe('.fresherflow.in');

        vi.resetModules();
        process.env.AUTH_COOKIE_DOMAIN = '.fresherflow.in';
        await expect(getCookieDomain()).resolves.toBe('.fresherflow.in');
    });

    it('derives the registrable domain from the configured web origin', async () => {
        process.env.PUBLIC_FRONTEND_URL = 'https://www.fresherflow.in';
        await expect(getCookieDomain()).resolves.toBe('.fresherflow.in');
    });

    it('prefers an explicit setting over a derived one', async () => {
        process.env.AUTH_COOKIE_DOMAIN = 'app.fresherflow.in';
        process.env.PUBLIC_FRONTEND_URL = 'https://fresherflow.in';
        await expect(getCookieDomain()).resolves.toBe('.app.fresherflow.in');
    });

    it('returns undefined when nothing is configured (the boot warning case)', async () => {
        await expect(getCookieDomain()).resolves.toBeUndefined();
    });
});
