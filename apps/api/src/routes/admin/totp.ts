import prisma from '../../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { requireAdmin } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import logger from '@fresherflow/logger';

// Extend Request type to include adminId (added by requireAdmin middleware)
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            adminId?: string;
        }
    }
}

const router: Router = express.Router();

const APP_NAME = 'FresherFlow Admin';

// Middleware to ensure user is admin for setup/disable
router.use(requireAdmin);

/**
 * Generate a new TOTP secret and QR code for setup
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.adminId) return next(new AppError('Unauthorized', 401));

        const user = await prisma.user.findUnique({ where: { id: req.adminId } });
        if (!user) return next(new AppError('User not found', 404));

        const secret = generateSecret();
        const otpauth = generateURI({
            issuer: APP_NAME,
            label: user.email as string,
            secret
        });

        let imageUrl = '';
        try {
            imageUrl = await QRCode.toDataURL(otpauth);
        } catch (err: unknown) {
            logger.error('QR Code generation failed', err);
            return next(new AppError('Failed to generate QR code', 500));
        }

        // Store secret temporarily but don't enable it yet
        await prisma.user.update({
            where: { id: req.adminId },
            data: { totpSecret: secret, isTwoFactorEnabled: false }
        });

        res.json({ secret, qrCode: imageUrl });
    } catch (error) {
        next(error);
    }
});

/**
 * Verify the TOTP code and enable 2FA
 */
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.body;
        if (!req.adminId) return next(new AppError('Unauthorized', 401));

        const user = await prisma.user.findUnique({ where: { id: req.adminId } });

        if (!user || !user.totpSecret) {
            return next(new AppError('TOTP setup not initiated', 400));
        }

        // Verify returns { valid: boolean, delta: number }
        // We use await because verify is async in v13 default
        const isValidResult = await verify({ token: code, secret: user.totpSecret as string }) as unknown;
        const isValid = typeof isValidResult === 'boolean' ? isValidResult : Boolean((isValidResult as { valid: boolean })?.valid);

        if (!isValid) {
            return next(new AppError('Invalid code', 400));
        }

        await prisma.user.update({
            where: { id: req.adminId },
            data: { isTwoFactorEnabled: true }
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * Disable 2FA
 */
router.post('/disable', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.adminId) return next(new AppError('Unauthorized', 401));

        await prisma.user.update({
            where: { id: req.adminId },
            data: { isTwoFactorEnabled: false, totpSecret: null }
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
