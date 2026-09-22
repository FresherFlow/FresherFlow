import { prisma, redis } from '@fresherflow/database';
import {
    logger,
    PROFILE_PAGE_ACTIVE_DAYS,
    profilePageActiveSince,
    profilePageExpiresAt,
} from '@fresherflow/utils';
import { EmailService } from '../infrastructure/services/email.service';
import { getPublicSiteUrl } from '../utils/runtimeConfig';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** One reminder per activation window — the key carries the activation timestamp,
 *  so reactivating makes the owner eligible for a fresh reminder next cycle. */
const REMINDER_KEY_PREFIX = 'profile-page-reminder:';
const REMINDER_KEY_TTL_SECONDS = 3 * 24 * 60 * 60;

/** Only nudge once the page is inside its last day. */
const REMINDER_WINDOW_DAYS = 1;

export interface ProfilePageReminderResult {
    candidates: number;
    sent: number;
    skipped: number;
}

/**
 * Email owners whose public page lapses within the reminder window.
 *
 * Idempotent without a schema column: the Redis key is scoped to the specific
 * activation, taken with NX, and expires well after the window closes. If Redis is
 * unavailable we skip rather than risk emailing the same person every run — the
 * in-app dashboard nudge still covers them.
 */
export async function runProfilePageExpiryReminders(
    now: Date = new Date()
): Promise<ProfilePageReminderResult> {
    const activatedBefore = new Date(
        now.getTime() - (PROFILE_PAGE_ACTIVE_DAYS - REMINDER_WINDOW_DAYS) * MS_PER_DAY
    );

    const profiles = await prisma.profile.findMany({
        where: {
            // Activated (PROFILE_PAGE_ACTIVE_DAYS - 1)..ACTIVE_DAYS days ago — still live, about to lapse.
            profilePublishedAt: { gt: profilePageActiveSince(now), lte: activatedBefore },
            user: { status: 'ACTIVE', email: { not: null } },
        },
        select: {
            userId: true,
            profilePublishedAt: true,
            user: { select: { email: true, fullName: true, username: true } },
        },
        take: 500,
    });

    let sent = 0;
    let skipped = 0;

    for (const profile of profiles) {
        const activatedAt = profile.profilePublishedAt;
        const { email, fullName, username } = profile.user;
        if (!activatedAt || !email || !username) {
            skipped += 1;
            continue;
        }

        try {
            const claimKey = `${REMINDER_KEY_PREFIX}${profile.userId}:${activatedAt.getTime()}`;
            const claimed = await redis.set(claimKey, '1', 'EX', REMINDER_KEY_TTL_SECONDS, 'NX');
            if (claimed !== 'OK') {
                skipped += 1;
                continue;
            }
        } catch (error) {
            logger.warn('[ProfilePageReminder] Skipping — Redis unavailable for idempotency lock', {
                userId: profile.userId,
                error,
            });
            skipped += 1;
            continue;
        }

        const daysLeft = Math.max(
            1,
            Math.ceil((profilePageExpiresAt(activatedAt).getTime() - now.getTime()) / MS_PER_DAY)
        );

        await EmailService.sendProfilePageExpiryReminder(email, fullName, {
            username,
            pageUrl: `${getPublicSiteUrl()}/u/${username}`,
            daysLeft,
        });
        sent += 1;
    }

    if (profiles.length > 0) {
        logger.info('[ProfilePageReminder] Cycle complete', { candidates: profiles.length, sent, skipped });
    }

    return { candidates: profiles.length, sent, skipped };
}
