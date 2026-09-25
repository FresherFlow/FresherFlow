import prisma from '../infrastructure/database/prisma';
import { User } from '@fresherflow/types';
import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashRefreshToken
} from '@fresherflow/utils';
import { validate } from '../middleware/validate';
import { sendOtpSchema, verifyOtpSchema, googleAuthSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { AuthService } from '../infrastructure/services/auth.service';
import { EmailService } from '../infrastructure/services/email.service';
import { eventService } from '../infrastructure/services/event.service';
import { createRateLimiter } from '../middleware/rateLimit';
import { getCookieDomain } from '../utils/runtimeConfig';
import { calculateCompletion } from '@fresherflow/utils';
import { Profile } from '@fresherflow/types';
import { verifyFirebaseToken } from '../middleware/firebaseAuth';
import { getFirebaseAuth } from '../lib/firebase';

// Rate Limiters
const otpSendLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many verification codes sent. Please try again after an hour.',
    keyPrefix: 'rate:otp:send'
});

const authVerifyLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many verification attempts. Please try again later.',
    keyPrefix: 'rate:auth:verify'
});

const anonymousAuthLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 creations per window per IP
    message: 'Too many requests to register anonymous accounts. Please try again later.',
    keyPrefix: 'rate:auth:anonymous'
});

const router: Router = express.Router();

const COOKIE_DOMAIN = getCookieDomain();

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as 'lax' | 'strict' | 'none',
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
};

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

function clearCookieVariants(res: Response, name: string, httpOnly = true) {
    const baseOptions = {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as 'lax' | 'strict' | 'none',
        httpOnly,
    };

    res.clearCookie(name, baseOptions);

    if (COOKIE_DOMAIN) {
        const normalizedDomain = COOKIE_DOMAIN.replace(/^\./, '');
        res.clearCookie(name, { ...baseOptions, domain: COOKIE_DOMAIN });
        res.clearCookie(name, { ...baseOptions, domain: normalizedDomain });
    }
}

function clearAuthCookieVariants(res: Response) {
    clearCookieVariants(res, 'accessToken');
    clearCookieVariants(res, 'refreshToken');
    clearCookieVariants(res, 'ff_logged_in', false);
}

function isDatabaseUnavailableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message || '';
    return (
        error.name === 'PrismaClientInitializationError' ||
        message.includes("Can't reach database server") ||
        message.includes('Authentication failed against database server') ||
        message.includes('Invalid `prisma.')
    );
}

function toAuthRouteError(
    error: unknown,
    fallbackMessage: string,
    fallbackStatus = 401
): AppError {
    if (error instanceof AppError) return error;
    if (isDatabaseUnavailableError(error)) {
        return new AppError('Database is temporarily unavailable. Please try again shortly.', 503);
    }

    const message = error instanceof Error ? error.message : fallbackMessage;
    return new AppError(message, fallbackStatus);
}

async function setAuthCookies(user: User, res: Response) {
    const accessToken = generateAccessToken(user.id);
    const { token: refreshToken, hash: tokenHash } = generateRefreshToken(user.id);

    clearAuthCookieVariants(res);

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS)
        }
    });

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE_MS });
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
    res.cookie('ff_logged_in', 'true', { ...COOKIE_OPTIONS, httpOnly: false, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
    return { accessToken, refreshToken };
}

async function hydrateProfileCompletion(userId: string, profile: Profile | null) {
    if (!profile) return null;

    const calculatedCompletion = calculateCompletion(profile);
    if (profile.completionPercentage === calculatedCompletion) {
        return profile;
    }

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { completionPercentage: calculatedCompletion },
    });

    return updatedProfile as unknown as Profile;
}

/**
 * Common logic to handle merging of anonymous activity into a signed-in account.
 * (Deprecated: Now handled via Firebase Linkage)
 */
async function tryMergeAnonymousIdentity(_req: Request, _userId: string) {
    // Legacy support or internal tracking if needed
}

// POST /api/auth/anonymous
router.post('/anonymous', (_req: Request, res: Response) => {
    return res.status(404).json({ error: 'Not available' });
});

