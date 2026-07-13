import express, { Response, NextFunction } from 'express';
import { verifyAccessToken, verifyAdminToken } from '@fresherflow/auth';
import { AppError } from './errorHandler';
import prisma from '../infrastructure/database/prisma';
import { logger } from '@fresherflow/logger';
import crypto from 'crypto';

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
    const anonId = req.headers?.['x-fresherflow-anon-id'] as string | undefined;
    if (!anonId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { anon_id: anonId },
            select: { id: true }
        });

        if (user) return user.id;
        return null;
    } catch (error) {
        // Log error but don't block auth flow
        logger.error('[auth] Anonymous user resolution failed:', error);
        return null;
    }
}

// Optional User Authentication Middleware
export async function optionalAuth(req: express.Request, res: Response, next: NextFunction) {
    const authHeader = req.headers?.authorization;
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
    const authHeader = req.headers?.authorization;
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
export async function requireAdmin(req: express.Request, res: Response, next: NextFunction) {
    const cookieToken = req.cookies?.adminAccessToken as string | undefined;
    const authHeader = req.headers?.authorization;
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

    try {
        const user = await prisma.user.findUnique({ where: { id: adminId } });
        if (!user) {
            const referralCode = `ADMIN_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            await prisma.user.create({
                data: {
                    id: adminId,
                    email: process.env.ADMIN_EMAIL || 'cheekatlamukesh+admin@gmail.com',
                    fullName: 'Admin User',
                    role: 'ADMIN',
                    isAnonymous: false,
                    referralCode,
                    profile: { create: {} }
                }
            });
        }
    } catch (error) {
        logger.error('[auth] Admin user check/creation failed:', error);
        return next(new AppError('Database is temporarily unavailable. Please try again shortly.', 503));
    }

    req.adminId = adminId;
    next();
}

/**
 * Internal API Key Middleware
 * Validates requests from automated pipeline scripts (e.g. job sweeper, ingestion bots).
 * Checks the `x-api-key` header against INTERNAL_API_SECRET env variable.
 * Does NOT create a session — used purely for machine-to-machine calls.
 */
export function requireInternalApiKey(req: express.Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'];
    const secret = process.env.INTERNAL_API_SECRET;

    if (!secret) {
        logger.error('[requireInternalApiKey] INTERNAL_API_SECRET is not configured on this server.');
        return next(new AppError('Internal API not configured', 503));
    }

    if (!apiKey || apiKey !== secret) {
        return next(new AppError('Unauthorized: Invalid or missing API Key', 401));
    }

    next();
}
