import { Router, Request, Response } from 'express';
import { enqueuePushNotification } from '@fresherflow/queue';
import prisma from '../../infrastructure/database/prisma';
import { logger } from '@fresherflow/logger';

const router = Router();

router.post('/broadcast', async (req: Request, res: Response) => {
    try {
        const { title, body } = req.body;
        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }

        // Fetch all Expo push subscriptions
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { p256dh: 'EXPO' },
        });

        logger.info(`Broadcasting push notification to ${subscriptions.length} users`);

        for (const sub of subscriptions) {
            await enqueuePushNotification({
                endpoint: sub.endpoint as string,
                p256dh: sub.p256dh as string,
                auth: sub.auth as string,
                userId: sub.userId,
                title,
                body,
                url: 'fflow://', // default open app link
                kind: 'NEW_JOB', // Use a generic or supported kind
                opportunityId: 'broadcast',
                platform: 'expo',
            });
        }

        return res.json({ success: true, enqueued: subscriptions.length });
    } catch (error) {
        logger.error('Failed to broadcast push', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
