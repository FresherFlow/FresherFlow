import prisma from '../database/prisma';
import { OpportunityStatus, Opportunity, Profile } from '@fresherflow/types';
import { 
    filterAndRankOpportunitiesForUser,
    getTimezoneParts, buildOpportunityUrl, getClosingSoonHours, formatExpiresText 
} from '@fresherflow/domain';
import { logger } from '@fresherflow/logger';
import { EmailService } from './email.service';
import { getAdminDeliveryControls } from './adminDeliveryControl.service';


interface AlertPreference {
    enabled: boolean;
    emailEnabled: boolean;
    dailyDigest: boolean;
    closingSoon: boolean;
    minRelevanceScore: number;
    preferredHour: number;
    timezone: string;
    lastDigestSentAt: Date | null;
}

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

export async function runAlertsCycle() {
    const now = new Date();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const deliveryControls = await getAdminDeliveryControls();

    if (!deliveryControls.userAlertsEnabled) {
        logger.info('Skipping alerts cycle because admin delivery controls disabled user alerts');
        return { usersChecked: 0, digestSent: 0, closingSoonSent: 0, eventRemindersSent: 0 };
    }

    // OPTIMIZATION: Fetch active data ONCE per cycle instead of per user (saves thousands of DB calls)
    const [activeOpportunities, activeEvents] = await Promise.all([
        prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                expiredAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            include: { walkInDetails: true },
            orderBy: { postedAt: 'desc' },
            take: 300,
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
            take: 200
        })
    ]);

    const users = await prisma.user.findMany({
        where: { role: { in: ['USER', 'ADMIN'] } },
        select: {
            id: true,
            email: true,
            fullName: true,
            profile: true,
            alertPreference: true,
        },
        take: 1000,
    });

    let digestSent = 0;
    let closingSoonSent = 0;
    let eventRemindersSent = 0;

    for (const user of users) {
        const preference: AlertPreference = (user.alertPreference as unknown as AlertPreference) ?? {
            enabled: true,
            emailEnabled: true,
            dailyDigest: true,
            closingSoon: true,
            minRelevanceScore: 35,
            preferredHour: 8,
            timezone: 'Asia/Kolkata',
            lastDigestSentAt: null,
        };

        if (!preference.enabled) {
            continue;
        }

        if (!user.profile) {
            continue;
        }

        const sentDigest = await sendDailyDigestForUser(frontendUrl, user as unknown as { id: string; email: string; fullName: string | null; profile: Profile | null }, preference, now, activeOpportunities as Opportunity[], deliveryControls);
        const sentClosingSoon = await sendClosingSoonForUser(frontendUrl, user as unknown as { id: string; email: string; fullName: string | null; profile: Profile | null }, preference, now, activeOpportunities as Opportunity[], deliveryControls);
        const sentEventReminder = await sendEventRemindersForUser(frontendUrl, user as unknown as { id: string; profile: Profile | null }, preference, now, activeEvents as unknown as OpportunityEvent[], deliveryControls);
        
        if (sentDigest) digestSent += 1;
        if (sentClosingSoon) closingSoonSent += 1;
        if (sentEventReminder) eventRemindersSent += 1;
    }

    logger.info('Alerts cycle completed', {
        usersChecked: users.length,
        digestSent,
        closingSoonSent,
        eventRemindersSent,
    });

    return { usersChecked: users.length, digestSent, closingSoonSent, eventRemindersSent };
}
