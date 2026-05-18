import { QueueEvents } from 'bullmq';
import { getQueueConnection, QUEUE_NAMES, enqueuePushNotification } from '@fresherflow/queue';
import prisma from '../../infrastructure/database/prisma';
import { logger } from '@fresherflow/logger';
import { env } from '@fresherflow/config';

export const pushNotificationService = {
    /**
     * Broadcasts a push notification to all administrator devices.
     */
    async sendToAdmins(payload: { title: string; body: string; data?: Record<string, string> }): Promise<void> {
        try {
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true },
            });

            for (const admin of admins) {
                const subscription = await prisma.pushSubscription.findUnique({
                    where: { userId: admin.id },
                });

                if (!subscription) continue;

                const isExpo = subscription.p256dh === 'EXPO';

                await enqueuePushNotification({
                    endpoint: subscription.endpoint as string,
                    p256dh: subscription.p256dh as string,
                    auth: subscription.auth as string,
                    userId: admin.id,
                    title: payload.title,
                    body: payload.body,
                    url: payload.data?.screen ? `/admin/${payload.data.screen.toLowerCase()}` : '/admin/submissions',
                    kind: 'ADMIN_ALERT',
                    opportunityId: '',
                    platform: isExpo ? 'expo' : 'web',
                });
            }
            logger.info('Broadcasted push notification to all admins', { title: payload.title });
        } catch (error) {
            logger.error('Failed to send admin push notification', { error });
        }
    }
};

// In-memory reference to QueueEvents listener to prevent garbage collection
let parsingQueueEvents: QueueEvents | null = null;

/**
 * Initializes BullMQ event listeners on consolidated internal queue.
 * Dispatch instant FCM push notifications to admins on ingestion success/failure.
 */
export function initializeQueueListeners(): void {
    if (process.env.NODE_ENV === 'test') {
        logger.info('Skipping BullMQ event listener initialization in test environment');
        return;
    }

    if (env.REDIS_ENABLED === false) {
        logger.info('Skipping BullMQ event listener initialization since Redis is disabled');
        return;
    }

    if (!env.ENABLE_PUSH_NOTIFICATIONS) {
        logger.info('Skipping BullMQ event listener initialization since push notifications are disabled');
        return;
    }

    try {
        const connection = getQueueConnection();
        parsingQueueEvents = new QueueEvents(QUEUE_NAMES.internal, { connection });

        parsingQueueEvents.on('completed', async ({ jobId }) => {
            logger.info(`Ingestion job #${jobId} completed successfully`);
            await pushNotificationService.sendToAdmins({
                title: "New Submission Ingested",
                body: `Submission #${jobId} parsed successfully. Ready for approval.`,
                data: { screen: "Submissions" },
            });
        });

        parsingQueueEvents.on('failed', async ({ jobId, failedReason }) => {
            logger.warn(`Ingestion job #${jobId} failed: ${failedReason || 'Unknown error'}`);
            await pushNotificationService.sendToAdmins({
                title: "Submission Ingest.Failed",
                body: `Submission #${jobId} failed: ${failedReason || 'Unknown error'}.`,
                data: { screen: "Submissions" },
            });
        });

        logger.info('Initialized BullMQ event listeners for ingestion push alerts');
    } catch (error) {
        logger.error('Failed to initialize BullMQ event listeners', { error });
    }
}
