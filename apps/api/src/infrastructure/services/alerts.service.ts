import prisma from '../database/prisma';
import { OpportunityStatus, Opportunity, Profile } from '@fresherflow/types';
import {
    filterAndRankOpportunitiesForUser,
    getTimezoneParts, buildOpportunityUrl, getClosingSoonHours, formatExpiresText
} from '@fresherflow/domain';
import { logger } from '@fresherflow/logger';
import { EmailService } from './email.service';
import { getAdminDeliveryControls } from './adminDeliveryControl.service';


// AlertPreference is fetched from DB

interface OpportunityEvent {
    id: string;
    opportunityId: string;
    eventType: string;
    title: string;
    eventDate: string | Date;
    sourceLink?: string | null;
    opportunity: Opportunity;
}

async function sendDailyDigestForUser(
    frontendUrl: string,
    user: { id: string; email: string; fullName: string | null; profile: Profile | null },
    preference: { dailyDigest: boolean; timezone?: string; preferredHour: number; lastDigestSentAt?: Date | null; emailEnabled: boolean; minRelevanceScore: number },
    now: Date,
    activeOpportunities: Opportunity[],
    controls: { userAlertsEnabled: boolean; userEmailNotificationsEnabled: boolean }
): Promise<boolean> {
    if (!controls.userAlertsEnabled) return false;
    if (!preference.dailyDigest) return false;
    if (!user.profile) return false;

    const timezone = preference.timezone || 'Asia/Kolkata';
    const current = getTimezoneParts(now, timezone);
    if (current.hour !== preference.preferredHour) return false;

    if (preference.lastDigestSentAt) {
        const last = getTimezoneParts(new Date(preference.lastDigestSentAt), timezone);
        if (last.dateKey === current.dateKey) return false;
    }

    const ranked = filterAndRankOpportunitiesForUser(
        activeOpportunities,
        user.profile as Profile,
        user.id
    )
        .filter((item) => item.score >= (preference.minRelevanceScore || 35))
        .slice(0, 8);

    if (ranked.length === 0) return false;

    const dedupeKey = `${user.id}:DAILY_DIGEST:${current.dateKey}`;
    const existing = await prisma.alertDelivery.findUnique({ where: { dedupeKey } });
    if (existing) return false;

    const shouldSendEmail = controls.userEmailNotificationsEnabled && preference.emailEnabled;

    if (shouldSendEmail) {
        await EmailService.sendOpportunityDigest(
            user.email,
            user.fullName,
            ranked.map((item) => ({
                title: item.opportunity.title,
                company: item.opportunity.company,
                location: item.opportunity.locations?.[0] || null,
                applyUrl: buildOpportunityUrl(frontendUrl, item.opportunity.slug),
            }))
        );
    }

    const operations = [
        prisma.alertDelivery.create({
            data: {
                userId: user.id,
                kind: 'DAILY_DIGEST',
                channel: 'APP',
                dedupeKey: `${dedupeKey}:APP`,
                metadata: JSON.stringify({
                    count: ranked.length,
                    opportunityIds: ranked.map((item) => item.opportunity.id),
                    generatedAt: now.toISOString(),
                    rankVersion: 'v1'
                }),
            },
        }),
        prisma.alertPreference.update({
            where: { userId: user.id },
            data: { lastDigestSentAt: now },
        }),
    ];

    if (shouldSendEmail) {
        operations.unshift(
            prisma.alertDelivery.create({
                data: {
                    userId: user.id,
                    kind: 'DAILY_DIGEST',
                    channel: 'EMAIL',
                    dedupeKey: `${dedupeKey}:EMAIL`,
                    metadata: JSON.stringify({ count: ranked.length }),
                },
            })
        );
    }

    await prisma.$transaction(operations);
    return true;
}

