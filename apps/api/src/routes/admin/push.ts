import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/auth';
import prisma from '../../infrastructure/database/prisma';
import { logger } from '@fresherflow/logger';
import admin from '../../lib/firebase';

const router = Router();

router.use(requireAdmin);

// GET /api/admin/push/devices — count of registered FCM tokens
router.get('/devices', async (_req: Request, res: Response): Promise<void> => {
    try {
        const count = await prisma.deviceToken.count();
        res.json({ count });
    } catch (error) {
        logger.error('[Push] Failed to count devices', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const handleBroadcast = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, body, message, url } = req.body as {
            title?: string;
            body?: string;
            message?: string;
            url?: string;
        };

        const notificationBody = body || message;
        if (!title || !notificationBody) {
            res.status(400).json({ error: 'Title and body/message are required' });
            return;
        }

        // Fetch all registered FCM device tokens
        const tokens = await prisma.deviceToken.findMany({
            select: { token: true },
        });

        if (tokens.length === 0) {
            res.json({ success: true, sent: 0, message: 'No devices registered' });
            return;
        }

        const tokenList = tokens.map((t) => t.token);
        logger.info(`[Push] Broadcasting to ${tokenList.length} device(s)`);

        const messaging = admin.messaging();

        const result = await messaging.sendEachForMulticast({
            tokens: tokenList,
            notification: {
                title,
                body: notificationBody,
            },
            data: {
                url: url ?? 'fflow://',
                kind: 'BROADCAST',
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'jobs',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        });

        const failed = result.responses.filter((r) => !r.success);
        if (failed.length > 0) {
            logger.warn(`[Push] ${failed.length} notifications failed`);

            // Clean up invalid/expired tokens
            const invalidErrors = new Set([
                'messaging/invalid-registration-token',
                'messaging/registration-token-not-registered',
            ]);

            const staleTokens: string[] = [];
            result.responses.forEach((r, i) => {
                if (!r.success && r.error && invalidErrors.has(r.error.code)) {
                    staleTokens.push(tokenList[i]!);
                }
            });

            if (staleTokens.length > 0) {
                await prisma.deviceToken.deleteMany({
                    where: { token: { in: staleTokens } },
                });
                logger.info(`[Push] Removed ${staleTokens.length} stale token(s)`);
            }
        }

        res.json({
            success: true,
            sent: result.successCount,
            failed: result.failureCount,
        });
    } catch (error) {
        logger.error('[Push] Broadcast failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

router.post('/', handleBroadcast);
router.post('/broadcast', handleBroadcast);

export default router;