// ─── HANDSHAKE ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/handshake
 * Migrates/links a Firebase-authenticated user to our local Prisma DB.
 * Used by mobile app to initialize session after Firebase sign-in.
 */
router.post('/handshake', verifyFirebaseToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const firebaseUser = req.firebaseUser;
        if (!firebaseUser) return next(new AppError('Firebase user not found in request', 401));

        const { ref } = req.body;
        const { uid, email, name } = firebaseUser;

        // 1. Handshake with identity mapping (Supports Anonymous users)
        const { user, isNewUser } = await AuthService.handshake(uid, email || undefined, name || undefined, ref);

        // 2. Set standard session cookies
        const tokens = await setAuthCookies(user as unknown as User, res);

        // 3. Record success
        await eventService.track({
            type: 'AUTH_STEP',
            source: 'mobile',
            userId: user.id,
            metadata: { isNewUser, method: 'handshake' }
        });

        res.json({
            user: { 
                id: user.id, 
                email: user.email || null, 
                fullName: user.fullName || null, 
                username: (user as User).username || null,
                role: (user as User).role,
                memberships: (user as any).organizationMemberships || []
            },
            profile: (user as User).profile || null,
            ...tokens,
        });
    } catch (error) {
        next(toAuthRouteError(error, 'Handshake failed', 500));
    }
});

// POST /api/auth/otp/send
router.post('/otp/send', otpSendLimiter, validate(sendOtpSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const code = AuthService.generateOtp(email);
        await EmailService.sendOtp(email, code);
        res.json({ message: 'Verification code sent successfully' });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/otp/verify
router.post('/otp/verify', authVerifyLimiter, validate(verifyOtpSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, code, source, ref, firebaseUid } = req.body;
        const { user, isNewUser } = await AuthService.verifyOtp(email, code, ref, firebaseUid);

        const tokens = await setAuthCookies(user as User, res);
        await eventService.track({
            type: 'AUTH_STEP',
            source: source || 'unknown',
            userId: user.id,
            metadata: { isNewUser, method: 'otp' }
        });

        // Merge guest data if x-fresherflow-anon-id is present
        await tryMergeAnonymousIdentity(req, user.id);

        // Generate Firebase Custom Token
        const uidForToken = user.firebase_uid || user.id;
        const auth = getFirebaseAuth();
        const firebaseCustomToken = await auth.createCustomToken(uidForToken);

        res.json({
            user: {
                id: user.id,
                email: user.email || null,
                fullName: user.fullName || null,
                username: user.username || null
            },
            profile: (user as User).profile || null,
            firebaseCustomToken,
            ...tokens,
        });
    } catch (error) {
        next(toAuthRouteError(error, 'Authentication failed'));
    }
});

