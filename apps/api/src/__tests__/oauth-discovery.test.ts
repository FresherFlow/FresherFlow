/**
 * OAuth 2.1 discovery + Dynamic Client Registration (DCR) contract tests.
 *
 * Covers the endpoints that ChatGPT/Claude consult when adding a custom MCP
 * server:
 *   - GET  /.well-known/oauth-authorization-server
 *   - GET  /.well-known/openid-configuration
 *   - GET  /.well-known/oauth-protected-resource
 *   - POST /oauth/register
 *
 * These are served at the API root (`apps/api/src/index.ts:552`,
 * `app.use(oauthRoutes)` — no path prefix).
 *
 * Prisma is faked at the module boundary; Redis is disabled so the rate
 * limiters fall back to their in-memory store (cleared between cases).
 *
 * All app modules that transitively touch `prisma` are imported dynamically
 * after `prismaMock` is initialized, mirroring the pattern in
 * `mcp-oauth.service.test.ts` (avoids the `vi.mock` hoisting TDZ).
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.API_URL = 'https://api.fresherflow.in';
process.env.MCP_PUBLIC_URL = 'https://mcp.fresherflow.in';
process.env.PUBLIC_SITE_URL = 'https://fresherflow.in';
process.env.REDIS_ENABLED = 'false';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Declared before the dynamic imports below so the hoisted vi.mock factory can
// reference it once any mocked module is loaded.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock: any = {
    oAuthClient: {
        create: vi.fn(),
        findUnique: vi.fn(),
    },
};

vi.mock('../infrastructure/database/prisma', () => ({
    default: prismaMock,
}));

vi.mock('../middleware/auth', () => ({
    requireAuth: (_req: express.Request, _res: express.Response, next: () => void) => next(),
    optionalAuth: (_req: express.Request, _res: express.Response, next: () => void) => next(),
}));

let errorHandler: any;
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

beforeEach(async () => {
    await loadModules();
    vi.clearAllMocks();
    resetRateLimitStoreForTests();
});

describe('OAuth authorization-server discovery', () => {
    it('returns an absolute HTTPS issuer and absolute endpoint URLs', async () => {
        const app = buildApp();
        const res = await request(app).get('/.well-known/oauth-authorization-server');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.body.issuer).toBe('https://api.fresherflow.in');
        expect(res.body.authorization_endpoint).toBe('https://api.fresherflow.in/oauth/authorize');
        expect(res.body.token_endpoint).toBe('https://api.fresherflow.in/oauth/token');
        expect(res.body.registration_endpoint).toBe('https://api.fresherflow.in/oauth/register');
        expect(res.body.revocation_endpoint).toBe('https://api.fresherflow.in/oauth/revoke');
    });

    it('advertises only supported capabilities', async () => {
        const app = buildApp();
        const res = await request(app).get('/.well-known/oauth-authorization-server');

        expect(res.body.scopes_supported).toEqual(['mcp']);
        expect(res.body.response_types_supported).toEqual(['code']);
        expect(res.body.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
        expect(res.body.token_endpoint_auth_methods_supported).toEqual(['none']);
        expect(res.body.code_challenge_methods_supported).toEqual(['S256']);
        expect(res.body.authorization_response_iss_parameter_supported).toBe(true);
    });

    it('has no relative URLs and no empty issuer', async () => {
        const app = buildApp();
        const res = await request(app).get('/.well-known/oauth-authorization-server');

        const body = JSON.stringify(res.body);
        expect(res.body.issuer).not.toBe('');
        expect(res.body.issuer).not.toMatch(/^\//);
        expect(body).not.toContain('"/oauth/');
        expect(body).not.toMatch(/"(authorization|token|registration|revocation)_endpoint":"\//);
    });
});

describe('OpenID Connect discovery', () => {
    it('is consistent with the authorization-server metadata', async () => {
        const app = buildApp();
        const asRes = await request(app).get('/.well-known/oauth-authorization-server');
        const oidcRes = await request(app).get('/.well-known/openid-configuration');

        expect(oidcRes.status).toBe(200);
        expect(oidcRes.body.issuer).toBe('https://api.fresherflow.in');
        expect(oidcRes.body.issuer).toBe(asRes.body.issuer);
        expect(oidcRes.body.authorization_endpoint).toBe(asRes.body.authorization_endpoint);
        expect(oidcRes.body.token_endpoint).toBe(asRes.body.token_endpoint);
        expect(oidcRes.body.revocation_endpoint).toBe(asRes.body.revocation_endpoint);
        expect(oidcRes.body.scopes_supported).toEqual(['mcp']);
        expect(oidcRes.body.code_challenge_methods_supported).toEqual(['S256']);
        // Tokens are opaque, so there is no key set. Advertising one that does
        // not exist makes an OIDC client fail discovery and retry the flow.
        expect(oidcRes.body.jwks_uri).toBeUndefined();
    });
});

describe('Protected resource discovery', () => {
    it('returns the MCP resource and its authorization server', async () => {
        const app = buildApp();
        const res = await request(app).get('/.well-known/oauth-protected-resource');

        expect(res.status).toBe(200);
        // Same identifier apps/mcp publishes: the resource is the /mcp endpoint.
        expect(res.body.resource).toBe('https://mcp.fresherflow.in/mcp');
        expect(res.body.authorization_servers).toEqual(['https://api.fresherflow.in']);
        expect(res.body.scopes_supported).toEqual(['mcp']);
        expect(res.body.bearer_methods_supported).toEqual(['header']);
    });
});

describe('Dynamic client registration (POST /oauth/register)', () => {
    const validBody = {
        client_name: 'ChatGPT (test)',
        redirect_uris: ['https://chatgpt.com/callback'],
    };

    it('registers a public client and returns client_id + metadata, no secret', async () => {
        const app = buildApp();
        prismaMock.oAuthClient.create.mockResolvedValue({
            clientId: 'ffc_abcd1234',
            clientName: 'ChatGPT (test)',
            redirectUris: ['https://chatgpt.com/callback'],
        });

        const res = await request(app).post('/oauth/register').send(validBody);

        expect(res.status).toBe(201);
        expect(res.body.client_id).toBe('ffc_abcd1234');
        expect(res.body.client_name).toBe('ChatGPT (test)');
        expect(res.body.redirect_uris).toEqual(['https://chatgpt.com/callback']);
        expect(res.body.token_endpoint_auth_method).toBe('none');
        expect(res.body.grant_types).toEqual(['authorization_code', 'refresh_token']);
        expect(res.body.response_types).toEqual(['code']);
        // Public client: no client_secret is minted or returned.
        expect(res.body.client_secret).toBeUndefined();
        expect(Object.keys(res.body)).not.toContain('client_secret');

        const created = prismaMock.oAuthClient.create.mock.calls[0][0] as {
            data: { clientId: string; clientName: string; redirectUris: string[] };
        };
        expect(created.data.clientId).toMatch(/^ffc_/);
        expect(created.data.redirectUris).toEqual(['https://chatgpt.com/callback']);
    });

    it('requires at least one redirect URI', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/oauth/register')
            .send({ client_name: 'No URIs', redirect_uris: [] });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('invalid_redirect_uri');
        expect(prismaMock.oAuthClient.create).not.toHaveBeenCalled();
    });

    it('accepts an empty body (no redirect URIs -> 400), not a 500', async () => {
        const app = buildApp();
        const res = await request(app).post('/oauth/register').send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('invalid_redirect_uri');
    });

    it('supports the chatgpt.com style redirect URI used by custom MCP clients', async () => {
        const app = buildApp();
        prismaMock.oAuthClient.create.mockResolvedValue({
            clientId: 'ffc_chatgpt',
            clientName: 'FresherFlow ChatGPT',
            redirectUris: ['https://chatgpt.com/callback'],
        });

        const res = await request(app)
            .post('/oauth/register')
            .send({ client_name: 'FresherFlow ChatGPT', redirect_uris: ['https://chatgpt.com/callback'] });

        expect(res.status).toBe(201);
        expect(res.body.client_id).toBe('ffc_chatgpt');
    });
});
