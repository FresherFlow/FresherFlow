import crypto from 'crypto';
import prisma from '../../database/prisma';
import { logger } from '@fresherflow/utils';

/**
 * OAuth 2.1 authorization server state for the FresherFlow MCP server.
 *
 * ChatGPT and Codex will not accept a static API key or a custom header for an
 * MCP connector (developers.openai.com/plugins/build/auth), so caller identity on
 * that surface can only come from an authorization-code + PKCE flow. This module
 * owns the state that flow needs; the routes in `routes/oauth.ts` own the HTTP
 * shape and the discovery documents.
 *
 * Design rules, each one deliberate:
 * - Access and refresh tokens are opaque and stored as SHA-256 hashes. A JWT
 *   could not be withdrawn before its expiry, and "revoke this connection now"
 *   is a product requirement.
 * - Authorization codes are single-use (`usedAt`) and PKCE-bound (S256 only).
 * - Redirect URIs are matched exactly, never by prefix or wildcard.
 * - MCP tokens live in their own tables. Revoking a connection must not sign the
 *   user out of the website, which shares the same cookie-based session.
 */

/** The one scope this surface grants. Advertised in the discovery documents. */
export const MCP_OAUTH_SCOPE = 'mcp';

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/** Refresh a token's lastUsedAt no more often than this, to avoid a write per call. */
const LAST_USED_WRITE_INTERVAL_MS = 60 * 1000;

/**
 * A failure the OAuth endpoints must surface in RFC 6749 shape
 * (`{ error, error_description }`) rather than the API's usual envelope.
 */
export class OAuthError extends Error {
    readonly status: number;
    readonly error: string;

    constructor(status: number, error: string, description: string) {
        super(description);
        this.name = 'OAuthError';
        this.status = status;
        this.error = error;
    }
}

function sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function randomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * PKCE S256 verification. The client sends the SHA-256 of its verifier,
 * base64url-encoded; we recompute and compare in constant time.
 *
 * `plain` is not supported on purpose: the MCP authorization spec requires S256,
 * and accepting `plain` would let an intercepted code be replayed with it.
 */
export function verifyPkceChallenge(codeVerifier: string, codeChallenge: string): boolean {
    if (!codeVerifier || !codeChallenge) return false;
    const computed = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const presented = Buffer.from(computed);
    const expected = Buffer.from(codeChallenge);
    if (presented.length !== expected.length) return false;
    return crypto.timingSafeEqual(presented, expected);
}

export interface RegisterClientInput {
    clientName?: string | null;
    redirectUris: string[];
}

/**
 * Register a client through dynamic client registration.
 *
 * Public clients only: ChatGPT exchanges its code without a client secret and
 * proves possession with PKCE instead, so no secret is minted here.
 */
export async function registerClient(input: RegisterClientInput) {
    const redirectUris = [...new Set(input.redirectUris.map((uri) => uri.trim()).filter(Boolean))];
    if (redirectUris.length === 0) {
        throw new OAuthError(400, 'invalid_redirect_uri', 'At least one redirect_uri is required');
    }

    const clientId = `ffc_${randomToken(16)}`;
    const client = await prisma.oAuthClient.create({
        data: {
            clientId,
            clientName: input.clientName?.trim().slice(0, 120) || null,
            redirectUris,
        },
        select: { clientId: true, clientName: true, redirectUris: true },
    });

    logger.info('[mcp-oauth] Registered client', { clientId, redirectUris });
    return client;
}

export async function getClient(clientId: string) {
    return prisma.oAuthClient.findUnique({
        where: { clientId },
        select: { clientId: true, clientName: true, redirectUris: true },
    });
}

/**
 * A redirect URI is only accepted if it is registered **exactly**. An attacker
 * holding a stolen code cannot redirect it anywhere else, and no wildcard or
 * prefix match exists to widen the target.
 */
export function assertRedirectUriAllowed(client: { redirectUris: string[] }, redirectUri: string): void {
    if (!client.redirectUris.includes(redirectUri)) {
        throw new OAuthError(400, 'invalid_request', 'redirect_uri is not registered for this client');
    }
}

