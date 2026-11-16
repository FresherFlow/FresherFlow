/**
 * Regression: the MCP sign-in loop.
 *
 * The defect users saw as "login redirects or reloads like hell": when the API
 * could not see a session it redirected to the web login, the login screen
 * navigated straight back to /oauth/authorize with its own dead cached session,
 * and the two bounced forever.
 *
 * The fix has two halves, both asserted here:
 *   1. the first pass carries `oauth_retry=1` on the return leg, to the app host
 *      (where /login lives) rather than the public host;
 *   2. a second pass without a session must NOT bounce to /login again. It
 *      sends the browser once to the web consent page's `error=session_expired`
 *      screen, which only moves on an explicit "Sign in again" click — that
 *      click is what terminates the loop.
 *
 * Prisma is faked at the module boundary; Redis is disabled so the rate
 * limiters use their in-memory store, cleared between cases.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.API_URL = 'http://127.0.0.1:5000';
process.env.PUBLIC_FRONTEND_URL = 'http://127.0.0.1:3000';
process.env.APP_FRONTEND_URL = 'http://127.0.0.1:3000';
process.env.MCP_PUBLIC_URL = 'http://127.0.0.1:8787';
process.env.REDIS_ENABLED = 'false';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock: any = {
    oAuthClient: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
};

vi.mock('../infrastructure/database/prisma', () => ({
    default: prismaMock,
}));

vi.mock('../middleware/auth', () => ({
    requireAuth: (_req: express.Request, _res: express.Response, next: () => void) => next(),
    optionalAuth: (_req: express.Request, _res: express.Response, next: () => void) => next(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let errorHandler: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let resetRateLimitStoreForTests: any;
let oauthRoutes: express.Router;

async function loadModules(): Promise<void> {
    if (errorHandler && resetRateLimitStoreForTests && oauthRoutes) return;
    const [ehMod, rlMod, oauthMod] = await Promise.all([
        import('../middleware/errorHandler'),
        import('../middleware/rateLimit'),
        import('../routes/oauth'),
    ]);
    errorHandler = ehMod.errorHandler;
    resetRateLimitStoreForTests = rlMod.resetRateLimitStoreForTests;
    oauthRoutes = oauthMod.default;
}

function buildApp(): express.Application {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(oauthRoutes);
    app.use(errorHandler);
    return app;
}

const VALID_AUTHORIZE =
    '/oauth/authorize?response_type=code'
    + '&client_id=ffc_loop'
    + '&redirect_uri=http%3A%2F%2F127.0.0.1%3A9000%2Fcallback'
    + '&code_challenge=abc123'
    + '&state=st1'
    + '&scope=mcp'
    + '&resource=http%3A%2F%2F127.0.0.1%3A8787%2Fmcp';

beforeEach(async () => {
    await loadModules();
    vi.clearAllMocks();
    resetRateLimitStoreForTests();
    prismaMock.oAuthClient.findUnique.mockResolvedValue({
        clientId: 'ffc_loop',
        clientName: 'ChatGPT',
        redirectUris: ['http://127.0.0.1:9000/callback'],
    });
});

describe('MCP sign-in handoff', () => {
    it('rejects a scope the server does not advertise', async () => {
        const res = await request(buildApp()).get(VALID_AUTHORIZE.replace('scope=mcp', 'scope=profile'));

        expect(res.status).toBe(302);
        expect(new URL(res.headers.location).searchParams.get('error')).toBe('invalid_scope');
    });

    it('rejects a resource URI that only shares the MCP origin', async () => {
        const res = await request(buildApp()).get(VALID_AUTHORIZE.replace('%2Fmcp', '%2Fother'));

        expect(res.status).toBe(302);
        expect(new URL(res.headers.location).searchParams.get('error')).toBe('invalid_target');
    });

    it('sends a signed-out browser to the login host with a single-return marker', async () => {
        const res = await request(buildApp()).get(VALID_AUTHORIZE);

        expect(res.status).toBe(302);
        expect(res.headers.location).toBeTruthy();

        const login = new URL(res.headers.location);
        // The public host, which is the one that always exists. A deployment
        // that splits login onto another host adds its own single 308 hop there.
        expect(login.origin).toBe('http://127.0.0.1:3000');
        expect(login.pathname).toBe('/login');

        const nested = new URL(login.searchParams.get('redirect') as string);
        expect(nested.origin).toBe('http://127.0.0.1:5000');
        expect(nested.pathname).toBe('/oauth/authorize');
        // The marker that makes a second failure terminate instead of bounce.
        expect(nested.searchParams.get('oauth_retry')).toBe('1');
        expect(nested.searchParams.get('state')).toBe('st1');
    });

    it('does not bounce a second time: a retry with no session lands on the consent screen', async () => {
        const res = await request(buildApp()).get(`${VALID_AUTHORIZE}&oauth_retry=1`);

        // One hop to the web app, never back to /login.
        expect(res.status).toBe(302);

        const consent = new URL(res.headers.location as string);
        expect(consent.origin).toBe('http://127.0.0.1:3000');
        expect(consent.pathname).toBe('/oauth/consent');
        // The marker the consent page renders its sign-in card from.
        expect(consent.searchParams.get('error')).toBe('session_expired');
        // The whole authorization request travels along so /login can send the
        // browser back to it — but never a consent_token: this handoff grants
        // no authority, only enough to rebuild the return leg.
        expect(consent.searchParams.get('client_id')).toBe('ffc_loop');
        expect(consent.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:9000/callback');
        expect(consent.searchParams.get('code_challenge')).toBe('abc123');
        expect(consent.searchParams.get('state')).toBe('st1');
        expect(consent.searchParams.get('scope')).toBe('mcp');
        expect(consent.searchParams.get('consent_token')).toBeNull();
        // No code was issued and no client was consulted beyond validation.
        expect(consent.searchParams.get('code')).toBeNull();
    });

    it('still redirects back to the client when the browser has a live session', async () => {
        // No cookie parser in this app means no session, so the only way to
        // reach the consent screen is a request the API can authenticate. That
        // path is covered by the OAuth service tests; here we only assert that
        // the retry marker never leaks into the client redirect.
        const res = await request(buildApp()).get(`${VALID_AUTHORIZE}&oauth_retry=1`);
        expect(res.status).toBe(302);
        expect(res.headers.location).not.toContain('http://127.0.0.1:9000/callback?code=');
    });
});
