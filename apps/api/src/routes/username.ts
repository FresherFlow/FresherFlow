import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../infrastructure/database/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { claimUsernameSchema } from '@fresherflow/schemas';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @route   GET /api/username/check
 * @desc    Check if a username is available
 * @access  Public
 */
router.get('/check', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const username = String(req.query.u || '').toLowerCase();
        
        if (!username || username.length < 3) {
            return res.json({ available: false, reason: 'Username too short' });
        }

        if (!/^[a-z0-9_]+$/.test(username)) {
            return res.json({ available: false, reason: 'Invalid characters' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { username },
            select: { id: true }
        });

        if (existingUser) {
            return res.json({ available: false, reason: 'Username already taken' });
        }

        res.json({ available: true });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/username/claim
 * @desc    Claim or update a username
 * @access  Authenticated
 */
router.post('/claim', requireAuth, validate(claimUsernameSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.body;
        const userId = req.userId as string;

        // Check uniqueness first (fail fast)
        const existing = await prisma.user.findUnique({
            where: { username },
            select: { id: true }
        });

        if (existing && existing.id !== userId) {
            throw new AppError('Username is already taken', 409);
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Atomic update with cooldown check
        const result = await prisma.user.updateMany({
            where: {
                id: userId,
                OR: [
                    { usernameUpdatedAt: null },
                    { usernameUpdatedAt: { lt: thirtyDaysAgo } }
                ]
            },
            data: {
                username,
                usernameUpdatedAt: new Date()
            }
        });

        if (result.count === 0) {
            // Check why it failed
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { usernameUpdatedAt: true }
            });

            if (user?.usernameUpdatedAt && user.usernameUpdatedAt >= thirtyDaysAgo) {
                throw new AppError('You can only change your username once every 30 days', 429);
            }
            
            throw new AppError('Failed to update username', 500);
        }

        res.json({ success: true, message: 'Username claimed successfully', username });
    } catch (error) {
        // Handle unique constraint violation if race condition occurs between findUnique and updateMany
        // @ts-expect-error - Prisma error code check
        if (error?.code === 'P2002') {
            return next(new AppError('Username is already taken', 409));
        }
        next(error);
    }
});

export default router;
