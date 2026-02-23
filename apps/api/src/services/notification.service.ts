import prisma from '../lib/prisma';
import { AlertChannel, AlertDispatchReason, AlertDispatchStatus, AlertKind, OpportunityStatus } from '@prisma/client';
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
const NEW_JOB_DISPATCH_DATE_FORMAT = 'en-CA';

let cachedNewJobKind: AlertKind | null = null;

function getDispatchDateBucket(date = new Date()): string {
    return date.toLocaleDateString(NEW_JOB_DISPATCH_DATE_FORMAT, { timeZone: 'Asia/Kolkata' });
}

async function logDispatch(params: {
    correlationId: string;
    userId?: string | null;
    opportunityId?: string | null;
    kind: AlertKind;
    channel?: AlertChannel | null;
    status: AlertDispatchStatus;
    reason?: AlertDispatchReason | null;
    dedupeKey?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown> | null;
    attemptedAt?: Date;
    deliveredAt?: Date;
}) {
    await prisma.alertDispatchLog.create({
        data: {
            correlationId: params.correlationId,
            userId: params.userId ?? null,
            opportunityId: params.opportunityId ?? null,
            kind: params.kind,
            channel: params.channel ?? null,
            status: params.status,
            reason: params.reason ?? null,
            dedupeKey: params.dedupeKey ?? null,
            errorMessage: params.errorMessage ?? null,
            metadata: (params.metadata ?? undefined) as any,
            attemptedAt: params.attemptedAt,
            deliveredAt: params.deliveredAt,
        },
    });
}

