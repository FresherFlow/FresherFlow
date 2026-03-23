import prisma from '../infrastructure/database/prisma';
import { User } from '@fresherflow/types';
import express, { Router, Request, Response, NextFunction } from 'express';

import bcrypt from 'bcrypt';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashRefreshToken
} from '@fresherflow/auth';
import { validate } from '../middleware/validate';
import { loginSchema, sendOtpSchema, verifyOtpSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { AuthService } from '../infrastructure/services/auth.service';
import { EmailService } from '../infrastructure/services/email.service';
import { recordAuthSuccess } from '../infrastructure/services/growthFunnel.service';
import { createRateLimiter } from '../middleware/rateLimit';
import { getCookieDomain } from '../utils/runtimeConfig';

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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' as 'none' | 'lax' | 'strict',
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
};

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

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
}

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
        const { email, code, source, ref } = req.body;
        const { user, isNewUser } = await AuthService.verifyOtp(email, code, ref);

        await setAuthCookies(user as User, res);
        await recordAuthSuccess(source, isNewUser);

        res.json({
            user: { id: user.id, email: user.email, fullName: user.fullName },
            profile: (user as User).profile || null
        });
    } catch (error) {
        next(toAuthRouteError(error, 'Authentication failed'));
    }
});

// POST /api/auth/google
router.post('/google', authVerifyLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, source, ref } = req.body;
        if (!token) return next(new AppError('Google token is required', 400));

        const { user, isNewUser } = await AuthService.verifyGoogleIdToken(token, ref);

        await setAuthCookies(user as User, res);
        await recordAuthSuccess(source, isNewUser);

        res.json({
            user: { id: user.id, email: user.email, fullName: user.fullName },
            profile: (user as User).profile || null
        });
    } catch (error) {
        next(toAuthRouteError(error, 'Google authentication failed'));
    }
});

// POST /api/auth/login (Legacy/Admin Support)
router.post('/login', authVerifyLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { profile: true }
        });

        if (!user) return next(new AppError('Invalid email or password', 401));
        if (!user.passwordHash) return next(new AppError('Account setup incomplete. Use Google or Email OTP to login.', 401));

        const passwordHash = user.passwordHash as string;
        const isValid = await bcrypt.compare(password, passwordHash);
        if (!isValid) return next(new AppError('Invalid email or password', 401));

        await setAuthCookies(user as unknown as User, res);

        res.json({
            user: { id: user.id, email: user.email, fullName: user.fullName },
            profile: user.profile || null
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken;
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
        res.json({ success: true });
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

        res.clearCookie('accessToken', COOKIE_OPTIONS);
        res.clearCookie('refreshToken', COOKIE_OPTIONS);
        res.clearCookie('ff_logged_in', { ...COOKIE_OPTIONS, httpOnly: false });

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

        res.json({
            user: { id: user.id, email: user.email, fullName: user.fullName },
            profile: user.profile || null
        });
    } catch (error) {
        next(error);
    }
});

export default router;
