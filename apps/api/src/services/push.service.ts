import webpush from 'web-push';
import prisma from '../lib/prisma';
import logger from '../utils/logger';

export type NewJobPushPayload = {
    title: string;
    company: string;
    opportunityId: string;
    opportunitySlug: string;
};

type PushSendResult = {
    status: 'sent' | 'skipped' | 'invalid_subscription' | 'failed';
    reason?: string;
};

let vapidConfigured = false;

function ensureVapidConfigured() {
    if (vapidConfigured) return true;

    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:support@fresherflow.in';

    if (!publicKey || !privateKey) {
        return false;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
}

function getFrontendOrigin() {
    const configuredOrigin =
        process.env.SOCIAL_FRONTEND_URL
        || process.env.PUBLIC_FRONTEND_URL
        || process.env.FRONTEND_URL
        || 'https://fresherflow.in';
    return /localhost|127\.0\.0\.1/i.test(configuredOrigin)
        ? 'https://fresherflow.in'
        : configuredOrigin;
}

function buildOpportunityUrl(opportunitySlug: string) {
    const url = new URL(`/opportunities/${opportunitySlug}`, getFrontendOrigin());
    url.searchParams.set('source', 'push_notification');
    url.searchParams.set('ref', 'push');
    return url.toString();
}

function isInvalidSubscriptionStatus(statusCode?: number) {
    return statusCode === 404 || statusCode === 410;
}

export async function sendNewJobPush(userId: string, payload: NewJobPushPayload): Promise<PushSendResult> {
    if (!ensureVapidConfigured()) {
        return { status: 'skipped', reason: 'missing_vapid_keys' };
    }

    const subscription = await prisma.pushSubscription.findUnique({
        where: { userId },
    });

    if (!subscription) {
        return { status: 'skipped', reason: 'subscription_missing' };
    }

    const notificationPayload = JSON.stringify({
        title: `New job: ${payload.title}`,
        body: `${payload.company} posted a new opening for freshers.`,
        url: buildOpportunityUrl(payload.opportunitySlug),
        kind: 'NEW_JOB',
        opportunityId: payload.opportunityId,
    });

    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                },
            },
            notificationPayload
        );
        return { status: 'sent' };
    } catch (error: any) {
        const statusCode = Number(error?.statusCode || error?.status || 0) || undefined;
        const message = error?.body || error?.message || 'Unknown web push error';

        if (isInvalidSubscriptionStatus(statusCode)) {
            await prisma.pushSubscription.deleteMany({ where: { userId } });
            logger.info('Deleted stale push subscription', { userId, statusCode });
            return { status: 'invalid_subscription', reason: `status_${statusCode}` };
        }

        logger.error('Web push delivery failed', { userId, statusCode, message });
        return { status: 'failed', reason: String(message) };
    }
}

