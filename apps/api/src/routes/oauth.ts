import express, { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../infrastructure/database/prisma';
import { verifyAccessToken as verifySessionToken } from '@fresherflow/utils';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createRateLimiter } from '../middleware/rateLimit';
import { getApiPublicUrl, getMcpPublicUrl, getPublicSiteUrl } from '../utils/runtimeConfig';
import {
    MCP_OAUTH_SCOPE,
    OAuthError,
    assertRedirectUriAllowed,
    createAuthorizationCode,
    exchangeAuthorizationCode,
    getClient,
    listConnections,
    refreshAccessToken,
    registerClient,
    revokeConnection,
    revokeToken,
} from '../infrastructure/services/platform/mcpOAuth.service';

/**
 * OAuth 2.1 authorization server for the FresherFlow MCP server.
 *
 * ChatGPT and Codex cannot send an API key or a custom header to an MCP
 * connector, so this is the only way a caller on that surface gets an identity
 * (developers.openai.com/plugins/build/auth). The MCP server (`apps/mcp`) is the
 * resource server; this API is the authorization server.
 *
 * Endpoint map:
 *   GET  /.well-known/oauth-protected-resource   resource metadata (also served by apps/mcp)
 *   GET  /.well-known/oauth-authorization-server authorization server metadata
 *   POST /oauth/register                         dynamic client registration
 *   GET  /oauth/authorize                        start consent (session cookie required)
 *   POST /oauth/authorize                        approve or deny, then redirect with a code
 *   POST /oauth/token                            code exchange + refresh, PKCE S256
 *   POST /oauth/revoke                           RFC 7009
 *   GET  /oauth/connections                      the user's connected MCP clients
 *   DELETE /oauth/connections/:id                disconnect one
 */

const router: Router = express.Router();

// The consent form and the token endpoint are unauthenticated entry points, so
// both are rate limited. Token exchange is cheap to check and expensive to
// brute-force, so it gets a tighter budget than metadata reads.
const registerLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: 'Too many client registrations. Please try again later.',
    keyPrefix: 'oauth_register',
});
const tokenLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: 'Too many token requests. Please try again later.',
    keyPrefix: 'oauth_token',
});
const authorizeLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: 'Too many authorization attempts. Please try again later.',
    keyPrefix: 'oauth_authorize',
});

/** OAuth responses use RFC 6749's shape, not the API's usual envelope. */
function sendOAuthError(res: Response, error: unknown, fallbackStatus = 400): void {
    if (error instanceof OAuthError) {
        res.status(error.status).json({ error: error.error, error_description: error.message });
        return;
    }
    res.status(fallbackStatus).json({
        error: 'server_error',
        error_description: 'The authorization server could not complete the request',
    });
}

/** HTML-escape for the consent page. `&` first, then the rest, in one pass. */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Secret for the consent form token. Falls back through the server's existing
 * secrets so a deployment that already runs the API needs no new variable.
 */
function consentSecret(): string {
    return process.env.OAUTH_CONSENT_SECRET || process.env.JWT_ACCESS_SECRET || process.env.INTERNAL_API_SECRET || '';
}

/**
 * Stateless CSRF token for the consent form: an HMAC over the exact
 * authorization request. A cross-site page cannot mint one, and because it is
 * bound to the parameters it cannot be replayed against a different request.
 */
function consentFormToken(params: Record<string, string>): string {
    const canonical = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join('&');
    return crypto.createHmac('sha256', consentSecret()).update(canonical).digest('hex');
}

