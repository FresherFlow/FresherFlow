import prisma from '../lib/prisma';
import { OpportunityStatus } from '@prisma/client';
import { filterOpportunitiesForUser, rankOpportunitiesForUser } from '../domain/eligibility';
import logger from '../utils/logger';
import { EmailService } from './email.service';
import { sendNewJobPush } from './push.service';



/**
 * Notification Service for Instant Job Alerts
 * Triggers when admin publishes new opportunity
 */

interface NewJobNotificationResult {
    usersSent: number;
    emailsSent: number;
    appAlertsSent: number;
    pushSent: number;
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
        return { usersSent: 0, emailsSent: 0, appAlertsSent: 0, pushSent: 0 };
    }

    // Get all candidate users. Preferences are optional (defaults apply when missing).
    const users = await prisma.user.findMany({
        where: {
            role: { in: ['USER', 'ADMIN'] },
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
    let skippedDisabled = 0;
    let skippedDailyCap = 0;
    let skippedNotEligible = 0;
    let lowScoreFallbackSent = 0;
    let pushSent = 0;
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
            minRelevanceScore: 35,
        };
        if (!preference.enabled) {
            skippedDisabled += 1;
            continue;
        }
        const alreadySentToday = sentTodayByUser.get(user.id) || 0;
        if (alreadySentToday >= MAX_NEW_JOB_ALERTS_PER_USER_PER_DAY) {
            skippedDailyCap += 1;
            continue;
        }

        let relevanceScore: number | null = null;
        let relevanceReason = 'General alert';

        if (user.profile) {
            // Keep personalized alerts strict for users with profile data.
            const eligible = filterOpportunitiesForUser([opportunity as any], user.profile as any);
            if (eligible.length === 0) continue;

            const ranked = rankOpportunitiesForUser(eligible as any, user.profile as any);
            if (ranked.length === 0) continue;

            relevanceScore = ranked[0].score;
            if (relevanceScore < preference.minRelevanceScore) {
                // If a user is eligible but ranking is slightly low, still send one "low confidence"
                // app alert per day to avoid an empty notification inbox.
                if (alreadySentToday > 0) {
                    skippedNotEligible += 1;
                    continue;
                }
                relevanceReason = 'Eligible match (low confidence)';
                lowScoreFallbackSent += 1;
            } else {
                relevanceReason = 'Profile match';
            }
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
                    { dedupeKey: `${dedupeKeyBase}:PUSH` },
                ],
            },
            select: { id: true },
        });
        if (existing) continue;

        const deliveriesToCreate: Array<{
            userId: string;
            opportunityId: string;
            kind: 'NEW_JOB';
            channel: 'APP' | 'EMAIL' | 'PUSH';
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

        const pushResult = await sendNewJobPush(user.id, {
            title: opportunity.title,
            company: opportunity.company,
            opportunityId: opportunity.id,
            opportunitySlug: opportunity.slug,
        });
        if (pushResult.status === 'sent') {
            pushSent += 1;
            await prisma.alertDelivery.create({
                data: {
                    userId: user.id,
                    opportunityId: opportunity.id,
                    kind: 'NEW_JOB',
                    channel: 'PUSH',
                    dedupeKey: `${dedupeKeyBase}:PUSH`,
                    metadata: JSON.stringify({ relevanceScore, relevanceReason }),
                },
            }).catch(() => { });
        }

        appAlertsSent++;
        usersSent.add(user.id);
        sentTodayByUser.set(user.id, alreadySentToday + 1);
    }

    logger.info('New job alerts sent', {
        opportunityId,
        usersSent: usersSent.size,
        emailsSent,
        appAlertsSent,
        skippedDisabled,
        skippedDailyCap,
        skippedNotEligible,
        lowScoreFallbackSent,
        pushSent,
    });

    return {
        usersSent: usersSent.size,
        emailsSent,
        appAlertsSent,
        pushSent,
    };
}