async function sendClosingSoonForUser(
    frontendUrl: string,
    user: { id: string; email: string; fullName: string | null; profile: Profile | null },
    preference: { closingSoon: boolean; emailEnabled: boolean; minRelevanceScore: number },
    now: Date,
    activeOpportunities: Opportunity[],
    controls: { userAlertsEnabled: boolean; userEmailNotificationsEnabled: boolean }
): Promise<boolean> {
    if (!controls.userAlertsEnabled) return false;
    if (!preference.closingSoon) return false;
    if (!user.profile) return false;

    const ranked = filterAndRankOpportunitiesForUser(
        activeOpportunities,
        user.profile as Profile,
        user.id
    )
        .filter((item) => item.score >= (preference.minRelevanceScore || 35))
        .sort((a, b) => b.score - a.score);

    for (const item of ranked) {
        const hoursLeft = getClosingSoonHours(item.opportunity, now);
        if (!hoursLeft) continue;

        const dayKey = now.toISOString().slice(0, 10);
        const dedupeKey = `${user.id}:CLOSING_SOON:${item.opportunity.id}:${dayKey}`;
        const alreadySent = await prisma.alertDelivery.findUnique({ where: { dedupeKey } });
        if (alreadySent) continue;

        const expiresText = formatExpiresText(hoursLeft);

        const shouldSendEmail = controls.userEmailNotificationsEnabled && preference.emailEnabled;

        if (shouldSendEmail) {
            await EmailService.sendClosingSoonAlert(user.email, user.fullName, {
                title: item.opportunity.title,
                company: item.opportunity.company,
                expiresText,
                applyUrl: buildOpportunityUrl(frontendUrl, item.opportunity.slug),
            });
        }

        await prisma.alertDelivery.createMany({
            data: [
                {
                    userId: user.id,
                    opportunityId: item.opportunity.id,
                    kind: 'CLOSING_SOON',
                    channel: 'APP',
                    dedupeKey: `${dedupeKey}:APP`,
                    metadata: JSON.stringify({ hoursLeft: Math.round(hoursLeft), relevanceScore: item.score }),
                },
                ...(shouldSendEmail ? [{
                    userId: user.id,
                    opportunityId: item.opportunity.id,
                    kind: 'CLOSING_SOON' as const,
                    channel: 'EMAIL' as const,
                    dedupeKey: `${dedupeKey}:EMAIL`,
                    metadata: JSON.stringify({ hoursLeft: Math.round(hoursLeft), relevanceScore: item.score }),
                }] : [])
            ],
            skipDuplicates: true
        });
        return true;
    }
    return false;
}

async function sendEventRemindersForUser(
    frontendUrl: string,
    user: { id: string; profile: Profile | null },
    preference: { enabled: boolean },
    now: Date,
    activeEvents: OpportunityEvent[],
    controls: { userAlertsEnabled: boolean }
): Promise<boolean> {
    if (!controls.userAlertsEnabled) return false;
    if (!preference.enabled) return false;
    if (!user.profile) return false;

    if (activeEvents.length === 0) return false;
    for (const event of activeEvents) {
        const ranked = filterAndRankOpportunitiesForUser(
            [event.opportunity as unknown as Opportunity],
            user.profile as Profile,
            user.id
        );
        if (ranked.length === 0) continue;

        const diffHours = (new Date(event.eventDate).getTime() - now.getTime()) / (1000 * 60 * 60);
        const windows = [
            { key: 'T3D', lower: 48, upper: 72 },
            { key: 'T1D', lower: 12, upper: 24 },
            { key: 'T0D', lower: -0.5, upper: 6 },
        ] as const;
        const window = windows.find((w) => diffHours >= w.lower && diffHours <= w.upper);
        if (!window) continue;

        const dedupeKey = `${user.id}:EVENT_REMINDER:${event.id}:${window.key}`;
        const exists = await prisma.alertDelivery.findUnique({ where: { dedupeKey } });
        if (exists) continue;

        await prisma.alertDelivery.create({
            data: {
                userId: user.id,
                opportunityId: event.opportunityId,
                kind: 'EVENT_REMINDER',
                channel: 'APP',
                dedupeKey,
                metadata: JSON.stringify({
                    eventId: event.id,
                    eventType: event.eventType,
                    eventTitle: event.title,
                    eventDate: event.eventDate,
                    reminderWindow: window.key,
                    sourceLink: event.sourceLink || null,
                    applyUrl: buildOpportunityUrl(frontendUrl, event.opportunity.slug),
                })
            }
        });
        return true;
    }

    return false;
}

async function sendTrendingAlertsForUser(
    frontendUrl: string,
    user: { id: string; email: string; fullName: string | null; profile: Profile | null },
    preference: { enabled: boolean; emailEnabled: boolean; minRelevanceScore: number },
    now: Date,
    trendingOpportunities: Opportunity[],
    controls: { userAlertsEnabled: boolean; userEmailNotificationsEnabled: boolean }
): Promise<boolean> {
    if (!controls.userAlertsEnabled) return false;
    if (!preference.enabled) return false;
    if (!user.profile) return false;

    const ranked = filterAndRankOpportunitiesForUser(
        trendingOpportunities,
        user.profile as Profile,
        user.id
    )
        .filter((item) => item.score >= (preference.minRelevanceScore || 40))
        .sort((a, b) => b.opportunity.trendingScore - a.opportunity.trendingScore);

    if (ranked.length === 0) return false;

    // Pick the top trending one that matches the user
    const item = ranked[0];
    const dedupeKey = `${user.id}:TRENDING:${item.opportunity.id}`;
    const alreadySent = await prisma.alertDelivery.findUnique({ where: { dedupeKey } });
    if (alreadySent) return false;

    const shouldSendEmail = controls.userEmailNotificationsEnabled && preference.emailEnabled;

    if (shouldSendEmail) {
        // Fallback to digest style if specific trending email isn't ready
        await EmailService.sendNewJobAlert(user.email, user.fullName, {
            title: `🔥 Trending: ${item.opportunity.title}`,
            company: item.opportunity.company,
            location: item.opportunity.locations?.[0] || 'Remote',
            applyUrl: buildOpportunityUrl(frontendUrl, item.opportunity.slug),
        });
    }

    await prisma.alertDelivery.create({
        data: {
            userId: user.id,
            opportunityId: item.opportunity.id,
            kind: 'HIGHLIGHT',
            channel: 'APP',
            dedupeKey,
            metadata: JSON.stringify({
                trendingScore: item.opportunity.trendingScore,
                relevanceScore: item.score,
                type: 'TRENDING_ALERT'
            }),
        },
    });

    return true;
}

