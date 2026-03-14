import prisma from '../lib/prisma';
import { OpportunityStatus, OpportunityType, Opportunity, Profile } from '@fresherflow/types';
import { filterOpportunitiesForUser, rankOpportunitiesForUser } from '../domain/eligibility';
import { logger } from '@fresherflow/logger';
import { EmailService } from './email.service';


const CLOSING_SOON_WINDOW_HOURS = 48;

type TzParts = { dateKey: string; hour: number };

function getTimezoneParts(date: Date, timezone: string): TzParts {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return {
        dateKey: `${map.year}-${map.month}-${map.day}`,
        hour: Number(map.hour ?? 0),
    };
}

function buildOpportunityUrl(frontendUrl: string, slug: string) {
    return `${frontendUrl.replace(/\/$/, '')}/opportunities/${slug}`;
}

function getClosingSoonHours(opportunity: {
    type: string | OpportunityType;
    expiresAt?: Date | string | null;
    walkInDetails?: { dates: unknown[] } | null;
}, now: Date): number | null {
    if (opportunity.type === 'WALKIN') {
        const dates = (opportunity.walkInDetails?.dates ?? []) as Array<string | Date>;
        if (dates.length === 0) return null;
        const lastDate = new Date(Math.max(...dates.map((d: string | Date) => new Date(d).getTime())));
        lastDate.setUTCHours(23, 59, 59, 999);
        const diffHours = (lastDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= CLOSING_SOON_WINDOW_HOURS ? diffHours : null;
    }

    if (!opportunity.expiresAt) return null;
    const diffHours = (new Date(opportunity.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= CLOSING_SOON_WINDOW_HOURS ? diffHours : null;
}

async function sendDailyDigestForUser(
    frontendUrl: string,
    user: { id: string; email: string; fullName: string | null; profile: unknown },
    preference: { dailyDigest: boolean; timezone?: string; preferredHour: number; lastDigestSentAt?: Date | null; emailEnabled: boolean; minRelevanceScore: number },
    now: Date
): Promise<boolean> {
    if (!preference.dailyDigest) return false;
    if (!user.profile) return false;

    const timezone = preference.timezone || 'Asia/Kolkata';
    const current = getTimezoneParts(now, timezone);
    if (current.hour !== preference.preferredHour) return false;

    if (preference.lastDigestSentAt) {
        const last = getTimezoneParts(new Date(preference.lastDigestSentAt), timezone);
        if (last.dateKey === current.dateKey) return false;
    }

    const opportunities = await prisma.opportunity.findMany({
        where: {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            expiredAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        include: { walkInDetails: true },
        orderBy: { postedAt: 'desc' },
        take: 200,
    });

    const eligible = filterOpportunitiesForUser(opportunities as unknown as Opportunity[], user.profile as Profile);
    const ranked = rankOpportunitiesForUser(eligible as Opportunity[], user.profile as Profile)
        .filter((item) => item.score >= (preference.minRelevanceScore || 35))
        .slice(0, 8);

    if (ranked.length === 0) return false;

    const dedupeKey = `${user.id}:DAILY_DIGEST:${current.dateKey}`;
    const existing = await prisma.alertDelivery.findUnique({ where: { dedupeKey } });
    if (existing) return false;

    if (preference.emailEnabled) {
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

    await prisma.$transaction([
        prisma.alertDelivery.create({
            data: {
                userId: user.id,
                kind: 'DAILY_DIGEST',
                channel: 'EMAIL',
                dedupeKey: `${dedupeKey}:EMAIL`,
                metadata: JSON.stringify({ count: ranked.length }),
            },
        }),
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
    ]);
    return true;
}

async function sendClosingSoonForUser(
    frontendUrl: string,
    user: { id: string; email: string; fullName: string | null; profile: unknown },
    preference: { closingSoon: boolean; emailEnabled: boolean; minRelevanceScore: number },
    now: Date
): Promise<boolean> {
    if (!preference.closingSoon) return false;
    if (!user.profile) return false;

    const opportunities = await prisma.opportunity.findMany({
        where: {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            expiredAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        include: { walkInDetails: true },
        orderBy: { postedAt: 'desc' },
        take: 200,
    });

    const eligible = filterOpportunitiesForUser(opportunities as unknown as Opportunity[], user.profile as Profile);
    const ranked = rankOpportunitiesForUser(eligible as Opportunity[], user.profile as Profile)
        .filter((item) => item.score >= (preference.minRelevanceScore || 35))
        .sort((a, b) => b.score - a.score);

    for (const item of ranked) {
        const hoursLeft = getClosingSoonHours(item.opportunity as unknown as Opportunity, now);
        if (!hoursLeft) continue;

        const dayKey = now.toISOString().slice(0, 10);
        const dedupeKey = `${user.id}:CLOSING_SOON:${item.opportunity.id}:${dayKey}`;
        const alreadySent = await prisma.alertDelivery.findUnique({ where: { dedupeKey } });
        if (alreadySent) continue;

        const expiresText = hoursLeft <= 24
            ? `Expires in ${Math.max(1, Math.round(hoursLeft))} hours`
            : `Expires in ${Math.ceil(hoursLeft / 24)} days`;

        if (preference.emailEnabled) {
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
                    channel: 'EMAIL',
                    dedupeKey: `${dedupeKey}:EMAIL`,
                    metadata: JSON.stringify({ hoursLeft: Math.round(hoursLeft), relevanceScore: item.score }),
                },
                {
                    userId: user.id,
                    opportunityId: item.opportunity.id,
                    kind: 'CLOSING_SOON',
                    channel: 'APP',
                    dedupeKey: `${dedupeKey}:APP`,
                    metadata: JSON.stringify({ hoursLeft: Math.round(hoursLeft), relevanceScore: item.score }),
                }
            ],
            skipDuplicates: true
        });
        return true;
    }
    return false;
}

async function sendEventRemindersForUser(
    frontendUrl: string,
    user: { id: string; profile: unknown },
    preference: { enabled: boolean },
    now: Date
): Promise<boolean> {
    if (!preference.enabled) return false;
    if (!user.profile) return false;

    const upcoming = await prisma.opportunityEvent.findMany({
        where: {
            eventDate: {
                gte: new Date(now.getTime() - 30 * 60 * 1000),
                lte: new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000),
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
    });

    if (upcoming.length === 0) return false;
    for (const event of upcoming) {
        const eligible = filterOpportunitiesForUser([event.opportunity as unknown as Opportunity], user.profile as Profile);
        if (eligible.length === 0) continue;

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
        take: 1000,
    });

    let digestSent = 0;
    let closingSoonSent = 0;
    let eventRemindersSent = 0;
    let usersEnabled = 0;
    let usersDisabled = 0;
    let usersMissingProfile = 0;

    for (const user of users) {
        const preference = (user.alertPreference as unknown as { enabled: boolean; emailEnabled: boolean; dailyDigest: boolean; closingSoon: boolean; minRelevanceScore: number; preferredHour: number; timezone: string; lastDigestSentAt: Date | null }) ?? {
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
            usersDisabled += 1;
            continue;
        }

        usersEnabled += 1;
        if (!user.profile) usersMissingProfile += 1;

        const sentDigest = await sendDailyDigestForUser(frontendUrl, user, preference, now);
        const sentClosingSoon = await sendClosingSoonForUser(frontendUrl, user, preference, now);
        const sentEventReminder = await sendEventRemindersForUser(frontendUrl, user, preference, now);
        if (sentDigest) digestSent += 1;
        if (sentClosingSoon) closingSoonSent += 1;
        if (sentEventReminder) eventRemindersSent += 1;
    }

    logger.info('Alerts cycle completed', {
        usersChecked: users.length,
        usersEnabled,
        usersDisabled,
        usersMissingProfile,
        digestSent,
        closingSoonSent,
        eventRemindersSent,
    });

    return {
        usersChecked: users.length,
        usersEnabled,
        usersDisabled,
        usersMissingProfile,
        digestSent,
        closingSoonSent,
        eventRemindersSent
    };
}
