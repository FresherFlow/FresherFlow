import express, { Response, NextFunction } from 'express';
import { verifyAccessToken, verifyAdminToken } from '@fresherflow/utils';
import { AppError } from './errorHandler';
import prisma from '../infrastructure/database/prisma';
import { logger } from '@fresherflow/utils';
import crypto from 'crypto';
import { getCookieDomain } from '../utils/runtimeConfig';

const COOKIE_DOMAIN = getCookieDomain();

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
 * Returns the acting staff identity for audit attribution: prefer the admin
 * session, fall back to the user session (moderators via normal login).
 */
export function actorId(req: express.Request): string | undefined {
    return req.adminId ?? req.userId;
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
            // Access token only — leave refreshToken/ff_logged_in intact so the
            // client can still refresh. Clearing here kills valid 90-day sessions
            // every time the 15-minute access token expires.
            return next(new AppError('Invalid or expired token', 401));
        }

        if (userId) {
            // V1 moderation: suspended/deactivated/banned users cannot write.
            // A transient DB error must not turn this check into a no-op: failing
            // open here would let a suspended account keep acting during exactly
            // the incident window an operator is trying to shut off. Fail closed
            // with 503 instead, which is retryable and does not look like a
            // credentials problem.
            try {
                const account = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { status: true, trustLevel: true },
                });
                if (!account) {
                    return next(new AppError('Account not found', 401));
                }
                if (account.status !== 'ACTIVE' || account.trustLevel === 'BANNED') {
                    return next(new AppError('Account suspended. Contact support.', 403));
                }
            } catch {
                return next(new AppError('Unable to verify account status. Please retry.', 503));
            }
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

    // Missing/expired access token: 401 only. Do not clear refresh cookies —
    // the client refreshes with them. Full clear stays in logout and definitive
    // refresh rejection.
    return next(new AppError('Authentication required', 401));
}

export const requireVerifiedAuth: express.RequestHandler = async (req, res, next) => {
    await requireAuth(req, res, (err) => {
        if (err) return next(err);
        if (req.isAnonymous) {
            return next(new AppError('Verified account required', 401));
        }
        next();
    });
};

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
                    email: process.env.ADMIN_EMAIL!,
                    fullName: 'Admin User',
                    role: 'ADMIN',
                    isAnonymous: false,
                    referralCode,
                    profile: { create: {} }
                }
            });
        } else if (user.status !== 'ACTIVE' || user.trustLevel === 'BANNED') {
            return next(new AppError('Account suspended. Contact support.', 403));
        }
    } catch (error) {
        logger.error('[auth] Admin user check/creation failed:', error);
        return next(new AppError('Database is temporarily unavailable. Please try again shortly.', 503));
    }

    req.adminId = adminId;
    next();
}

/**
 * Staff authentication: accepts EITHER a valid admin session OR a valid
 * signed-in user session (moderators via the normal application login).
 * Anonymous identities are never staff. Suspended/deactivated/banned accounts
 * are rejected on both paths. Sets req.adminId for admin sessions and
 * req.userId for user sessions; permission checks downstream decide what the
 * caller may do. Must precede requirePermission / requireRole.
 */
