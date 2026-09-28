import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../infrastructure/database/prisma';
import { requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Token register/remove rides on login/logout; cap it like other session
// writes (60/min). Limiter sits before auth.
const deviceTokenLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many device token requests. Please slow down.',
    keyPrefix: 'device-token',
});

const validation = [
    body('token').isString().notEmpty().withMessage('FCM token is required'),
    body('platform').isIn(['ios', 'android']).withMessage('Platform must be ios or android'),
];

/**
 * POST /api/device-token
 * Registers or updates a device's FCM push token for the authenticated user.
 * Called after login and whenever the FCM token refreshes.
 */
router.post('/', deviceTokenLimiter, requireAuth, validation, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ error: errors.array()[0]?.msg });
            return;
        }

        const { token, platform } = req.body as {
            token: string;
            platform: 'ios' | 'android';
        };

        // Upsert by token — same device refreshing its token updates the record.
        // If same user registers a new device, a new row is created.
        await prisma.deviceToken.upsert({
            where: { token },
            update: {
                userId: req.userId!,
                platform,
            },
            create: {
                userId: req.userId!,
                token,
                platform,
            },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/device-token
 * Removes a device token on logout so the device stops receiving pushes.
 */
router.delete('/', deviceTokenLimiter, requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.body as { token: string };
        if (!token) {
            res.status(400).json({ error: 'Token is required' });
            return;
        }

        await prisma.deviceToken.deleteMany({
            where: { token, userId: req.userId! },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