export interface CreateAuthorizationCodeInput {
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    scope?: string;
    resource?: string | null;
}

/** Mint a single-use authorization code. The raw code is returned, never stored. */
export async function createAuthorizationCode(input: CreateAuthorizationCodeInput): Promise<string> {
    const code = randomToken(32);
    await prisma.oAuthAuthorizationCode.create({
        data: {
            codeHash: sha256(code),
            clientId: input.clientId,
            userId: input.userId,
            redirectUri: input.redirectUri,
            codeChallenge: input.codeChallenge,
            scope: input.scope ?? MCP_OAUTH_SCOPE,
            resource: input.resource ?? null,
            expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
    });
    return code;
}

export interface ExchangeCodeInput {
    code: string;
    clientId: string;
    redirectUri: string;
    codeVerifier: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
    refresh_token: string;
    scope: string;
}

function toTokenResponse(accessToken: string, refreshToken: string, scope: string): TokenResponse {
    return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
        refresh_token: refreshToken,
        scope,
    };
}

async function issueTokens(clientId: string, userId: string, scope: string): Promise<TokenResponse> {
    const accessToken = randomToken(32);
    const refreshToken = randomToken(32);
    await prisma.$transaction(async (tx) => {
        await tx.oAuthAccessToken.create({
            data: {
                tokenHash: sha256(accessToken),
                clientId,
                userId,
                scope,
                expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
            },
        });
        await tx.oAuthRefreshToken.create({
            data: {
                tokenHash: sha256(refreshToken),
                clientId,
                userId,
                scope,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            },
        });
        await tx.oAuthClient.update({ where: { clientId }, data: { lastUsedAt: new Date() } });
    });
    return toTokenResponse(accessToken, refreshToken, scope);
}

/**
 * Exchange an authorization code for tokens.
 *
 * Every failure mode is a distinct rejection: unknown code, expired code, reused
 * code, wrong client, mismatched redirect_uri, bad PKCE verifier. A code that
 * fails PKCE is consumed anyway — otherwise a stolen code stays valid for a
 * second guess at the verifier.
 */
export async function exchangeAuthorizationCode(input: ExchangeCodeInput): Promise<TokenResponse> {
    const row = await prisma.oAuthAuthorizationCode.findUnique({
        where: { codeHash: sha256(input.code) },
        select: {
            id: true, clientId: true, userId: true, redirectUri: true,
            codeChallenge: true, scope: true, expiresAt: true, usedAt: true,
        },
    });

    if (!row) {
        throw new OAuthError(400, 'invalid_grant', 'Authorization code is invalid');
    }
    if (row.usedAt) {
        // A replayed code means the code leaked; kill every token it produced.
        await revokeClientTokensForUser(row.userId, row.clientId);
        throw new OAuthError(400, 'invalid_grant', 'Authorization code has already been used');
    }
    if (row.expiresAt.getTime() < Date.now()) {
        throw new OAuthError(400, 'invalid_grant', 'Authorization code has expired');
    }
    if (row.clientId !== input.clientId) {
        throw new OAuthError(400, 'invalid_grant', 'Authorization code was issued to another client');
    }
    if (row.redirectUri !== input.redirectUri) {
        throw new OAuthError(400, 'invalid_grant', 'redirect_uri does not match the authorization request');
    }

    const pkceOk = verifyPkceChallenge(input.codeVerifier, row.codeChallenge);
    await prisma.oAuthAuthorizationCode.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
    });
    if (!pkceOk) {
        throw new OAuthError(400, 'invalid_grant', 'PKCE verification failed');
    }

    return issueTokens(row.clientId, row.userId, row.scope || MCP_OAUTH_SCOPE);
}

/**
 * Refresh grant. The presented refresh token is revoked as part of the exchange
 * (rotation), so a leaked refresh token is usable at most once.
 */
