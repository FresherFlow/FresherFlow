import prisma from '../../infrastructure/database/prisma';
import { OpportunityStatus, Opportunity, Profile } from '@fresherflow/types';
import { 
    filterAndRankOpportunitiesForUser,
    getTimezoneParts, buildOpportunityUrl, getClosingSoonHours, formatExpiresText 
} from '@fresherflow/domain';
import { logger } from '@fresherflow/logger';
import { EmailService } from '../../infrastructure/services/email.service';

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
    opportunity: Opportunity | Record<string, unknown>;
}

type CycleUser = { id: string; email: string; fullName: string | null; profile: Profile | null; alertPreference?: unknown };

async function sendDailyDigestForUser(
    frontendUrl: string,
    user: { id: string; email: string; fullName: string | null; profile: Profile | null },
    preference: AlertPreference,
    now: Date,
    activeOpportunities: Opportunity[]
): Promise<boolean> {
    if (!preference.dailyDigest || !user.profile) return false;

    const timezone = preference.timezone || 'Asia/Kolkata';
    const current = getTimezoneParts(now, timezone);
    if (current.hour !== preference.preferredHour) return false;

    if (preference.lastDigestSentAt) {
        const last = getTimezoneParts(new Date(preference.lastDigestSentAt), timezone);
        if (last.dateKey === current.dateKey) return false;
    }

    const ranked = filterAndRankOpportunitiesForUser(activeOpportunities, user.profile as Profile, user.id)
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
            data: { userId: user.id, kind: 'DAILY_DIGEST', channel: 'EMAIL', dedupeKey: `${dedupeKey}:EMAIL`, metadata: JSON.stringify({ count: ranked.length }) },
        }),
        prisma.alertDelivery.create({
            data: { userId: user.id, kind: 'DAILY_DIGEST', channel: 'APP', dedupeKey: `${dedupeKey}:APP`, metadata: JSON.stringify({ count: ranked.length, opportunityIds: ranked.map((item) => item.opportunity.id), generatedAt: now.toISOString(), rankVersion: 'v1' }) },
        }),
        prisma.alertPreference.update({ where: { userId: user.id }, data: { lastDigestSentAt: now } }),
    ]);
    return true;
}