function safeEqual(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

function readSessionUserId(req: Request): string | null {
    const cookieToken = req.cookies?.accessToken as string | undefined;
    const header = req.headers.authorization;
    const bearer = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : undefined;
    const token = cookieToken || bearer;
    if (!token) return null;
    try {
        return verifySessionToken(token);
    } catch {
        return null;
    }
}

function str(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

// ─── Discovery ───────────────────────────────────────────────────────────────

router.get('/.well-known/oauth-protected-resource', (_req: Request, res: Response) => {
    const resource = getMcpPublicUrl();
    if (!resource) {
        res.status(503).json({ error: 'server_error', error_description: 'MCP_PUBLIC_URL is not configured' });
        return;
    }
    res.json({
        resource,
        authorization_servers: [getApiPublicUrl()],
        scopes_supported: [MCP_OAUTH_SCOPE],
        bearer_methods_supported: ['header'],
        resource_documentation: `${getPublicSiteUrl()}/account?tab=connected`,
    });
});

router.get('/.well-known/oauth-authorization-server', (_req: Request, res: Response) => {
    const issuer = getApiPublicUrl();
    res.json({
        issuer,
        authorization_endpoint: `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/oauth/token`,
        registration_endpoint: `${issuer}/oauth/register`,
        revocation_endpoint: `${issuer}/oauth/revoke`,
        scopes_supported: [MCP_OAUTH_SCOPE],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        // Public clients only: ChatGPT proves possession with PKCE, not a secret.
        token_endpoint_auth_methods_supported: ['none'],
        code_challenge_methods_supported: ['S256'],
        // Required for the RFC 9207 `iss` parameter we return on every
        // authorization response.
        authorization_response_iss_parameter_supported: true,
    });
});

// ─── Dynamic client registration ─────────────────────────────────────────────

router.post(
    '/oauth/register',
    registerLimiter,
    async (req: Request, res: Response) => {
        try {
            const body = req.body as { client_name?: unknown; redirect_uris?: unknown; clientName?: unknown };
            const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
            const client = await registerClient({
                clientName: str(body.client_name) || str(body.clientName) || null,
                redirectUris: uris,
            });
            res.status(201).json({
                client_id: client.clientId,
                client_name: client.clientName,
                redirect_uris: client.redirectUris,
                token_endpoint_auth_method: 'none',
                grant_types: ['authorization_code', 'refresh_token'],
                response_types: ['code'],
            });
        } catch (error) {
            sendOAuthError(res, error);
        }
    },
);

// ─── Authorization + consent ─────────────────────────────────────────────────

interface AuthorizeParams {
    responseType: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    scope: string;
    resource: string;
}

function readAuthorizeParams(source: Request['query'] | Record<string, unknown>): AuthorizeParams {
    const get = (key: string): string => str((source as Record<string, unknown>)[key]);
    return {
        responseType: get('response_type'),
        clientId: get('client_id'),
        redirectUri: get('redirect_uri'),
        codeChallenge: get('code_challenge'),
        state: get('state'),
        scope: get('scope') || MCP_OAUTH_SCOPE,
        resource: get('resource'),
    };
}

function redirectWithError(res: Response, redirectUri: string, state: string, error: string, description: string): void {
    const url = new URL(redirectUri);
    url.searchParams.set('error', error);
    url.searchParams.set('error_description', description);
    if (state) url.searchParams.set('state', state);
    // RFC 9207: the issuer must be present on error responses too.
    url.searchParams.set('iss', getApiPublicUrl());
    res.redirect(url.toString());
}

/** Validate everything that must hold before a code may ever be issued. */
async function validateAuthorizeRequest(params: AuthorizeParams): Promise<{ clientName: string }> {
    if (params.responseType !== 'code') {
        throw new OAuthError(400, 'unsupported_response_type', 'Only response_type=code is supported');
    }
    if (!params.clientId || !params.redirectUri) {
        throw new OAuthError(400, 'invalid_request', 'client_id and redirect_uri are required');
    }
    // S256 only. The MCP authorization spec requires it, and a client that
    // cannot do PKCE cannot be given a code safely.
    if (!params.codeChallenge) {
        throw new OAuthError(400, 'invalid_request', 'code_challenge is required (PKCE S256)');
    }
    const resource = getMcpPublicUrl();
    if (resource && params.resource && params.resource !== resource) {
        throw new OAuthError(400, 'invalid_target', 'resource does not match this authorization server');
    }
    const client = await getClient(params.clientId);
    if (!client) {
        throw new OAuthError(400, 'invalid_client', 'Unknown client_id');
    }
    assertRedirectUriAllowed(client, params.redirectUri);
    return { clientName: client.clientName || 'An AI assistant' };
}

/**
 * GET /oauth/authorize — the entry point the AI client opens in a browser.
 *
 * Unauthenticated callers are sent to the web login with this exact URL as
 * `next`, so the consent screen is reached again after signing in.
 */
router.get('/oauth/authorize', authorizeLimiter, async (req: Request, res: Response) => {
    const params = readAuthorizeParams(req.query);
    let clientName: string;
    try {
        ({ clientName } = await validateAuthorizeRequest(params));
    } catch (error) {
        if (error instanceof OAuthError && params.redirectUri && params.clientId) {
            redirectWithError(res, params.redirectUri, params.state, error.error, error.message);
            return;
        }
        sendOAuthError(res, error);
        return;
    }

    const userId = readSessionUserId(req);
    if (!userId) {
        const selfUrl = new URL(`${getApiPublicUrl()}/oauth/authorize`);
        for (const [key, value] of Object.entries(req.query as Record<string, string>)) {
            selfUrl.searchParams.set(key, String(value));
        }
        // `redirect`, not `next`: that is the parameter the web login actually
        // reads (features/auth/components/LoginForm.tsx). The origin check in
        // isSafeInternalRedirect allows this one absolute URL because it is this
        // API's own origin.
        res.redirect(`${getPublicSiteUrl()}/login?redirect=${encodeURIComponent(selfUrl.toString())}`);
        return;
    }

    const account = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, username: true, email: true },
    });
    const who = escapeHtml(account?.fullName || account?.username || account?.email || 'your FresherFlow account');

    const formToken = consentFormToken({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        code_challenge: params.codeChallenge,
        state: params.state,
        scope: params.scope,
        resource: params.resource,
    });

    // A minimal, self-contained consent screen. It is deliberately server
    // rendered: it must work inside the OAuth redirect without depending on the
    // web app's session, and it carries its own CSRF token.
    res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect FresherFlow</title>
<style>
 body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#0b0b0f;color:#f5f5f7}
 main{max-width:30rem;padding:2rem;border:1px solid #26262e;border-radius:1rem;background:#131319}
 h1{font-size:1.25rem;margin:0 0 .5rem}
 p{line-height:1.5;color:#c7c7d1}
 ul{color:#c7c7d1;line-height:1.6}
 .row{display:flex;gap:.75rem;margin-top:1.5rem}
 button{flex:1;padding:.75rem 1rem;border-radius:.75rem;border:1px solid #3a3a46;background:#1d1d26;color:#f5f5f7;font-size:1rem;cursor:pointer}
 button.approve{background:#2563eb;border-color:#2563eb}
 .muted{font-size:.85rem;color:#8b8b98}
</style></head>
<body><main>
 <h1>Connect ${escapeHtml(clientName)} to FresherFlow</h1>
 <p><strong>${escapeHtml(clientName)}</strong> is asking to act as <strong>${who}</strong>.</p>
 <p>It will be able to:</p>
 <ul>
  <li>Add jobs as you, and publish them</li>
  <li>See the listings and submissions you own</li>
  <li>Withdraw a submission you made</li>
 </ul>
 <p class="muted">It will not see your password or your account settings. You can disconnect it at any time from your account.</p>
 <form method="post" action="/oauth/authorize">
  <input type="hidden" name="client_id" value="${escapeHtml(params.clientId)}">
  <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirectUri)}">
  <input type="hidden" name="code_challenge" value="${escapeHtml(params.codeChallenge)}">
  <input type="hidden" name="state" value="${escapeHtml(params.state)}">
  <input type="hidden" name="scope" value="${escapeHtml(params.scope)}">
  <input type="hidden" name="resource" value="${escapeHtml(params.resource)}">
  <input type="hidden" name="consent_token" value="${escapeHtml(formToken)}">
  <div class="row">
   <button type="submit" name="decision" value="deny">Cancel</button>
   <button type="submit" class="approve" name="decision" value="allow">Allow</button>
  </div>
 </form>
</main></body></html>`);
});

/**
 * POST /oauth/authorize — the consent decision.
 *
 * Reached only from the form above. Its CSRF defence is the HMAC token bound to
 * the exact request parameters, which is why this one path is exempted from the
 * header-based gate (see middleware/csrf.ts).
 */
router.post('/oauth/authorize', authorizeLimiter, express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const params: AuthorizeParams = {
        responseType: 'code',
        clientId: str(body.client_id),
        redirectUri: str(body.redirect_uri),
        codeChallenge: str(body.code_challenge),
        state: str(body.state),
        scope: str(body.scope) || MCP_OAUTH_SCOPE,
        resource: str(body.resource),
    };
    const presentedToken = str(body.consent_token);

    let clientName: string;
    try {
        ({ clientName } = await validateAuthorizeRequest(params));
    } catch (error) {
        sendOAuthError(res, error);
        return;
    }

    const expectedToken = consentFormToken({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        code_challenge: params.codeChallenge,
        state: params.state,
        scope: params.scope,
        resource: params.resource,
    });
    if (!presentedToken || !safeEqual(presentedToken, expectedToken)) {
        sendOAuthError(res, new OAuthError(403, 'access_denied', 'Consent form token is invalid or expired'));
        return;
    }

    const userId = readSessionUserId(req);
    if (!userId) {
        sendOAuthError(res, new OAuthError(401, 'access_denied', 'Sign in before approving this connection'));
        return;
    }

    if (str(body.decision) !== 'allow') {
        redirectWithError(res, params.redirectUri, params.state, 'access_denied', 'The user denied the request');
        return;
    }

    const code = await createAuthorizationCode({
        clientId: params.clientId,
        userId,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        scope: params.scope,
        resource: params.resource || null,
    });

    const url = new URL(params.redirectUri);
    url.searchParams.set('code', code);
    if (params.state) url.searchParams.set('state', params.state);
    // RFC 9207 issuer identification, on success and on error alike.
    url.searchParams.set('iss', getApiPublicUrl());
    void clientName;
    res.redirect(url.toString());
});

// ─── Token + revocation ──────────────────────────────────────────────────────

router.post('/oauth/token', tokenLimiter, express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
    const body = { ...(req.body as Record<string, unknown>), ...(req.query as Record<string, unknown>) };
    const grantType = str(body.grant_type);

    try {
        if (grantType === 'authorization_code') {
            const tokens = await exchangeAuthorizationCode({
                code: str(body.code),
                clientId: str(body.client_id),
                redirectUri: str(body.redirect_uri),
                codeVerifier: str(body.code_verifier),
            });
            res.json(tokens);
            return;
        }
        if (grantType === 'refresh_token') {
            const tokens = await refreshAccessToken(str(body.refresh_token), str(body.client_id));
            res.json(tokens);
            return;
        }
        throw new OAuthError(400, 'unsupported_grant_type', 'grant_type must be authorization_code or refresh_token');
    } catch (error) {
        sendOAuthError(res, error);
    }
});

router.post('/oauth/revoke', tokenLimiter, express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
    const token = str((req.body as Record<string, unknown>).token) || str((req.query as Record<string, unknown>).token);
    await revokeToken(token);
    // RFC 7009: an unknown token is reported as success.
    res.status(200).json({ success: true });
});

// ─── Connected apps (the user-facing revocation surface) ─────────────────────

router.get('/oauth/connections', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.userId) throw new AppError('Authentication required', 401);
        res.setHeader('Cache-Control', 'private, no-store');
        res.json({ connections: await listConnections(req.userId) });
    } catch (error) {
        next(error);
    }
});

router.delete('/oauth/connections/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.userId) throw new AppError('Authentication required', 401);
        await revokeConnection(req.userId, String(req.params.id));
        res.json({ success: true });
    } catch (error) {
        if (error instanceof OAuthError) {
            next(new AppError(error.message, error.status));
            return;
        }
        next(error);
    }
});

export default router;
