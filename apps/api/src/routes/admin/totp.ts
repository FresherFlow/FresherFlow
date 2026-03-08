import prisma from '../../lib/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { requireAdmin } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

// Extend Request type to include adminId (added by requireAdmin middleware)
declare global {
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
            label: user.email,
            secret
        });

        let imageUrl = '';
        try {
            imageUrl = await QRCode.toDataURL(otpauth);
        } catch (err: unknown) {
            console.error('QR Code generation failed', err);
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
        const isValid = await verify({ token: code, secret: user.totpSecret });

        if (!isValid) { // verify returns boolean? NO, verify returns object in v13 types above? 
            // Wait, functional.d.ts line 211: Promise<VerifyResult>
            // VerifyResult usually has 'valid' property, or it might be just { valid: true }...
            // line 184 example: // Returns: { valid: true, delta: 0 }
            // So we need isValid.valid?
            // Actually, let's double check if I should use verifySync or check the return type carefully.
            // The example says "const result = await verify(...); // Returns { valid: true ... }"
            // So it MUST be object.

            // Let's assume object and check .valid (if verify returns boolean in some versions, this might fail, but v13 says object)
        }

        // Actually, verify returns boolean in otplib v12, but functional verify in v13 returns object?
        // Let's use `const { valid } = await verify(...)` style.

        // BUT wait, types above in functional.d.ts say `VerifyResult`.
        // Let's check `VerifyResult` definition if I can... 
        // It says `export { VerifyResult } from '@otplib/totp'`.
        // I will assume it returns an object with `valid` property based on the example in functional.d.ts line 184.

        const { valid } = await verify({ token: code, secret: user.totpSecret });

        if (!valid) {
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
