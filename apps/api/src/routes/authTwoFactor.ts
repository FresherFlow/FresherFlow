import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRateLimiter } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';
import { logger } from '@fresherflow/utils';

const router: Router = express.Router();

const APP_NAME = 'FresherFlow';

// TOTP exchange endpoints present a short-lived numeric secret. Bound them
// like the other credential-exchange auth routes.
const totpSetupLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many two-factor setup attempts. Please try again later.',
    keyPrefix: 'rate:auth:2fa:setup'
});

const totpVerifyLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many two-factor verification attempts. Please try again later.',
    keyPrefix: 'rate:auth:2fa:verify'
});

const codeSchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit code'),
});

// Every route here is a verified-user route: requireAuth already rejects
// missing/invalid tokens (401) and suspended/banned accounts (403). Guests
// (anonymous sessions) must never enroll a second factor on a throwaway
// identity, so they are rejected explicitly.
function rejectAnonymous(req: Request): AppError | null {
    if (req.isAnonymous) {
        return new AppError('Verified account required', 401);
    }
    return null;
}

async function isValidTotpToken(token: string, secret: string): Promise<boolean> {
    // otplib v13 verify is async and resolves to boolean or { valid: boolean }.
    const result = (await verify({ token, secret: secret as string })) as unknown;
    return typeof result === 'boolean' ? result : Boolean((result as { valid: boolean })?.valid);
}

/**
 * POST /api/auth/2fa/setup
 * Generates a fresh TOTP secret + QR code. Stored immediately but NOT enabled
 * until the caller proves possession via POST /verify. The secret is returned
 * exactly once; it is never logged.
 */
router.post(
    '/setup',
    totpSetupLimiter,
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const anon = rejectAnonymous(req);
            if (anon) return next(anon);

            const user = await prisma.user.findUnique({
                where: { id: req.userId as string },
                select: { id: true, email: true, username: true },
            });
            if (!user) return next(new AppError('User not found', 404));

            const secret = generateSecret();
            const otpauth = generateURI({
                issuer: APP_NAME,
                label: user.email ?? user.username ?? user.id,
                secret,
            });

            let qrCode = '';
            try {
                qrCode = await QRCode.toDataURL(otpauth);
            } catch (err: unknown) {
                logger.error('QR Code generation failed', err);
                return next(new AppError('Failed to generate QR code', 500));
            }

            await prisma.user.update({
                where: { id: req.userId as string },
                data: { totpSecret: secret, isTwoFactorEnabled: false },
            });

            res.json({ secret, otpauthUrl: otpauth, qrCode });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/auth/2fa/verify
 * Proves possession of the pending secret and enables 2FA.
 */
router.post(
    '/verify',
    totpVerifyLimiter,
    requireAuth,
    validate(codeSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const anon = rejectAnonymous(req);
            if (anon) return next(anon);

            const { code } = req.body as { code: string };

            const user = await prisma.user.findUnique({
                where: { id: req.userId as string },
                select: { id: true, totpSecret: true },
            });
            if (!user || !user.totpSecret) {
                return next(new AppError('Two-factor setup not initiated', 400));
            }

            if (!(await isValidTotpToken(code, user.totpSecret as string))) {
                return next(new AppError('Invalid authenticator code', 400));
            }

            await prisma.user.update({
                where: { id: req.userId as string },
                data: { isTwoFactorEnabled: true },
            });

            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/auth/2fa/status
 * Whether the caller has 2FA enabled. Never returns the secret.
 */
router.get('/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const anon = rejectAnonymous(req);
        if (anon) return next(anon);

        const user = await prisma.user.findUnique({
            where: { id: req.userId as string },
            select: { isTwoFactorEnabled: true },
        });
        if (!user) return next(new AppError('User not found', 404));

        res.setHeader('Cache-Control', 'private, no-store');
        res.json({ enabled: user.isTwoFactorEnabled ?? false });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/2fa/disable
 * Disables 2FA and wipes the secret. Requires a current code so a bare
 * session (e.g. a CSRF-forged POST) cannot silently strip the second factor.
 */
router.post(
    '/disable',
    totpVerifyLimiter,
    requireAuth,
    validate(codeSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const anon = rejectAnonymous(req);
            if (anon) return next(anon);

            const { code } = req.body as { code: string };

            const user = await prisma.user.findUnique({
                where: { id: req.userId as string },
                select: { id: true, totpSecret: true, isTwoFactorEnabled: true },
            });
            if (!user) return next(new AppError('User not found', 404));
            if (!user.isTwoFactorEnabled || !user.totpSecret) {
                return next(new AppError('Two-factor is not enabled', 400));
            }

            if (!(await isValidTotpToken(code, user.totpSecret as string))) {
                return next(new AppError('Invalid authenticator code', 400));
            }

            await prisma.user.update({
                where: { id: req.userId as string },
                data: { isTwoFactorEnabled: false, totpSecret: null },
            });

            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
