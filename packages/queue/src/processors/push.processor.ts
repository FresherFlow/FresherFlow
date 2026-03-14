import { Job } from 'bullmq';
import { logger } from '@fresherflow/logger';
import webpush from 'web-push';
import axios from 'axios';
import type { PushJobData } from '../index';

type PushError = { statusCode?: number; status?: number; message?: string };

function ensureVapidConfigured(): boolean {
    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:support@fresherflow.in';
    if (!publicKey || !privateKey) return false;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
}

async function sendExpoPush(data: PushJobData) {
    const { endpoint, title, body, url, opportunityId } = data;
    try {
        await axios.post('https://exp.host/--/api/v2/push/send', {
            to: endpoint,
            title,
            body,
            data: { url, opportunityId },
            sound: 'default',
        });
        logger.info('Expo push notification sent', { userId: data.userId });
    } catch (err: unknown) {
        const error = err as { response?: { data?: unknown }; message?: string };
        logger.error('Expo push notification failed', {
            userId: data.userId,
            error: error.response?.data || error.message
        });
        // We don't throw here to avoid infinite BullMQ retries for invalid tokens
    }
}

export async function processPushJob(job: Job<PushJobData>): Promise<void> {
    const { endpoint, p256dh, auth, userId, title, body, url, kind, opportunityId, platform } = job.data;

    if (platform === 'expo') {
        return sendExpoPush(job.data);
    }

    if (!ensureVapidConfigured()) {
        logger.warn('VAPID keys not configured — skipping push notification', { userId });
        return;
    }

    const payload = JSON.stringify({ title, body, url, kind, opportunityId });

    try {
        await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload);
        logger.info('Web push notification sent', { userId, kind });
    } catch (err: unknown) {
        const error = err as PushError;
        const statusCode = Number(error?.statusCode || error?.status || 0);
        logger.error('Web push notification failed', { userId, statusCode, message: error?.message });
        // Do not retry stale subscriptions (410 Gone, 404 Not Found)
        if (statusCode !== 404 && statusCode !== 410) {
            throw err;
        }
        logger.info('Stale web push subscription — not retrying', { userId, statusCode });
    }
}
