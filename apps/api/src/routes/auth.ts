import prisma from '../infrastructure/database/prisma';
import { User } from '@fresherflow/types';
import express, { Router, Request, Response, NextFunction } from 'express';

import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashRefreshToken
} from '@fresherflow/auth';
import { validate } from '../middleware/validate';
import { sendOtpSchema, verifyOtpSchema, googleAuthSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { AuthService } from '../infrastructure/services/auth.service';
import { EmailService } from '../infrastructure/services/email.service';
import { eventService } from '../infrastructure/services/event.service';
import { createRateLimiter } from '../middleware/rateLimit';
import { getCookieDomain } from '../utils/runtimeConfig';
import { calculateCompletion } from '@fresherflow/domain';
import { Profile } from '@fresherflow/types';
import { verifyFirebaseToken } from '../middleware/firebaseAuth';
import { auth as firebaseAdminAuth } from '../lib/firebase';

// Rate Limiters
const otpSendLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many verification codes sent. Please try again after an hour.',
    keyPrefix: 'rate:otp:send'
});

const authVerifyLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 15,
    message: 'Too many login attempts. Please try again after an hour.',
    keyPrefix: 'rate:auth:verify'
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
            user: { id: user.id, email: user.email || null, fullName: user.fullName || null, username: (user as User).username || null },
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
        const firebaseCustomToken = await firebaseAdminAuth.createCustomToken(uidForToken);

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

        res.json({
            user: { id: user.id, email: user.email || null, fullName: user.fullName || null, username: (user as User).username || null },
            profile: (user as User).profile || null,
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
        if (!refreshToken) return next(new AppError('No refresh token provided', 401));

        const userId = verifyRefreshToken(refreshToken);
        if (!userId) return next(new AppError('Invalid refresh token', 401));

        const tokenHash = hashRefreshToken(refreshToken);
        const storedToken = await prisma.refreshToken.findFirst({
            where: { tokenHash, userId, revokedAt: null, expiresAt: { gt: new Date() } }
        });

        if (!storedToken) return next(new AppError('Refresh token expired or revoked', 401));

        const newAccessToken = generateAccessToken(userId);
        res.cookie('accessToken', newAccessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE_MS });
        res.cookie('ff_logged_in', 'true', { ...COOKIE_OPTIONS, httpOnly: false, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
        res.json({ success: true, accessToken: newAccessToken });
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

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { profile: true }
        });

        if (!user) return next(new AppError('User not found', 404));

        const profile = await hydrateProfileCompletion(
            user.id as string,
            (user.profile as unknown as Profile) || null
        );

        res.json({
            user: { id: user.id, email: user.email, fullName: user.fullName, username: user.username || null },
            profile
        });
    } catch (error) {
        next(error);
    }
});

export default router;
