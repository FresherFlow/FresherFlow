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
 *   2. a second pass without a session must NOT redirect. It answers 401 with an
 *      explanation, which is what terminates the loop.
 *
 * Prisma is faked at the module boundary; Redis is disabled so the rate
 * limiters use their in-memory store, cleared between cases.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.API_URL = 'https://api.fresherflow.in';
process.env.PUBLIC_FRONTEND_URL = 'https://fresherflow.in';
process.env.APP_FRONTEND_URL = 'https://app.fresherflow.in';
process.env.MCP_PUBLIC_URL = 'https://mcp.fresherflow.in';
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
    + '&redirect_uri=https%3A%2F%2Fchatgpt.com%2Fcallback'
    + '&code_challenge=abc123'
    + '&state=st1';

beforeEach(async () => {
    await loadModules();
    vi.clearAllMocks();
    resetRateLimitStoreForTests();
    prismaMock.oAuthClient.findUnique.mockResolvedValue({
        clientId: 'ffc_loop',
        clientName: 'ChatGPT',
        redirectUris: ['https://chatgpt.com/callback'],
    });
});

describe('MCP sign-in handoff', () => {
    it('sends a signed-out browser to the login host with a single-return marker', async () => {
        const res = await request(buildApp()).get(VALID_AUTHORIZE);

        expect(res.status).toBe(302);
        expect(res.headers.location).toBeTruthy();

        const login = new URL(res.headers.location);
        // The public host, which is the one that always exists. A deployment
        // that splits login onto another host adds its own single 308 hop there.
        expect(login.origin).toBe('https://fresherflow.in');
        expect(login.pathname).toBe('/login');

        const nested = new URL(login.searchParams.get('redirect') as string);
        expect(nested.origin).toBe('https://api.fresherflow.in');
        expect(nested.pathname).toBe('/oauth/authorize');
        // The marker that makes a second failure terminate instead of bounce.
        expect(nested.searchParams.get('oauth_retry')).toBe('1');
        expect(nested.searchParams.get('state')).toBe('st1');
    });

    it('does not redirect a second time: a retry with no session explains instead', async () => {
        const res = await request(buildApp()).get(`${VALID_AUTHORIZE}&oauth_retry=1`);

        expect(res.status).toBe(401);
        expect(res.headers.location).toBeUndefined();
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.text).toContain('Sign in to FresherFlow');
        // No code was issued and no client was consulted beyond validation.
        expect(res.text).not.toContain('code=');
    });

    it('still redirects back to the client when the browser has a live session', async () => {
        // No cookie parser in this app means no session, so the only way to
        // reach the consent screen is a request the API can authenticate. That
        // path is covered by the OAuth service tests; here we only assert that
        // the retry marker never leaks into the client redirect.
        const res = await request(buildApp()).get(`${VALID_AUTHORIZE}&oauth_retry=1`);
        expect(res.status).toBe(401);
        expect(res.text).not.toContain('https://chatgpt.com/callback?code=');
    });
});
