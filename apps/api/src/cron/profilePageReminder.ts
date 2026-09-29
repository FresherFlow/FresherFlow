import { prisma, redis } from '@fresherflow/database';
import {
    logger,
    PROFILE_BOOST_DAYS,
    profileBoostEndsAt,
    profileBoostSince,
} from '@fresherflow/utils';
import { EmailService } from '../infrastructure/services/alerts/email.service';
import { getPublicSiteUrl } from '../utils/runtimeConfig';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** One reminder per boost window — the key carries the publication timestamp, so
 *  re-boosting makes the owner eligible for a fresh reminder next cycle. */
const REMINDER_KEY_PREFIX = 'profile-boost-reminder:';
const REMINDER_KEY_TTL_SECONDS = 3 * 24 * 60 * 60;

/** Only nudge once the boost is inside its last day. */
const REMINDER_WINDOW_DAYS = 1;

export interface ProfileBoostReminderResult {
    candidates: number;
    sent: number;
    skipped: number;
}

/**
 * Email owners whose boost lapses within the reminder window.
 *
 * Scope note: this is about *promotion*, not reachability. The page stays online and keeps
 * its URL when the boost lapses, so a mail that claims the page is about to go dark is
 * simply false — the reminder sells the directory placement and a one-tap renewal.
 *
 * Idempotent without a schema column: the Redis key is scoped to the specific publication,
 * taken with NX, and expires well after the window closes. If Redis is unavailable we skip
 * rather than risk emailing the same person every run — the in-app dashboard nudge still
 * covers them.
 */
export async function runProfileBoostReminders(
    now: Date = new Date()
): Promise<ProfileBoostReminderResult> {
    const publishedBefore = new Date(
        now.getTime() - (PROFILE_BOOST_DAYS - REMINDER_WINDOW_DAYS) * MS_PER_DAY
    );

    const profiles = await prisma.profile.findMany({
        where: {
            // Boosted (PROFILE_BOOST_DAYS - 1)..PROFILE_BOOST_DAYS days ago — still promoted,
            // about to lapse. `openToRecruiters` is required because a boost the owner never
            // opted into anything for is not worth an email.
            profilePublishedAt: { gt: profileBoostSince(now), lte: publishedBefore },
            openToRecruiters: true,
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
        const boostedAt = profile.profilePublishedAt;
        const { email, fullName, username } = profile.user;
        if (!boostedAt || !email || !username) {
            skipped += 1;
            continue;
        }

        try {
            const claimKey = `${REMINDER_KEY_PREFIX}${profile.userId}:${boostedAt.getTime()}`;
            const claimed = await redis.set(claimKey, '1', 'EX', REMINDER_KEY_TTL_SECONDS, 'NX');
            if (claimed !== 'OK') {
                skipped += 1;
                continue;
            }
        } catch (error) {
            logger.warn('[ProfileBoostReminder] Skipping — Redis unavailable for idempotency lock', {
                userId: profile.userId,
                error,
            });
            skipped += 1;
            continue;
        }

        const daysLeft = Math.max(
            1,
            Math.ceil((profileBoostEndsAt(boostedAt).getTime() - now.getTime()) / MS_PER_DAY)
        );

        await EmailService.sendProfileBoostReminder(email, fullName, {
            username,
            pageUrl: `${getPublicSiteUrl()}/u/${username}`,
            boostUrl: `${getPublicSiteUrl()}/account?tab=profile`,
            daysLeft,
        });
        sent += 1;
    }

    if (profiles.length > 0) {
        logger.info('[ProfileBoostReminder] Cycle complete', { candidates: profiles.length, sent, skipped });
    }

    return { candidates: profiles.length, sent, skipped };
}
