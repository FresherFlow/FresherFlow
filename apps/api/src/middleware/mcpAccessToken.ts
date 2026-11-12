import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';
import { logger } from '@fresherflow/utils';
import prisma from '../infrastructure/database/prisma';
import { verifyAccessToken as verifyMcpAccessToken } from '../infrastructure/services/platform/mcpOAuth.service';

/**
 * Authentication for the MCP server's API surface (`/api/internal/mcp`).
 *
 * Two callers reach it:
 *
 *   1. A signed-in user through an AI client, holding an OAuth 2.1 bearer token
 *      minted by `routes/oauth.ts`. This is the path that gives MCP calls an
 *      identity: `req.userId` is set, so every existing `requirePermission`
 *      check downstream applies unchanged.
 *   2. The first-party pipeline scripts, holding `INTERNAL_API_SECRET`, which
 *      have no user identity and must not be treated as one.
 *
 * Order matters: a bearer token is checked as an MCP access token first, and the
 * service key second. A token that is neither is rejected — the surface never
 * falls back to anonymous access.
 *
 * One exception exists, and it is fail-closed: `tryLocalDevIdentity` below. It
 * answers only when every local-dev gate holds, so in any other deployment the
 * bearer/service-key order above runs exactly as written.
 */

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Resolve a local development identity for the MCP worker running on this
 * machine, so it can call the API without an OAuth bearer.
 *
 * Mirrors open-seo's `AUTH_MODE=local_noauth`: unset means normal auth, and
 * the mode only ever applies locally. Every gate is required — a missing one
 * returns null and the caller's existing credential logic runs unchanged:
 *
 *   1. the request opted in with `x-mcp-local-dev` (a header an external
 *      client would not know to send, and which we still do not trust alone);
 *   2. this is not a production process;
 *   3. `MCP_AUTH_MODE=local_noauth` was set deliberately;
 *   4. the peer is loopback — the mode is unreachable off this machine even
 *      if the flag leaked into another environment;
 *   5. `MCP_LOCAL_DEV_USER_EMAIL` names an existing ACTIVE account. Unset or
 *      unresolvable means no identity, so the caller gets the normal 401.
 *
 * The environment drives everything: no user or host is hardcoded here.
 */
export async function tryLocalDevIdentity(req: Request): Promise<string | null> {
    if (!req.headers['x-mcp-local-dev']) return null;
    if (process.env.NODE_ENV === 'production') return null;
    if (process.env.MCP_AUTH_MODE !== 'local_noauth') return null;
    const remoteAddress = req.socket.remoteAddress ?? '';
    if (!LOOPBACK_ADDRESSES.has(remoteAddress)) return null;

    const email = process.env.MCP_LOCAL_DEV_USER_EMAIL?.trim();
    if (!email) {
        // Names the missing variable only — never a credential.
        logger.error('[mcpSurfaceAuth] MCP_AUTH_MODE=local_noauth is set but MCP_LOCAL_DEV_USER_EMAIL is not; local dev identity disabled.');
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, status: true },
    });
    if (!user) return null;
    if (user.status !== 'ACTIVE') return null;
    return user.id;
}

export async function mcpSurfaceAuth(req: Request, res: Response, next: NextFunction) {
    // Tried before any credential is read: a local dev call carries neither a
    // bearer nor a service key by design, and the helper's gates decide whether
    // that is acceptable here at all.
    const localDevUserId = await tryLocalDevIdentity(req);
    if (localDevUserId) {
        req.userId = localDevUserId;
        req.isAnonymous = false;
        next();
        return;
    }

    const header = req.headers.authorization;
    const bearer = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

    if (bearer) {
        const identity = await verifyMcpAccessToken(bearer);
        if (identity) {
            // A token outlives a suspension: revoking sessions does not revoke the
            // MCP tokens a connected AI client already holds. So the account is
            // re-checked on every call, and a non-active one is refused here
            // rather than being allowed to act until its token happens to expire.
            const account = await prisma.user.findUnique({
                where: { id: identity.userId },
                select: { status: true },
            });
            if (!account) {
                next(new AppError('Invalid or expired access token', 401));
                return;
            }
            if (account.status !== 'ACTIVE') {
                next(new AppError('This FresherFlow account is not active, so FresherFlow tools are unavailable.', 403));
                return;
            }
            req.userId = identity.userId;
            req.isAnonymous = false;
            next();
            return;
        }
        // A present-but-unusable bearer token must not silently become a service
        // key attempt; the client needs to know to re-authorize.
        const metadataUrl = resourceMetadataUrl();
        if (metadataUrl) {
            res.setHeader(
                'WWW-Authenticate',
                `Bearer error="invalid_token", resource_metadata="${metadataUrl}"`,
            );
        }
        next(new AppError('Invalid or expired access token', 401));
        return;
    }

    const apiKey = req.headers['x-api-key'];
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret) {
        logger.error('[mcpSurfaceAuth] INTERNAL_API_SECRET is not configured on this server.');
        next(new AppError('Internal API not configured', 503));
        return;
    }
    if (!apiKey) {
        const metadataUrl = resourceMetadataUrl();
        if (metadataUrl) {
            res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${metadataUrl}"`);
        }
        next(new AppError('Unauthorized: missing credential', 401));
        return;
    }

    const presented = Buffer.from(String(apiKey));
    const expected = Buffer.from(secret);
    if (presented.length !== expected.length || !crypto.timingSafeEqual(presented, expected)) {
        next(new AppError('Unauthorized: Invalid or missing API Key', 401));
        return;
    }
    next();
}

/**
 * The discovery URL a client should fetch to start OAuth. Advertised in
 * WWW-Authenticate so a client that has never seen this server can still find
 * the authorization server.
 */
let reportedInvalidMcpPublicUrl = false;

export function resourceMetadataUrl(): string | null {
    const raw = process.env.MCP_PUBLIC_URL?.trim();
    if (!raw) {
        if (!reportedInvalidMcpPublicUrl) {
            logger.error('[mcpSurfaceAuth] MCP_PUBLIC_URL is missing; OAuth metadata challenge cannot be advertised.');
            reportedInvalidMcpPublicUrl = true;
        }
        return null;
    }

    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password
            || parsed.pathname !== '/' || parsed.search || parsed.hash) {
            throw new Error('MCP_PUBLIC_URL must be an HTTPS origin');
        }
        return `${parsed.origin}/.well-known/oauth-protected-resource`;
    } catch {
        if (!reportedInvalidMcpPublicUrl) {
            logger.error('[mcpSurfaceAuth] MCP_PUBLIC_URL is invalid; OAuth metadata challenge cannot be advertised.');
            reportedInvalidMcpPublicUrl = true;
        }
        return null;
    }
}