async function resolveNewJobKind(): Promise<AlertKind> {
    if (cachedNewJobKind) return cachedNewJobKind;

    try {
        const labels = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
            SELECT e.enumlabel
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'AlertKind'
        `;

        const supportedKinds = new Set(labels.map((row) => row.enumlabel));
        cachedNewJobKind = supportedKinds.has('NEW_JOB') ? AlertKind.NEW_JOB : AlertKind.HIGHLIGHT;
    } catch {
        cachedNewJobKind = AlertKind.NEW_JOB;
    }

    return cachedNewJobKind;
}

export async function sendNewJobAlerts(opportunityId: string): Promise<NewJobNotificationResult> {
    const correlationId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const alertKind = await resolveNewJobKind();
    if (alertKind !== AlertKind.NEW_JOB) {
        logger.warn('AlertKind.NEW_JOB not present in DB enum, falling back to HIGHLIGHT', { alertKind });
        await logDispatch({
            correlationId,
            opportunityId,
            kind: alertKind,
            status: AlertDispatchStatus.SKIPPED,
            reason: AlertDispatchReason.ENUM_FALLBACK,
            errorMessage: 'AlertKind.NEW_JOB not present in DB enum; used fallback kind.',
            metadata: { fallbackKind: alertKind },
        });
    }

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
            kind: alertKind,
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
        const userAttemptedAt = new Date();
        await logDispatch({
            correlationId,
            userId: user.id,
            opportunityId: opportunity.id,
            kind: alertKind,
            status: AlertDispatchStatus.INITIATED,
            reason: null,
            metadata: { stage: 'user_dispatch_started' },
            attemptedAt: userAttemptedAt,
        });

        const preference = user.alertPreference ?? {
            enabled: true,
            emailEnabled: false,
            minRelevanceScore: 35,
        };
        if (!preference.enabled) {
            skippedDisabled += 1;
            await logDispatch({
                correlationId,
                userId: user.id,
                opportunityId: opportunity.id,
                kind: alertKind,
                status: AlertDispatchStatus.SKIPPED,
                reason: AlertDispatchReason.PREFERENCE_DISABLED,
                metadata: { enabled: preference.enabled },
                attemptedAt: userAttemptedAt,
            });
            continue;
        }
        const alreadySentToday = sentTodayByUser.get(user.id) || 0;
        if (alreadySentToday >= MAX_NEW_JOB_ALERTS_PER_USER_PER_DAY) {
            skippedDailyCap += 1;
            await logDispatch({
                correlationId,
                userId: user.id,
                opportunityId: opportunity.id,
                kind: alertKind,
                status: AlertDispatchStatus.SKIPPED,
                reason: AlertDispatchReason.DAILY_CAP,
                metadata: { alreadySentToday, dailyCap: MAX_NEW_JOB_ALERTS_PER_USER_PER_DAY },
                attemptedAt: userAttemptedAt,
            });
            continue;
        }

        let relevanceScore: number | null = null;
        let relevanceReason = 'General alert';

        if (user.profile) {
            // Keep personalized alerts strict for users with profile data.
            const eligible = filterOpportunitiesForUser([opportunity as any], user.profile as any);
            if (eligible.length === 0) {
                skippedNotEligible += 1;
                await logDispatch({
                    correlationId,
                    userId: user.id,
                    opportunityId: opportunity.id,
                    kind: alertKind,
                    status: AlertDispatchStatus.SKIPPED,
                    reason: AlertDispatchReason.NOT_ELIGIBLE,
                    metadata: { stage: 'eligibility_filter', source: 'profile' },
                    attemptedAt: userAttemptedAt,
                });
                continue;
            }

            const ranked = rankOpportunitiesForUser(eligible as any, user.profile as any);
            if (ranked.length === 0) {
                skippedNotEligible += 1;
                await logDispatch({
                    correlationId,
                    userId: user.id,
                    opportunityId: opportunity.id,
                    kind: alertKind,
                    status: AlertDispatchStatus.SKIPPED,
                    reason: AlertDispatchReason.NOT_ELIGIBLE,
                    metadata: { stage: 'ranking', source: 'profile' },
                    attemptedAt: userAttemptedAt,
                });
                continue;
            }

            relevanceScore = ranked[0].score;
            if (relevanceScore < preference.minRelevanceScore) {
                // If a user is eligible but ranking is slightly low, still send one "low confidence"
                // app alert per day to avoid an empty notification inbox.
                if (alreadySentToday > 0) {
                    skippedNotEligible += 1;
                    await logDispatch({
                        correlationId,
                        userId: user.id,
                        opportunityId: opportunity.id,
                        kind: alertKind,
                        status: AlertDispatchStatus.SKIPPED,
                        reason: AlertDispatchReason.NOT_ELIGIBLE,
                        metadata: { stage: 'min_relevance', relevanceScore, minRelevanceScore: preference.minRelevanceScore },
                        attemptedAt: userAttemptedAt,
                    });
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
        const dedupeDateBucket = getDispatchDateBucket(userAttemptedAt);
        const dedupeKeyBase = `${user.id}:NEW_JOB:${opportunityId}:${dedupeDateBucket}`;
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
        if (existing) {
            await logDispatch({
                correlationId,
                userId: user.id,
                opportunityId: opportunity.id,
                kind: alertKind,
                status: AlertDispatchStatus.SKIPPED,
                reason: AlertDispatchReason.DEDUPE_HIT,
                dedupeKey: dedupeKeyBase,
                metadata: { stage: 'pre_delivery_dedupe' },
                attemptedAt: userAttemptedAt,
            });
            continue;
        }

        const deliveriesToCreate: Array<{
            userId: string;
            opportunityId: string;
            kind: AlertKind;
            channel: 'APP' | 'EMAIL' | 'PUSH';
            dedupeKey: string;
            metadata: string;
        }> = [
            {
                userId: user.id,
                opportunityId: opportunity.id,
                kind: alertKind,
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
                    kind: alertKind,
                    channel: 'EMAIL',
                    dedupeKey: `${dedupeKeyBase}:EMAIL`,
                    metadata: JSON.stringify({ relevanceScore, relevanceReason }),
                });
                await logDispatch({
                    correlationId,
                    userId: user.id,
                    opportunityId: opportunity.id,
                    kind: alertKind,
                    channel: AlertChannel.EMAIL,
                    status: AlertDispatchStatus.SENT,
                    reason: AlertDispatchReason.SENT_OK,
                    dedupeKey: `${dedupeKeyBase}:EMAIL`,
                    metadata: { relevanceScore, relevanceReason },
                    attemptedAt: userAttemptedAt,
                    deliveredAt: new Date(),
                });
            } catch (err) {
                logger.error('Failed to send new job email', { userId: user.id, opportunityId, error: err });
                await logDispatch({
                    correlationId,
                    userId: user.id,
                    opportunityId: opportunity.id,
                    kind: alertKind,
                    channel: AlertChannel.EMAIL,
                    status: AlertDispatchStatus.FAILED,
                    reason: AlertDispatchReason.CHANNEL_ERROR,
                    dedupeKey: `${dedupeKeyBase}:EMAIL`,
                    errorMessage: err instanceof Error ? err.message : String(err),
                    metadata: { relevanceScore, relevanceReason },
                    attemptedAt: userAttemptedAt,
                });
            }
        }

        // Create alert delivery records
        await prisma.alertDelivery.createMany({
            data: deliveriesToCreate,
            skipDuplicates: true,
        });
        await logDispatch({
            correlationId,
            userId: user.id,
            opportunityId: opportunity.id,
            kind: alertKind,
            channel: AlertChannel.APP,
            status: AlertDispatchStatus.SENT,
            reason: AlertDispatchReason.SENT_OK,
            dedupeKey: `${dedupeKeyBase}:APP`,
            metadata: { relevanceScore, relevanceReason },
            attemptedAt: userAttemptedAt,
            deliveredAt: new Date(),
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
                    kind: alertKind,
                    channel: 'PUSH',
                    dedupeKey: `${dedupeKeyBase}:PUSH`,
                    metadata: JSON.stringify({ relevanceScore, relevanceReason }),
                },
            }).catch(() => { });
            await logDispatch({
                correlationId,
                userId: user.id,
                opportunityId: opportunity.id,
                kind: alertKind,
                channel: AlertChannel.PUSH,
                status: AlertDispatchStatus.SENT,
                reason: AlertDispatchReason.SENT_OK,
                dedupeKey: `${dedupeKeyBase}:PUSH`,
                metadata: { relevanceScore, relevanceReason },
                attemptedAt: userAttemptedAt,
                deliveredAt: new Date(),
            });
        } else {
            await logDispatch({
                correlationId,
                userId: user.id,
                opportunityId: opportunity.id,
                kind: alertKind,
                channel: AlertChannel.PUSH,
                status: pushResult.status === 'skipped' ? AlertDispatchStatus.SKIPPED : AlertDispatchStatus.FAILED,
                reason: pushResult.status === 'skipped' ? AlertDispatchReason.VALIDATION_ERROR : AlertDispatchReason.CHANNEL_ERROR,
                dedupeKey: `${dedupeKeyBase}:PUSH`,
                errorMessage: pushResult.reason || null,
                metadata: { relevanceScore, relevanceReason, pushStatus: pushResult.status },
                attemptedAt: userAttemptedAt,
            });
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
