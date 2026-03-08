import { Job } from 'bullmq';
import { logger } from '@fresherflow/logger';
import webpush from 'web-push';

interface PushJobData {
    endpoint: string;
    p256dh: string;
    auth: string;
    userId: string;
    title: string;
    body: string;
    url: string;
    kind: string;
    opportunityId: string;
}

function ensureVapidConfigured(): boolean {
    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:support@fresherflow.in';
    if (!publicKey || !privateKey) return false;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
}

export async function processPushJob(job: Job<PushJobData>): Promise<void> {
    const { endpoint, p256dh, auth, userId, title, body, url, kind, opportunityId } = job.data;

    if (!ensureVapidConfigured()) {
        logger.warn('VAPID keys not configured — skipping push notification', { userId });
        return;
    }

    const payload = JSON.stringify({ title, body, url, kind, opportunityId });

    try {
        await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload);
        logger.info('Push notification sent', { userId, kind });
    } catch (error: any) {
        const statusCode = Number(error?.statusCode || error?.status || 0);
        logger.error('Push notification failed', { userId, statusCode, message: error?.message });
        // Re-throw so BullMQ retries (except for stale subscriptions)
        if (statusCode !== 404 && statusCode !== 410) {
            throw error;
        }
        logger.info('Stale push subscription — not retrying', { userId, statusCode });
    }
}
