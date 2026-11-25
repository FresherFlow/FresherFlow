import express, { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../infrastructure/database/prisma';
import {
    hashRefreshToken,
    verifyAccessToken as verifySessionToken,
    verifyRefreshToken,
} from '@fresherflow/utils';
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
import { refreshAccessCookie } from './auth';

/** OAuth 2.1 authorization server for the FresherFlow MCP server.

 * ChatGPT and Codex cannot send an API key or a custom header to an MCP
 * connector, so this is the only way a caller on that surface gets an identity
 * (developers.openai.com/plugins/build/auth). The MCP server (`apps/mcp`) is the
 * resource server; this API is the authorization server.
 *
 * Endpoint map:
 *   GET  /.well-known/oauth-protected-resource   resource metadata (also served by apps/mcp)
 *   GET  /.well-known/oauth-authorization-server authorization server metadata
 *   GET  /.well-known/openid-configuration         OpenID Connect configuration
 *   POST /oauth/register                         dynamic client registration
 *   GET  /oauth/authorize                        start consent (session cookie required)
 *   POST /oauth/authorize                        approve or deny, then redirect with a code
 *   POST /oauth/token                            code exchange + refresh, PKCE S256
 *   POST /oauth/revoke                           RFC 7009
 *   GET  /oauth/connections                      the user's connected MCP clients
 *   DELETE /oauth/connections/:id                disconnect one
 */

const router: Router = express.Router();

/**
 * OpenAI hosts ask for `offline_access mcp` so they can keep a refresh token.
 * This surface grants only the `mcp` scope and issues a refresh token on every
 * exchange, so accept the extra scope but keep the stored scope canonical.
 * Anything else is still rejected rather than silently stripped.
 */
const OFFLINE_ACCESS_SCOPE = 'offline_access';
const SUPPORTED_OAUTH_SCOPES = [MCP_OAUTH_SCOPE, OFFLINE_ACCESS_SCOPE];

function normalizeAuthorizeScope(value: string): string | null {
    const requested = value.trim().split(/\s+/).filter(Boolean);
    if (requested.length === 0 || requested.some((scope) => !SUPPORTED_OAUTH_SCOPES.includes(scope))) return null;
    if (!requested.includes(MCP_OAUTH_SCOPE)) return null;
    return MCP_OAUTH_SCOPE;
}

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

/** Secret for the consent form token. Falls back through the server's existing
 * secrets so a deployment that already runs the API needs no new variable.
 */
function consentSecret(): string {
    return process.env.OAUTH_CONSENT_SECRET || process.env.JWT_ACCESS_SECRET || process.env.INTERNAL_API_SECRET || '';
}

/** Stateless CSRF token for the consent form: an HMAC over the exact
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

/**
 * The signed-in user behind this consent request.
 *
 * `readSessionUserId` alone is not enough. The access token lives 15 minutes
 * and the session lives 90 days, so a visitor who is still signed in to the
 * website arrives here with only a `refreshToken`. Bouncing those users to
 * /login was the start of the loop: the web app's gate only checks that a
 * session cookie *exists*, so it sent them straight back to this endpoint,
 * which bounced them to /login again — an infinite browser ping-pong instead of
 * a consent screen.
 *
 * So an expired access token is rotated here exactly like
 * `POST /api/auth/refresh`: the presented refresh token is revoked, a fresh
 * pair is set on this response, and the redirect that follows already carries a
 * working session.
 */
async function resolveSessionUserId(req: Request, res: Response): Promise<string | null> {
    const direct = readSessionUserId(req);
    if (direct) return direct;

    const refreshToken = typeof req.cookies?.refreshToken === 'string' ? req.cookies.refreshToken : '';
    if (!refreshToken) return null;

    try {
        const userId = verifyRefreshToken(refreshToken);
        if (!userId) return null;

        const tokenHash = hashRefreshToken(refreshToken);
        const live = await prisma.refreshToken.findFirst({
            where: { tokenHash, userId, revokedAt: null, expiresAt: { gt: new Date() } },
            select: { id: true },
        });
        if (!live) return null;

        const account = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, status: true },
        });
        if (!account || account.status !== 'ACTIVE') return null;

        // Do NOT rotate here. A full rotation would revoke the refresh token
        // that the web app still holds in localStorage, so connecting an AI
        // client would log the user out of the website moments later. Just
        // refresh the short-lived access cookie; the refresh token stays live.
        refreshAccessCookie(userId, res);
        return userId;
    } catch {
        return null;
    }
}

// ─── Discovery ───────────────────────────────────────────────────────────────

