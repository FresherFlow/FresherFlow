import { OpportunityStatus, PrismaClient } from '@prisma/client';
import { filterOpportunitiesForUser, rankOpportunitiesForUser } from '../domain/eligibility';
import logger from '../utils/logger';
import { EmailService } from './email.service';

const prisma = new PrismaClient();

/**
 * Notification Service for Instant Job Alerts
 * Triggers when admin publishes new opportunity
 */

interface NewJobNotificationResult {
    usersSent: number;
    emailsSent: number;
    appAlertsSent: number;
}

const MAX_NEW_JOB_ALERTS_PER_USER_PER_DAY = Number(process.env.MAX_NEW_JOB_ALERTS_PER_USER_PER_DAY || 8);

export async function sendNewJobAlerts(opportunityId: string): Promise<NewJobNotificationResult> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Get the opportunity with details
    const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: { walkInDetails: true }
    });

    if (!opportunity || opportunity.status !== OpportunityStatus.PUBLISHED) {
        logger.info('Skipping alerts for non-published opportunity', { opportunityId });
        return { usersSent: 0, emailsSent: 0, appAlertsSent: 0 };
    }

    // Get all candidate users. Preferences are optional (defaults apply when missing).
    const users = await prisma.user.findMany({
        where: {
            role: 'USER',
        },
        select: {
            id: true,
            email: true,
            fullName: true,
            profile: true,
            alertPreference: true,
        },
    });

    let emailsSent = 0;
    let appAlertsSent = 0;
    const usersSent = new Set<string>();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const sentTodayRows = await prisma.alertDelivery.groupBy({
        by: ['userId'],
        where: {
            kind: 'NEW_JOB',
            channel: 'APP',
            sentAt: { gte: dayStart },
        },
        _count: {
            _all: true,
        },
    });
    const sentTodayByUser = new Map<string, number>(
        sentTodayRows.map((row) => [row.userId, row._count._all])
    );

    for (const user of users) {
        const preference = user.alertPreference ?? {
            enabled: true,
            emailEnabled: false,
            minRelevanceScore: 45,
        };
        if (!preference.enabled) continue;
        const alreadySentToday = sentTodayByUser.get(user.id) || 0;
        if (alreadySentToday >= MAX_NEW_JOB_ALERTS_PER_USER_PER_DAY) continue;

        let relevanceScore: number | null = null;
        let relevanceReason = 'General alert';

        if (user.profile) {
            // Keep personalized alerts strict for users with profile data.
            const eligible = filterOpportunitiesForUser([opportunity as any], user.profile as any);
            if (eligible.length === 0) continue;

            const ranked = rankOpportunitiesForUser(eligible as any, user.profile as any);
            if (ranked.length === 0) continue;

            relevanceScore = ranked[0].score;
            if (relevanceScore < preference.minRelevanceScore) continue;
            relevanceReason = 'Profile match';
        } else {
            // New users should still see "new job" alerts even before profile completion.
            relevanceReason = 'Complete profile to get personalized matching';
        }

        // Create dedupe key
        const dedupeKeyBase = `${user.id}:NEW_JOB:${opportunityId}`;
        const existing = await prisma.alertDelivery.findFirst({
            where: {
                OR: [
                    { dedupeKey: `${dedupeKeyBase}:APP` },
                    { dedupeKey: `${dedupeKeyBase}:EMAIL` },
                ],
            },
            select: { id: true },
        });
        if (existing) continue;

        const deliveriesToCreate: Array<{
            userId: string;
            opportunityId: string;
            kind: 'NEW_JOB';
            channel: 'APP' | 'EMAIL';
            dedupeKey: string;
            metadata: string;
        }> = [
            {
                userId: user.id,
                opportunityId: opportunity.id,
                kind: 'NEW_JOB',
                channel: 'APP',
                dedupeKey: `${dedupeKeyBase}:APP`,
                metadata: JSON.stringify({ relevanceScore, relevanceReason }),
            },
        ];

        // Send email if enabled
        if (preference.emailEnabled) {
            try {
                await EmailService.sendNewJobAlert(user.email, user.fullName, {
                    title: opportunity.title,
                    company: opportunity.company,
                    location: opportunity.locations?.[0] || null,
                    applyUrl: `${frontendUrl.replace(/\/$/, '')}/opportunities/${opportunity.slug}`,
                });
                emailsSent++;
                deliveriesToCreate.push({
                    userId: user.id,
                    opportunityId: opportunity.id,
                    kind: 'NEW_JOB',
                    channel: 'EMAIL',
                    dedupeKey: `${dedupeKeyBase}:EMAIL`,
                    metadata: JSON.stringify({ relevanceScore, relevanceReason }),
                });
            } catch (err) {
                logger.error('Failed to send new job email', { userId: user.id, opportunityId, error: err });
            }
        }

        // Create alert delivery records
        await prisma.alertDelivery.createMany({
            data: deliveriesToCreate,
            skipDuplicates: true,
        });

        appAlertsSent++;
        usersSent.add(user.id);
        sentTodayByUser.set(user.id, alreadySentToday + 1);
    }

    logger.info('New job alerts sent', {
        opportunityId,
        usersSent: usersSent.size,
        emailsSent,
        appAlertsSent
    });

    return {
        usersSent: usersSent.size,
        emailsSent,
        appAlertsSent
    };
}
