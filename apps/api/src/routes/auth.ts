import prisma from '../lib/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import bcrypt from 'bcrypt';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashRefreshToken
} from '@fresherflow/auth';
import { validate } from '../middleware/validate';
import { loginSchema, refreshTokenSchema, sendOtpSchema, verifyOtpSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { recordAuthSuccess } from '../services/growthFunnel.service';
import { createRateLimiter } from '../middleware/rateLimit';

// Rate Limiters
const otpSendLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many verification codes sent. Please try again after an hour.',
    keyPrefix: 'rate:otp:send'
});

const authVerifyLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 15,
    message: 'Too many login attempts. Please try again after an hour.',
    keyPrefix: 'rate:auth:verify'
});

const router: Router = express.Router();


function resolveCookieDomain(): string | undefined {
    const explicit = process.env.COOKIE_DOMAIN?.trim();
    if (explicit) return explicit.startsWith('.') ? explicit : `.${explicit}`;

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) return undefined;

    try {
        const hostname = new URL(frontendUrl).hostname.toLowerCase();
        if (hostname === 'localhost' || /^[0-9.]+$/.test(hostname)) return undefined;
        return `.${hostname.replace(/^\./, '')}`;
    } catch {
        return undefined;
    }
}

const COOKIE_DOMAIN = resolveCookieDomain();

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' as 'none' | 'lax' | 'strict',
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
};

/**
 * Shared logic to set auth tokens in cookies
 */
async function setAuthCookies(user: any, res: Response) {
    const accessToken = generateAccessToken(user.id);
    const { token: refreshToken, hash: tokenHash } = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        }
    });

    const accessMaxAge = 24 * 60 * 60 * 1000; // 24 hours (Access Token)
    const refreshMaxAge = 90 * 24 * 60 * 60 * 1000; // 90 days (Long-term session)

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: accessMaxAge });
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: refreshMaxAge });

    // Add a non-httpOnly cookie so frontend knows we have a session
    // (Actual httpOnly cookies are invisible to JS for security)
    res.cookie('ff_logged_in', 'true', {
        ...COOKIE_OPTIONS,
        httpOnly: false,
        maxAge: refreshMaxAge
    });
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
        const { email, code, source } = req.body;
        const { user, isNewUser } = await AuthService.verifyOtp(email, code);

        await setAuthCookies(user, res);
        await recordAuthSuccess(source, isNewUser);

        res.json({
            user: { id: user.id, email: user.email, fullName: user.fullName },
            profile: { completionPercentage: (user as any).profile?.completionPercentage || 0 }
        });
    } catch (error: any) {
        next(new AppError(error.message, 401));
    }
});

// POST /api/auth/google
router.post('/google', authVerifyLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, source } = req.body;
        if (!token) return next(new AppError('Google token is required', 400));

        const { user, isNewUser } = await AuthService.verifyGoogleIdToken(token);

        await setAuthCookies(user, res);
        await recordAuthSuccess(source, isNewUser);

        res.json({
            user: { id: user.id, email: user.email, fullName: user.fullName },
            profile: { completionPercentage: (user as any).profile?.completionPercentage || 0 }
        });
    } catch (error: any) {
        next(new AppError(error.message, 401));
    }
});



// POST /api/auth/login (Legacy/Admin Support)
router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { profile: true }
        });

        if (!user) {
            return next(new AppError('Invalid email or password', 401));
        }

        if (!user.passwordHash) {
            return next(new AppError('Account setup incomplete. Use Google or Email OTP to login.', 401));
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return next(new AppError('Invalid email or password', 401));
        }

        await setAuthCookies(user, res);

        res.json({
            user: { id: user.id, email: user.email, fullName: user.fullName },
            profile: { completionPercentage: user.profile?.completionPercentage || 0 }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return next(new AppError('No refresh token provided', 401));
        }

        const userId = verifyRefreshToken(refreshToken);
        if (!userId) {
            return next(new AppError('Invalid refresh token', 401));
        }

        const tokenHash = hashRefreshToken(refreshToken);
        const storedToken = await prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() }
            }
        });

        if (!storedToken) {
            return next(new AppError('Refresh token expired or revoked', 401));
        }

        const newAccessToken = generateAccessToken(userId);

        const accessMaxAge = 24 * 60 * 60 * 1000; // 24 hours
        res.cookie('accessToken', newAccessToken, {
            ...COOKIE_OPTIONS,
            maxAge: accessMaxAge
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const tokenHash = hashRefreshToken(refreshToken);
            // Revoke in database immediately
            await prisma.refreshToken.updateMany({
                where: { tokenHash },
                data: { revokedAt: new Date() }
            });
        }

        // CRITICAL: Use res.clearCookie with EXACT options used when setting
        // The options MUST match the original cookie options for clearing to work
        res.clearCookie('accessToken', COOKIE_OPTIONS);
        res.clearCookie('refreshToken', COOKIE_OPTIONS);
        res.clearCookie('ff_logged_in', { ...COOKIE_OPTIONS, httpOnly: false });

        // Security headers to prevent browser caching the previous authenticated state
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

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName
            },
            profile: user.profile || null
        });
    } catch (error) {
        next(error);
    }
});

export default router;