router.get('/.well-known/oauth-protected-resource', (_req: Request, res: Response) => {
    const resource = getMcpPublicUrl();
    if (!resource) {
        res.status(503).json({ error: 'server_error', error_description: 'MCP_PUBLIC_URL is not configured' });
        return;
    }
    res.json({
        // Must match the document apps/mcp serves for the same resource:
        // RFC 9728 identifies the resource by URL, and a client that compares
        // `/mcp` against a bare origin treats the token as issued for another
        // resource and starts authorization again.
        resource: `${resource}/mcp`,
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
        // OpenAI's MCP connector docs require the refresh-token scope to be
        // advertised, or ChatGPT can lose access when the original token expires.
        scopes_supported: [MCP_OAUTH_SCOPE, OFFLINE_ACCESS_SCOPE],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        // Public clients only: ChatGPT proves possession with PKCE, not a secret.
        token_endpoint_auth_methods_supported: ['none'],
        code_challenge_methods_supported: ['S256'],
        // Required for the RFC 9207 `iss` parameter we return on every
        // authorization response.
        authorization_response_iss_parameter_supported: true,
        // CIMD is deliberately NOT advertised. /authorize resolves client_id
        // only from registered clients, so an HTTPS CIMD client_id would fail
        // with invalid_client. DCR is implemented and advertised below.
        client_id_metadata_document_supported: false,
    });
});

/** OpenID Connect configuration endpoint.
 *
 * This is required for OpenID support in MCP clients (ChatGPT, Claude, etc.).
 * It advertises the OIDC features supported by this authorization server.
 * See: https://openid.net/specs/open-connect-core-1_0.html#ProviderConfig
 */