export async function runAlertsCycle() {

    const now = new Date();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const maxUsers = Number(process.env.ALERTS_MAX_USERS || 250);
    const maxOpportunities = Number(process.env.ALERTS_MAX_OPPORTUNITIES || 120);
    const maxEvents = Number(process.env.ALERTS_MAX_EVENTS || 80);
    const deliveryControls = await getAdminDeliveryControls();

    if (!deliveryControls.userAlertsEnabled) {
        logger.info('Skipping alerts cycle because admin delivery controls disabled user alerts');
        return { usersChecked: 0, digestSent: 0, closingSoonSent: 0, eventRemindersSent: 0 };
    }

    // OPTIMIZATION: Fetch active data ONCE per cycle instead of per user (saves thousands of DB calls)
    const [activeOpportunities, activeEvents, trendingOpportunities] = await Promise.all([
        prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                expiredAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            include: { walkInDetails: true },
            orderBy: { postedAt: 'desc' },
            take: maxOpportunities,
        }) as unknown as Promise<Opportunity[]>,
        prisma.opportunityEvent.findMany({
            where: {
                eventDate: {
                    gte: new Date(now.getTime() - 60 * 60 * 1000), // 1h grace
                    lte: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
                },
                opportunity: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                }
            },
            include: {
                opportunity: {
                    include: { walkInDetails: true }
                }
            },
            orderBy: { eventDate: 'asc' },
            take: maxEvents
        }),
        prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                trendingScore: { gt: 1.0 }
            },
            orderBy: { trendingScore: 'desc' },
            take: 10
        }) as unknown as Promise<Opportunity[]>
    ]);

    const users = await prisma.user.findMany({
        where: {
            role: { in: ['USER', 'ADMIN'] },
            profile: { isNot: null },
            alertPreference: {
                is: {
                    enabled: true,
                }
            }
        },
        select: {
            id: true,
            email: true,
            fullName: true,
            profile: true,
            alertPreference: true,
        },
        take: maxUsers,
    });

    let digestSent = 0;
    let closingSoonSent = 0;
    let eventRemindersSent = 0;
    let trendingSent = 0;

    for (const user of users) {
        const preference = (user.alertPreference as {
            enabled: boolean;
            emailEnabled: boolean;
            dailyDigest: boolean;
            closingSoon: boolean;
            minRelevanceScore: number;
            preferredHour: number;
            timezone: string;
            lastDigestSentAt: Date | null;
        }) ?? {
            enabled: true,
            emailEnabled: true,
            dailyDigest: true,
            closingSoon: true,
            minRelevanceScore: 35,
            preferredHour: 8,
            timezone: 'Asia/Kolkata',
            lastDigestSentAt: null,
        };

        if (!preference.enabled || !user.profile) {
            continue;
        }

        const sentDigest = await sendDailyDigestForUser(frontendUrl, user as unknown as { id: string; email: string; fullName: string | null; profile: Profile | null }, preference, now, activeOpportunities as Opportunity[], deliveryControls);
        const sentClosingSoon = await sendClosingSoonForUser(frontendUrl, user as unknown as { id: string; email: string; fullName: string | null; profile: Profile | null }, preference, now, activeOpportunities as Opportunity[], deliveryControls);
        const sentEventReminder = await sendEventRemindersForUser(frontendUrl, user as unknown as { id: string; profile: Profile | null }, preference, now, activeEvents as unknown as OpportunityEvent[], deliveryControls);
        const sentTrending = await sendTrendingAlertsForUser(frontendUrl, user as unknown as { id: string; email: string; fullName: string | null; profile: Profile | null }, preference, now, trendingOpportunities, deliveryControls);

        if (sentDigest) digestSent += 1;
        if (sentClosingSoon) closingSoonSent += 1;
        if (sentEventReminder) eventRemindersSent += 1;
        if (sentTrending) trendingSent += 1;
    }

    logger.info('Alerts cycle completed', {
        usersChecked: users.length,
        digestSent,
        closingSoonSent,
        eventRemindersSent,
        trendingSent
    });

    return { usersChecked: users.length, digestSent, closingSoonSent, eventRemindersSent, trendingSent };
}