export async function refreshAccessToken(refreshToken: string, clientId: string): Promise<TokenResponse> {
    const row = await prisma.oAuthRefreshToken.findUnique({
        where: { tokenHash: sha256(refreshToken) },
        select: { id: true, clientId: true, userId: true, scope: true, expiresAt: true, revokedAt: true },
    });

    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) {
        throw new OAuthError(400, 'invalid_grant', 'Refresh token is invalid or expired');
    }
    if (row.clientId !== clientId) {
        throw new OAuthError(400, 'invalid_grant', 'Refresh token was issued to another client');
    }

    await prisma.oAuthRefreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    return issueTokens(row.clientId, row.userId, row.scope || MCP_OAUTH_SCOPE);
}

export interface McpAccessIdentity {
    userId: string;
    clientId: string;
    scope: string;
}

/**
 * Verify a bearer token presented to the MCP surface.
 *
 * Returns null for anything unusable (unknown, revoked, expired) so the caller
 * answers with a 401 challenge rather than leaking which case it was.
 */
export async function verifyAccessToken(token: string): Promise<McpAccessIdentity | null> {
    if (!token) return null;
    const row = await prisma.oAuthAccessToken.findUnique({
        where: { tokenHash: sha256(token) },
        select: { id: true, userId: true, clientId: true, scope: true, expiresAt: true, revokedAt: true, lastUsedAt: true },
    });
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) return null;

    // Best-effort usage stamp; a failure here must not fail the tool call.
    const stale = !row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS;
    if (stale) {
        try {
            await prisma.oAuthAccessToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
        } catch {
            // Ignored on purpose: telemetry must never break authentication.
        }
    }

    return { userId: row.userId, clientId: row.clientId, scope: row.scope };
}

/** RFC 7009 revocation. Unknown tokens are reported as success, per the spec. */
export async function revokeToken(token: string): Promise<void> {
    const hash = sha256(token);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
        await tx.oAuthAccessToken.updateMany({ where: { tokenHash: hash, revokedAt: null }, data: { revokedAt: now } });
        await tx.oAuthRefreshToken.updateMany({ where: { tokenHash: hash, revokedAt: null }, data: { revokedAt: now } });
    });
}

async function revokeClientTokensForUser(userId: string, clientId: string): Promise<void> {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
        await tx.oAuthAccessToken.updateMany({ where: { userId, clientId, revokedAt: null }, data: { revokedAt: now } });
        await tx.oAuthRefreshToken.updateMany({ where: { userId, clientId, revokedAt: null }, data: { revokedAt: now } });
    });
}

export interface ConnectionSummary {
    id: string;
    clientId: string;
    clientName: string | null;
    connectedAt: Date;
    lastUsedAt: Date | null;
}

/**
 * The user's connected MCP clients, for the "connected apps" surface.
 *
 * One row per client, keyed by the oldest live access token, so the list reads as
 * connections rather than as tokens. Revoking is per connection, which is what a
 * user means by "disconnect this app".
 */
export async function listConnections(userId: string): Promise<ConnectionSummary[]> {
    const tokens = await prisma.oAuthAccessToken.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true, clientId: true, createdAt: true, lastUsedAt: true,
            client: { select: { clientName: true } },
        },
    });

    const byClient = new Map<string, ConnectionSummary>();
    for (const token of tokens) {
        const existing = byClient.get(token.clientId);
        if (existing) {
            if (token.lastUsedAt && (!existing.lastUsedAt || token.lastUsedAt > existing.lastUsedAt)) {
                existing.lastUsedAt = token.lastUsedAt;
            }
            continue;
        }
        byClient.set(token.clientId, {
            id: token.id,
            clientId: token.clientId,
            clientName: token.client?.clientName ?? null,
            connectedAt: token.createdAt,
            lastUsedAt: token.lastUsedAt,
        });
    }
    return [...byClient.values()];
}

/**
 * Disconnect a client for one user. Scoped by `userId`, so a user can only ever
 * revoke their own connection — the id in the URL is not trusted on its own.
 */
export async function revokeConnection(userId: string, connectionId: string): Promise<void> {
    const token = await prisma.oAuthAccessToken.findFirst({
        where: { id: connectionId, userId },
        select: { clientId: true },
    });
    if (!token) {
        throw new OAuthError(404, 'not_found', 'Connection not found');
    }
    await revokeClientTokensForUser(userId, token.clientId);
    logger.info('[mcp-oauth] Connection revoked', { userId });
}