// POST /api/auth/google
router.post('/google', authVerifyLimiter, validate(googleAuthSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, source, ref, firebaseUid } = req.body;
        const { user, isNewUser } = await AuthService.verifyGoogleIdToken(token, ref, firebaseUid);

        const tokens = await setAuthCookies(user as User, res);
        await eventService.track({
            type: 'AUTH_STEP',
            source: source || 'unknown',
            userId: user.id,
            metadata: { isNewUser, method: 'google' }
        });

        // Merge guest data if x-fresherflow-anon-id is present
        await tryMergeAnonymousIdentity(req, user.id);

        const uidForToken = user.firebase_uid || user.id;
        const auth = getFirebaseAuth();
        const firebaseCustomToken = await auth.createCustomToken(uidForToken);

        res.json({
            user: { id: user.id, email: user.email || null, fullName: user.fullName || null, username: (user as User).username || null },
            profile: (user as User).profile || null,
            firebaseCustomToken,
            ...tokens,
        });
    } catch (error) {
        next(toAuthRouteError(error, 'Google authentication failed'));
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const headerRefreshToken = req.header('x-refresh-token') || req.header('x-refresh-token'.toLowerCase());
        const refreshToken = req.cookies.refreshToken || headerRefreshToken;
        if (!refreshToken) {
            // Do not clear cookies here. A parallel refresh may have just rotated
            // and Set-Cookie'd a live pair; wiping on this response races that win.
            return next(new AppError('No refresh token provided', 401));
        }

        const userId = verifyRefreshToken(refreshToken);
        if (!userId) {
            clearAuthCookieVariants(res);
            return next(new AppError('Invalid refresh token', 401));
        }

        // Rotation race tolerance: two tabs (or a retry) can present the same
        // refresh token at once when access tokens expire together. A token
        // revoked within the grace window means a sibling just rotated it, so
        // hand this caller a fresh pair instead of killing its session.
        // Anything older is treated as genuine expiry/theft as before.
        const REFRESH_REUSE_GRACE_MS = 60 * 1000;

        const tokenHash = hashRefreshToken(refreshToken);
        const rotation = await prisma.$transaction(async (tx) => {
            const liveToken = await tx.refreshToken.findFirst({
                where: { tokenHash, userId, revokedAt: null, expiresAt: { gt: new Date() } }
            });
            if (liveToken) {
                await tx.refreshToken.update({
                    where: { id: liveToken.id },
                    data: { revokedAt: new Date() }
                });
                return true;
            }

            const recentlyRevoked = await tx.refreshToken.findFirst({
                where: {
                    tokenHash,
                    userId,
                    revokedAt: { gt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS) }
                }
            });
            if (!recentlyRevoked) return false;

            // Retire whatever is currently live so only one token stays valid.
            const current = await tx.refreshToken.findFirst({
                where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
                orderBy: { createdAt: 'desc' }
            });
            if (current) {
                await tx.refreshToken.update({
                    where: { id: current.id },
                    data: { revokedAt: new Date() }
                });
            }
            return true;
        });

        if (!rotation) {
            clearAuthCookieVariants(res);
            return next(new AppError('Refresh token expired or revoked', 401));
        }

        // Generate a new token pair
        const newAccessToken = generateAccessToken(userId);
        const { token: newRefreshToken, hash: newTokenHash } = generateRefreshToken(userId);

        await prisma.refreshToken.create({
            data: {
                userId,
                tokenHash: newTokenHash,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS)
            }
        });

        res.cookie('accessToken', newAccessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE_MS });
        res.cookie('refreshToken', newRefreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
        res.cookie('ff_logged_in', 'true', { ...COOKIE_OPTIONS, httpOnly: false, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
        res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        next(toAuthRouteError(error, 'Failed to refresh session', 500));
    }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            try {
                const tokenHash = hashRefreshToken(refreshToken);
                await prisma.refreshToken.updateMany({
                    where: { tokenHash },
                    data: { revokedAt: new Date() }
                });
            } catch { /* ignore malformed token */ }
        }

        clearAuthCookieVariants(res);

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
});

// GET /api/auth/permissions
// Returns the caller's AccessRole grants for client-side gating of the
// moderator area. requireAuth already rejects anonymous/suspended callers;
// the payload is advisory — every moderation route re-checks server-side.
router.get('/permissions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rows = await prisma.$queryRaw<{ key: string; role: string }[]>`
            SELECT DISTINCT p."key" AS "key", r."name" AS "role"
            FROM "Permission" p
            JOIN "AccessRolePermission" arp ON arp."permissionId" = p.id
            JOIN "UserAccessRole" uar ON uar."roleId" = arp."roleId"
            JOIN "AccessRole" r ON r."id" = uar."roleId"
            WHERE uar."userId" = ${req.userId}
        `;
        res.setHeader('Cache-Control', 'private, no-store');
        res.json({
            roles: Array.from(new Set(rows.map((r) => r.role))),
            permissions: rows.map((r) => r.key),
        });
    } catch (error) {
        next(error);
    }
});
 
// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { 
                profile: true,
                organizationMemberships: {
                    include: {
                        organization: true
                    }
                }
            }
        });

        if (!user) return next(new AppError('User not found', 404));

        const profile = await hydrateProfileCompletion(
            user.id as string,
            (user.profile as unknown as Profile) || null
        );

        res.json({
            user: { 
                id: user.id, 
                email: user.email, 
                fullName: user.fullName, 
                username: user.username || null,
                role: user.role,
                memberships: user.organizationMemberships
            },
            profile
        });
    } catch (error) {
        next(error);
    }
});

export default router;