router.get('/.well-known/openid-configuration', (_req: Request, res: Response) => {
    const issuer = getApiPublicUrl();
    res.json({
        issuer,
        authorization_endpoint: `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/oauth/token`,
        revocation_endpoint: `${issuer}/oauth/revoke`,
        scopes_supported: [MCP_OAUTH_SCOPE, OFFLINE_ACCESS_SCOPE],
        // No `jwks_uri`: tokens on this surface are opaque and stored hashed,
        // so there is no key set to publish. Advertising a key endpoint that
        // does not exist makes an OIDC client fail discovery and retry.
        // The following are required for basic OIDC support:
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        // PKCE is required for public clients (ChatGPT uses DCR with PKCE).
        code_challenge_methods_supported: ['S256'],
        // Required for the RFC 9207 `iss` parameter.
        authorization_response_iss_parameter_supported: true,
        // Same answer as the authorization-server document: no CIMD, DCR only.
        client_id_metadata_document_supported: false,
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
    /** Set on the second pass, after the browser has already signed in once. */
    retry: boolean;
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
        retry: get('oauth_retry') === '1',
    };
}

/**
 * Where to send the browser to sign in, carrying the authorization request so
 * the consent screen is reached again afterwards.
 *
 * `expired=true` is the loop-breaker. The web proxy treats an auth entry page
 * with that flag as "show the form" even when a session cookie exists, because
 * the proxy can only see that a cookie is present, not whether it is still
 * valid. Without it, a dead cookie bounces /login -> here -> /login forever.
 */
function loginRedirectUrl(params: AuthorizeParams, hadStaleSession: boolean): string {
    const authorizeUrl = new URL(`${getApiPublicUrl()}/oauth/authorize`);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', params.clientId);
    authorizeUrl.searchParams.set('redirect_uri', params.redirectUri);
    authorizeUrl.searchParams.set('code_challenge', params.codeChallenge);
    if (params.state) authorizeUrl.searchParams.set('state', params.state);
    if (params.scope) authorizeUrl.searchParams.set('scope', params.scope);
    if (params.resource) authorizeUrl.searchParams.set('resource', params.resource);
    // Marks the return leg. A second failure stops bouncing and redirects to
    // the web consent page's `error=session_expired` screen, which is what ends
    // the /login <-> /oauth/authorize loop.
    authorizeUrl.searchParams.set('oauth_retry', '1');

    // The public host, which always exists. A deployment that separates login
    // onto another host forwards this one 308 hop through its proxy; a
    // single-domain deployment lands on /login directly.
    const loginUrl = new URL(`${getPublicSiteUrl()}/login`);
    loginUrl.searchParams.set('redirect', authorizeUrl.toString());
    if (hadStaleSession) loginUrl.searchParams.set('expired', 'true');
    return loginUrl.toString();
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
async function validateAuthorizeRequest(params: AuthorizeParams): Promise<{ clientName: string; scope: string }> {
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
    const scope = normalizeAuthorizeScope(params.scope);
    if (!scope) {
        throw new OAuthError(400, 'invalid_scope', `Only the ${MCP_OAUTH_SCOPE} scope (optionally with ${OFFLINE_ACCESS_SCOPE}) is supported`);
    }
    const resource = getMcpPublicUrl();
    const expectedResource = resource ? `${resource}/mcp` : '';
    if (!expectedResource || params.resource !== expectedResource) {
        throw new OAuthError(400, 'invalid_target', 'resource must exactly match this MCP server');
    }
    const client = await getClient(params.clientId);
    if (!client) {
        throw new OAuthError(400, 'invalid_client', 'Unknown client_id');
    }
    assertRedirectUriAllowed(client, params.redirectUri);
    return { clientName: client.clientName || 'An AI assistant', scope };
}

/** GET /oauth/authorize — the entry point the AI client opens in a browser.
 *
 * Unauthenticated callers are sent to the web login with this exact URL as
 * `next`, so the consent screen is reached again after signing in.
 *
 * Authenticated callers are sent to the web app's branded consent screen
 * (`/oauth/consent`), which renders the form and posts the decision back to
 * `POST /oauth/authorize` unchanged.
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

    const userId = await resolveSessionUserId(req, res);
    if (!userId) {
        // The browser has already been through sign-in for this exact
        // authorization request (`oauth_retry=1`). Bouncing it to /login again
        // is the reload loop users report as "login keeps refreshing", so this
        // branch stops bouncing: it sends the browser to the web app's
        // session-expired consent screen, which only moves on an explicit
        // "Sign in again" click. No automatic hop back here means the loop
        // protection still holds, and the API renders no HTML of its own.
        if (params.retry) {
            const sessionExpiredUrl = new URL(`${getPublicSiteUrl()}/oauth/consent`);
            sessionExpiredUrl.searchParams.set('error', 'session_expired');
            sessionExpiredUrl.searchParams.set('client_id', params.clientId);
            sessionExpiredUrl.searchParams.set('redirect_uri', params.redirectUri);
            sessionExpiredUrl.searchParams.set('code_challenge', params.codeChallenge);
            sessionExpiredUrl.searchParams.set('state', params.state);
            sessionExpiredUrl.searchParams.set('scope', params.scope);
            sessionExpiredUrl.searchParams.set('resource', params.resource);
            // Deliberately no `consent_token`: this handoff carries no
            // authority, only enough of the request for the page to rebuild
            // the sign-in return URL.
            res.redirect(sessionExpiredUrl.toString());
            return;
        }
        // `redirect`, not `next`: that is the parameter the web login actually
        // reads (features/auth/components/LoginForm.tsx). The origin check in
        // isSafeInternalRedirect allows this one absolute URL because it is this
        // API's own origin.
        const hadStaleSession = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
        res.redirect(loginRedirectUrl(params, hadStaleSession));
        return;
    }

    const account = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, username: true, email: true },
    });
    const who = account?.fullName || account?.username || account?.email || 'your FresherFlow account';

    const formToken = consentFormToken({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        code_challenge: params.codeChallenge,
        state: params.state,
        scope: params.scope,
        resource: params.resource,
    });

    // The consent screen itself lives in the web app, alongside login, so it
    // can be branded. Everything the form must post back travels as query
    // parameters and is re-submitted from there as a plain urlencoded POST;
    // the HMAC token minted above is still the only thing the POST handler
    // below accepts, so this handoff carries no authority of its own.
    const consentUrl = new URL(`${getPublicSiteUrl()}/oauth/consent`);
    consentUrl.searchParams.set('client_id', params.clientId);
    consentUrl.searchParams.set('redirect_uri', params.redirectUri);
    consentUrl.searchParams.set('code_challenge', params.codeChallenge);
    consentUrl.searchParams.set('state', params.state);
    consentUrl.searchParams.set('scope', params.scope);
    consentUrl.searchParams.set('resource', params.resource);
    consentUrl.searchParams.set('consent_token', formToken);
    consentUrl.searchParams.set('client_name', clientName);
    consentUrl.searchParams.set('account', who);
    res.redirect(consentUrl.toString());
});

/** POST /oauth/authorize — the consent decision.
 *
 * Reached only from the consent form the web app renders at `/oauth/consent`,
 * which posts the decision back here. Its CSRF defence is the HMAC token bound
 * to the exact request parameters, which is why this one path is exempted from
 * the header-based gate (see middleware/csrf.ts).
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
        retry: false,
    };
    const presentedToken = str(body.consent_token);

    let clientName: string;
    let grantedScope: string;
    try {
        ({ clientName, scope: grantedScope } = await validateAuthorizeRequest(params));
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

    const userId = await resolveSessionUserId(req, res);
    if (!userId) {
        // The consent page outlived the session it was rendered with. Send the
        // browser back through sign-in rather than leaving it on a dead 401
        // page it cannot act on.
        const hadStaleSession = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
        res.redirect(loginRedirectUrl(params, hadStaleSession));
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
        scope: grantedScope,
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
                resource: str(body.resource),
            });
            res.json(tokens);
            return;
        }
        if (grantType === 'refresh_token') {
            const tokens = await refreshAccessToken(str(body.refresh_token), str(body.client_id) || undefined);
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
