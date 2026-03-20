import prisma from '../../infrastructure/database/prisma';
import { AlertKind } from '@fresherflow/database';
import { OpportunityStatus, Opportunity, Profile } from '@fresherflow/types';
import { 
    filterAndRankOpportunitiesForUser, 
    getDispatchDateBucket, buildFrontendUrl 
} from '@fresherflow/domain';
import { EmailService } from '../../infrastructure/services/email.service';
import { sendNewJobPush } from '../../infrastructure/services/push.service';

const MAX_NEW_JOB_ALERTS_PER_USER_PER_DAY = Number(process.env.MAX_NEW_JOB_ALERTS_PER_USER_PER_DAY || 8);

type AlertPreference = {
    enabled: boolean;
    emailEnabled: boolean;
    minRelevanceScore: number;
};

/**
 * Orchestrate New Job alerts broadcast across all enabled channels.
 */
export async function sendNewJobAlerts(opportunityId: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const alertKind = AlertKind.NEW_JOB;

    const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId }, include: { walkInDetails: true }
    });
    if (!opportunity || opportunity.status !== OpportunityStatus.PUBLISHED) {
        return { usersSent: 0, emailsSent: 0, appAlertsSent: 0, pushSentCount: 0 };
    }

    const users = await prisma.user.findMany({
        where: { role: { in: ['USER', 'ADMIN'] } },
        select: { id: true, email: true, fullName: true, profile: true, alertPreference: true },
    });

    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const sentTodayRows = await prisma.alertDelivery.groupBy({
        by: ['userId'], where: { kind: alertKind, channel: 'APP', sentAt: { gte: dayStart } },
        _count: { _all: true }
    });
    const sentTodayByUser = new Map<string, number>(sentTodayRows.map((row) => [row.userId, row._count._all]));

    let emailsSent = 0, appAlertsSent = 0, pushSentCount = 0;
    const usersSentCount = new Set<string>();

    for (const user of users) {
        const userAttemptedAt = new Date();
        const preference = (user.alertPreference as AlertPreference | null) ?? { enabled: true, emailEnabled: false, minRelevanceScore: 35 };

        if (!preference.enabled || (sentTodayByUser.get(user.id) || 0) >= MAX_NEW_JOB_ALERTS_PER_USER_PER_DAY || !user.profile) {
            continue;
        }

        const ranked = filterAndRankOpportunitiesForUser([opportunity as unknown as Opportunity], user.profile as unknown as Profile, user.id);
        if (ranked.length === 0 || ranked[0].score < preference.minRelevanceScore) continue;

        const relevanceScore = ranked[0].score;
        const dedupeDateBucket = getDispatchDateBucket(userAttemptedAt);
        const dedupeKeyBase = `${user.id}:NEW_JOB:${opportunityId}:${dedupeDateBucket}`;

        const deliveriesToCreate: Array<{
            userId: string;
            opportunityId: string;
            kind: AlertKind;
            channel: 'APP' | 'EMAIL';
            dedupeKey: string;
            metadata: string;
        }> = [{
            userId: user.id, opportunityId: opportunity.id, kind: alertKind, channel: 'APP',
            dedupeKey: `${dedupeKeyBase}:APP`, metadata: JSON.stringify({ relevanceScore })
        }];

        if (preference.emailEnabled) {
            try {
                await EmailService.sendNewJobAlert(user.email, user.fullName, {
                    title: opportunity.title, company: opportunity.company, location: opportunity.locations?.[0] || null,
                    applyUrl: buildFrontendUrl(frontendUrl, `/opportunities/${opportunity.slug}`)
                });
                emailsSent++;
                deliveriesToCreate.push({ userId: user.id, opportunityId: opportunity.id, kind: alertKind, channel: 'EMAIL', dedupeKey: `${dedupeKeyBase}:EMAIL`, metadata: JSON.stringify({ relevanceScore }) });
            } catch {
                // Best-effort email delivery; app alert still continues.
            }
        }

        await prisma.alertDelivery.createMany({ data: deliveriesToCreate, skipDuplicates: true });
        
        try {
            await sendNewJobPush(user.id, { title: opportunity.title, company: opportunity.company, opportunityId: opportunity.id, opportunitySlug: opportunity.slug });
            pushSentCount++;
            await prisma.alertDelivery.create({ data: { userId: user.id, opportunityId: opportunity.id, kind: alertKind, channel: 'PUSH', dedupeKey: `${dedupeKeyBase}:PUSH`, metadata: JSON.stringify({ relevanceScore }) } }).catch(() => undefined);
        } catch {
            // Best-effort push delivery.
        }

        appAlertsSent++;
        usersSentCount.add(user.id);
    }

    return { usersSent: usersSentCount.size, emailsSent, appAlertsSent, pushSentCount };
}
