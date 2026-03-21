import prisma from '../../infrastructure/database/prisma';
import { logger } from '@fresherflow/logger';
import { enqueuePushNotification } from '@fresherflow/queue';

export type NewJobPushPayload = {
    title: string;
    company: string;
    opportunityId: string;
    opportunitySlug: string;
};

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

/**
 * Enqueues a push notification job to the worker.
 * The subscription lookup stays here; the actual sendNotification I/O runs in the worker.
 */
export async function sendNewJobPush(userId: string, payload: NewJobPushPayload): Promise<void> {
    const subscription = await prisma.pushSubscription.findUnique({ where: { userId } });

    if (!subscription) {
        logger.debug('No push subscription found for user', { userId });
        return;
    }

    const isExpo = subscription.p256dh === 'EXPO';

    await enqueuePushNotification({
        endpoint: subscription.endpoint as string,
        p256dh: subscription.p256dh as string,
        auth: subscription.auth as string,
        userId,
        title: `New job: ${payload.title}`,
        body: `${payload.company} posted a new opening for freshers.`,
        url: buildOpportunityUrl(payload.opportunitySlug),
        kind: 'NEW_JOB',
        opportunityId: payload.opportunityId,
        platform: isExpo ? 'expo' : 'web',
    });

    logger.debug('Push notification queued', { userId });
}
