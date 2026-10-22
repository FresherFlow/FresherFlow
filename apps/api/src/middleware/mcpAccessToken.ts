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
 */
export async function mcpSurfaceAuth(req: Request, res: Response, next: NextFunction) {
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
        res.setHeader(
            'WWW-Authenticate',
            `Bearer error="invalid_token", resource_metadata="${resourceMetadataUrl(req)}"`,
        );
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
        res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${resourceMetadataUrl(req)}"`);
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
export function resourceMetadataUrl(req: Request): string {
    const origin = process.env.MCP_PUBLIC_URL?.replace(/\/+$/, '') || `https://${req.headers.host ?? ''}`;
    return `${origin}/.well-known/oauth-protected-resource`;
}
