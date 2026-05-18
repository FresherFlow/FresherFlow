import express, { Response, NextFunction } from 'express';
import { verifyAccessToken, verifyAdminToken } from '@fresherflow/auth';
import { AppError } from './errorHandler';
import prisma from '../infrastructure/database/prisma';
import { logger } from '@fresherflow/logger';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            userId?: string;
            adminId?: string;
            isAnonymous?: boolean;
        }
    }
}

/**
 * Resolves a user via the 'x-fresherflow-anon-id' header if no standard auth exists.
 * Returns the userId (existing or newly created).
 */
async function resolveAnonymousUser(req: express.Request): Promise<string | null> {
    const anonId = req.headers['x-fresherflow-anon-id'] as string | undefined;
    if (!anonId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { anon_id: anonId },
            select: { id: true }
        });

        if (user) return user.id;

        // Create new anonymous user with a default profile to ensure compatibility
        const newUser = await prisma.user.create({
            data: {
                isAnonymous: true,
                anon_id: anonId,
                profile: {
                    create: {
                        completionPercentage: 0
                    }
                }
            },
            select: { id: true }
        });

        return newUser.id;
    } catch (error) {
        // Log error but don't block auth flow
        logger.error('[auth] Anonymous user resolution failed:', error);
        return null;
    }
}

// Optional User Authentication Middleware
export async function optionalAuth(req: express.Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const bearerToken =
        authHeader && authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : undefined;
    const token = req.cookies?.accessToken || bearerToken;

    if (token) {
        try {
            const userId = verifyAccessToken(token);
            if (userId) {
                req.userId = userId;
                req.isAnonymous = false;
            }
        } catch {
            // Ignore token verification errors for optional auth
        }
    }

    // Fallback to anonymous identity if no token-based userId
    if (!req.userId) {
        const anonUserId = await resolveAnonymousUser(req);
        if (anonUserId) {
            req.userId = anonUserId;
            req.isAnonymous = true;
        }
    }

    next();
}

// User Authentication Middleware
export async function requireAuth(req: express.Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const bearerToken =
        authHeader && authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : undefined;
    const token = req.cookies?.accessToken || bearerToken;

    if (token) {
        let userId: string | null = null;
        try {
            userId = verifyAccessToken(token);
        } catch {
            return next(new AppError('Invalid or expired token', 401));
        }

        if (userId) {
            req.userId = userId;
            req.isAnonymous = false;
            return next();
        }
    }

    // Fallback to anonymous identity if no token-based userId
    const anonUserId = await resolveAnonymousUser(req);
    if (anonUserId) {
        req.userId = anonUserId;
        req.isAnonymous = true;
        return next();
    }

    return next(new AppError('Authentication required', 401));
}

// Admin Authentication Middleware
// Accepts both cookie (web) and Authorization Bearer header (mobile app)
export function requireAdmin(req: express.Request, res: Response, next: NextFunction) {
    const cookieToken = req.cookies?.adminAccessToken as string | undefined;
    const authHeader = req.headers ? req.headers.authorization : undefined;
    const bearerToken =
        authHeader && authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : undefined;

    const token = cookieToken || bearerToken;

    if (!token) {
        return next(new AppError('No admin token provided', 401));
    }

    let adminId: string | null = null;
    try {
        adminId = verifyAdminToken(token);
    } catch {
        return next(new AppError('Invalid admin token', 403));
    }

    if (!adminId) {
        return next(new AppError('Invalid admin token', 403));
    }

    req.adminId = adminId;
    next();
}