async function sendClosingSoonForUser(
    frontendUrl: string,
    user: { id: string; email: string; fullName: string | null; profile: Profile | null },
    preference: AlertPreference,
    now: Date,
    activeOpportunities: Opportunity[]
): Promise<boolean> {
    if (!preference.closingSoon || !user.profile) return false;

    const ranked = filterAndRankOpportunitiesForUser(activeOpportunities, user.profile as Profile, user.id)
        .filter((item) => item.score >= (preference.minRelevanceScore || 35))
        .sort((a, b) => b.score - a.score);

    for (const item of ranked) {
        const hoursLeft = getClosingSoonHours(item.opportunity, now);
        if (!hoursLeft) continue;

        const dayKey = now.toISOString().slice(0, 10);
        const dedupeKey = `${user.id}:CLOSING_SOON:${item.opportunity.id}:${dayKey}`;
        const alreadySent = await prisma.alertDelivery.findUnique({ where: { dedupeKey } });
        if (alreadySent) continue;

        if (preference.emailEnabled) {
            await EmailService.sendClosingSoonAlert(user.email, user.fullName, {
                title: item.opportunity.title,
                company: item.opportunity.company,
                expiresText: formatExpiresText(hoursLeft),
                applyUrl: buildOpportunityUrl(frontendUrl, item.opportunity.slug),
            });
        }

        await prisma.alertDelivery.createMany({
            data: [
                { userId: user.id, opportunityId: item.opportunity.id, kind: 'CLOSING_SOON', channel: 'EMAIL', dedupeKey: `${dedupeKey}:EMAIL`, metadata: JSON.stringify({ hoursLeft: Math.round(hoursLeft), relevanceScore: item.score }) },
                { userId: user.id, opportunityId: item.opportunity.id, kind: 'CLOSING_SOON', channel: 'APP', dedupeKey: `${dedupeKey}:APP`, metadata: JSON.stringify({ hoursLeft: Math.round(hoursLeft), relevanceScore: item.score }) }
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
    preference: AlertPreference,
    now: Date,
    activeEvents: OpportunityEvent[]
): Promise<boolean> {
    if (!preference.enabled || !user.profile || activeEvents.length === 0) return false;

    for (const event of activeEvents) {
        const eventOpportunity = event.opportunity as Opportunity;
        const ranked = filterAndRankOpportunitiesForUser([eventOpportunity], user.profile as Profile, user.id);
        if (ranked.length === 0) continue;

        const diffHours = (new Date(event.eventDate).getTime() - now.getTime()) / (1000 * 60 * 60);
        const windows = [{ key: 'T3D', lower: 48, upper: 72 }, { key: 'T1D', lower: 12, upper: 24 }, { key: 'T0D', lower: -0.5, upper: 6 }] as const;
        const window = windows.find((w) => diffHours >= w.lower && diffHours <= w.upper);
        if (!window) continue;

        const dedupeKey = `${user.id}:EVENT_REMINDER:${event.id}:${window.key}`;
        const exists = await prisma.alertDelivery.findUnique({ where: { dedupeKey } });
        if (exists) continue;

        await prisma.alertDelivery.create({
            data: {
                userId: user.id, opportunityId: event.opportunityId, kind: 'EVENT_REMINDER', channel: 'APP', dedupeKey,
                metadata: JSON.stringify({ eventId: event.id, eventType: event.eventType, eventTitle: event.title, eventDate: event.eventDate, reminderWindow: window.key, sourceLink: event.sourceLink || null, applyUrl: buildOpportunityUrl(frontendUrl, eventOpportunity.slug) })
            }
        });
        return true;
    }
    return false;
}

export async function runAlertsCycle() {
    const now = new Date();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const [activeOpportunities, activeEvents] = await Promise.all([
        prisma.opportunity.findMany({
            where: { status: OpportunityStatus.PUBLISHED, deletedAt: null, expiredAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            include: { walkInDetails: true }, orderBy: { postedAt: 'desc' }, take: 300,
        }) as unknown as Promise<Opportunity[]>,
        prisma.opportunityEvent.findMany({
            where: { eventDate: { gte: new Date(now.getTime() - 60 * 60 * 1000), lte: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000) }, opportunity: { status: OpportunityStatus.PUBLISHED, deletedAt: null } },
            include: { opportunity: { include: { walkInDetails: true } } }, orderBy: { eventDate: 'asc' }, take: 200
        })
    ]);

    const users = await prisma.user.findMany({
        where: { role: { in: ['USER', 'ADMIN'] } },
        select: { id: true, email: true, fullName: true, profile: true, alertPreference: true },
        take: 1000,
    }) as CycleUser[];

    let digestSent = 0, closingSoonSent = 0, eventRemindersSent = 0;

    for (const user of users) {
        const preference: AlertPreference = (user.alertPreference as AlertPreference | null) ?? {
            enabled: true, emailEnabled: true, dailyDigest: true, closingSoon: true, minRelevanceScore: 35, preferredHour: 8, timezone: 'Asia/Kolkata', lastDigestSentAt: null,
        };
        if (!preference.enabled || !user.profile) continue;

        const sentDigest = await sendDailyDigestForUser(frontendUrl, user, preference, now, activeOpportunities);
        const sentClosingSoon = await sendClosingSoonForUser(frontendUrl, user, preference, now, activeOpportunities);
        const sentEventReminder = await sendEventRemindersForUser(frontendUrl, user, preference, now, activeEvents as OpportunityEvent[]);
        
        if (sentDigest) digestSent += 1;
        if (sentClosingSoon) closingSoonSent += 1;
        if (sentEventReminder) eventRemindersSent += 1;
    }

    logger.info('Alerts cycle completed', { usersChecked: users.length, digestSent, closingSoonSent, eventRemindersSent });
    return { usersChecked: users.length, digestSent, closingSoonSent, eventRemindersSent };
}