export async function requireStaff(req: express.Request, res: Response, next: NextFunction) {
    const authHeader = req.headers?.authorization;
    const bearerToken =
        authHeader && authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : undefined;

    // 1. Admin session (cookie or Bearer admin token).
    const adminToken = (req.cookies?.adminAccessToken as string | undefined) || bearerToken;
    if (adminToken) {
        let adminId: string | null = null;
        try {
            adminId = verifyAdminToken(adminToken);
        } catch {
            // Not an admin token — fall through to the user-session path so a
            // user Bearer token in Authorization is still honored.
        }
        if (adminId) {
            try {
                const user = await prisma.user.findUnique({ where: { id: adminId } });
                if (!user) {
                    const referralCode = `ADMIN_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
                    await prisma.user.create({
                        data: {
                            id: adminId,
                            email: process.env.ADMIN_EMAIL!,
                            fullName: 'Admin User',
                            role: 'ADMIN',
                            isAnonymous: false,
                            referralCode,
                            profile: { create: {} }
                        }
                    });
                } else if (user.status !== 'ACTIVE' || user.trustLevel === 'BANNED') {
                    return next(new AppError('Account suspended. Contact support.', 403));
                }
            } catch (error) {
                logger.error('[auth] Admin user check/creation failed:', error);
                return next(new AppError('Database is temporarily unavailable. Please try again shortly.', 503));
            }
            req.adminId = adminId;
            return next();
        }
        // A Bearer token that is neither admin nor (checked below) user session
        // must not fall through to anonymous access on staff routes.
        if (bearerToken) {
            try {
                const userId = verifyAccessToken(bearerToken);
                if (userId) {
                    return authorizeStaffUser(req, next, userId);
                }
            } catch {
                // Invalid/expired user token below.
            }
            const cookieToken = req.cookies?.accessToken as string | undefined;
            if (cookieToken) {
                try {
                    const userId = verifyAccessToken(cookieToken);
                    if (userId) {
                        return authorizeStaffUser(req, next, userId);
                    }
                } catch {
                    // Handled below as unauthenticated.
                }
            }
            return next(new AppError('Invalid or expired token', 401));
        }
    }

    // 2. User session (cookie access token). No anonymous fallback on staff routes.
    const token = req.cookies?.accessToken as string | undefined;
    if (!token) {
        return next(new AppError('Authentication required', 401));
    }
    let userId: string | null = null;
    try {
        userId = verifyAccessToken(token);
    } catch {
        return next(new AppError('Invalid or expired token', 401));
    }
    if (!userId) {
        return next(new AppError('Authentication required', 401));
    }
    return authorizeStaffUser(req, next, userId);
}

async function authorizeStaffUser(req: express.Request, next: NextFunction, userId: string) {
    try {
        const account = await prisma.user.findUnique({
            where: { id: userId },
            select: { status: true, trustLevel: true, isAnonymous: true },
        });
        if (!account) {
            return next(new AppError('User not found', 404));
        }
        if (account.isAnonymous) {
            return next(new AppError('Verified account required', 401));
        }
        if (account.status !== 'ACTIVE' || account.trustLevel === 'BANNED') {
            return next(new AppError('Account suspended. Contact support.', 403));
        }
    } catch (error) {
        logger.error('[auth] Staff user check failed:', error);
        return next(new AppError('Database is temporarily unavailable. Please try again shortly.', 503));
    }
    req.userId = userId;
    req.isAnonymous = false;
    return next();
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

    if (!apiKey) {
        return next(new AppError('Unauthorized: Invalid or missing API Key', 401));
    }

    const keyStr = String(apiKey);
    const secretStr = String(secret);

    if (keyStr.length !== secretStr.length) {
        return next(new AppError('Unauthorized: Invalid or missing API Key', 401));
    }

    if (!crypto.timingSafeEqual(Buffer.from(keyStr), Buffer.from(secretStr))) {
        return next(new AppError('Unauthorized: Invalid or missing API Key', 401));
    }

    next();
}

/**
 * Moderator authorization: passes admins and users holding a MODERATOR (or any)
 * AccessRole grant, rejects everyone else. Must run AFTER requireStaff, which
 * has already established req.adminId (admin session) or req.userId (user
 * session) and rejected suspended/deactivated/banned accounts.
 *
 * Admin sessions are always allowed (they are the superset). User sessions are
 * allowed only when a UserAccessRole row exists — a plain signed-in user gets
 * 403. This is the gate for the moderator queue surface; the finer per-area
 * checks stay on requirePermission.
 */
export async function requireModerator(req: express.Request, res: Response, next: NextFunction) {
    // Admin session already passed requireStaff: admins can moderate.
    if (req.adminId && !req.userId) {
        return next();
    }

    const userId = req.userId;
    if (!userId) {
        return next(new AppError('Authentication required', 401));
    }

    try {
        const grant = await prisma.userAccessRole.findFirst({
            where: { userId },
            select: { userId: true },
        });
        if (!grant) {
            return next(new AppError('Forbidden: Moderator access required', 403));
        }
    } catch (error) {
        logger.error('[requireModerator] Access role check failed:', error);
        return next(new AppError('Database is temporarily unavailable. Please try again shortly.', 503));
    }

    return next();
}

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Ensures the authenticated user (via req.userId or req.adminId) has one of the required roles.
 * Must be placed after requireAuth or requireAdmin.
 */
export function requireRole(allowedRoles: ('USER' | 'ADMIN')[]) {
    return async (req: express.Request, res: Response, next: NextFunction) => {
        const userId = req.userId || req.adminId;

        if (!userId) {
            return next(new AppError('Authentication required', 401));
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });

            if (!user) {
                return next(new AppError('User not found', 404));
            }

            if (!allowedRoles.includes(user.role as 'USER' | 'ADMIN')) {
                return next(new AppError('Forbidden: Insufficient permissions', 403));
            }

            next();
        } catch (error) {
            logger.error('[requireRole] User role check failed:', error);
            return next(new AppError('Database is temporarily unavailable. Please try again shortly.', 503));
        }
    };
}

/**
 * Permission-based authorization middleware.
 * Grants access if the authenticated user has the required permission
 * through any of their AccessRole mappings.
 *
 * Usage: requirePermission("opportunity.publish")
 */
export function requirePermission(requiredKey: string) {
    return async (req: express.Request, res: Response, next: NextFunction) => {
        const userId = req.userId || req.adminId;

        if (!userId) {
            return next(new AppError('Authentication required', 401));
        }

        try {
            if (!(await hasPermission(userId, requiredKey))) {
                return next(new AppError('Forbidden: Insufficient permissions', 403));
            }

            next();
        } catch (error) {
            logger.error('[requirePermission] Permission check failed:', error);
            return next(new AppError('Database is temporarily unavailable. Please try again shortly.', 503));
        }
    };
}

/**
 * Returns every permission key granted to a user through any AccessRole.
 * Used by the /api/auth/permissions self endpoint and by in-handler
 * least-privilege checks (e.g. resource deletes, privileged targets).
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ key: string }[]>`
        SELECT DISTINCT p."key" AS "key"
        FROM "Permission" p
        JOIN "AccessRolePermission" arp ON arp."permissionId" = p.id
        JOIN "UserAccessRole" uar ON uar."roleId" = arp."roleId"
        WHERE uar."userId" = ${userId}
    `;
    return rows.map((r) => r.key);
}

export async function hasPermission(userId: string, key: string): Promise<boolean> {
    return (await getUserPermissions(userId)).includes(key);
}

