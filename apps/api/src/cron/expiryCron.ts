import { prisma } from '@fresherflow/database';
import { OpportunityStatus, OpportunityCategory, RecruitmentMethod } from '@fresherflow/types';
import { logger } from '@fresherflow/utils';
import TelegramService from '../infrastructure/services/telegram.service';
import { StaticFeedService } from '../infrastructure/services/staticFeed.service';
import { expireJobNotifyEngagedUsers } from '../infrastructure/services/community.service';
import { runProfilePageExpiryReminders } from './profilePageReminder';

function formatDateKeyInTimezone(date: Date, timezone: string): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(date);
}

/**
 * ============================================================================
 * EXPIRY CRON JOB - Production-Correct Implementation
 * ============================================================================
 *
 * TIME MODEL (Non-Negotiable):
 * - All expiry calculations use UTC time
 * - Database stores timestamps in UTC
 * - Cron trigger time (midnight) is configured via EXPIRY_CRON_TIMEZONE
 *
 * IDEMPOTENCY:
 * - Safe to run multiple times
 * - Prunes old data (Free Tier Storage Safety)
 */
export async function runExpiryCycle() {
    const timezone = process.env.EXPIRY_CRON_TIMEZONE || 'Asia/Kolkata';
    const startTime = new Date();
    const nowUTC = new Date();

    logger.info('Running expiry cycle', {
        nowUTC: nowUTC.toISOString(),
    });

    try {
        // 1. EXPIRE BY EXPLICIT EXPIRY + ALL DEADLINE AXES (all categories)
        // Phase 5: competitions close on registrationDeadline, employment on
        // applicationDeadline, everything on expiresAt/endsAt. The old cron
        // only expired EMPLOYMENT rows via expiresAt, so scholarships and
        // competitions stayed live forever after their deadline.
        const expiredByDeadlineResult = await prisma.opportunity.updateMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                expiredAt: null,
                OR: [
                    { expiresAt: { lt: nowUTC } },
                    { registrationDeadline: { lt: nowUTC } },
                    { applicationDeadline: { lt: nowUTC } },
                    { endsAt: { lt: nowUTC } },
                ],
            },
            data: {
                expiredAt: nowUTC
            }
        });

        // 1b. Legacy narrow pass kept for alert parity: notify engaged users
        // about newly expired employment rows.
        const expiredJobsResult = expiredByDeadlineResult;

        // Notify engaged users about expired jobs
        if (expiredJobsResult.count > 0) {
            const expiredOpps = await prisma.opportunity.findMany({
                where: {
                    category: OpportunityCategory.EMPLOYMENT,
                    status: OpportunityStatus.PUBLISHED,
                    expiredAt: { gte: startTime },
                },
                select: { id: true }
            });
            for (const opp of expiredOpps) {
                await expireJobNotifyEngagedUsers(opp.id).catch(() => {});
            }
        }

        // 2. EXPIRE WALK-INS
        const activeWalkIns = await prisma.opportunity.findMany({
            where: {
                recruitmentMethod: RecruitmentMethod.WALK_IN,
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null
            },
            include: { driveDetails: true }
        });

        const walkInIdsToExpire: string[] = [];
        for (const walkIn of activeWalkIns) {
            const walkInDates = Array.isArray(walkIn.driveDetails?.dates)
                ? (walkIn.driveDetails.dates as Array<string | Date>)
                : [];
            const dates = walkInDates.map((dateValue) => new Date(dateValue));
            const validDates = dates.filter((d: Date) => !Number.isNaN(d.getTime()));
            const maxDate = validDates.length > 0
                ? new Date(Math.max(...validDates.map(d => d.getTime())))
                : (walkIn.expiresAt instanceof Date ? new Date(walkIn.expiresAt) : null);

            if (!maxDate) continue;

            const todayKey = formatDateKeyInTimezone(nowUTC, timezone);
            const lastDateKey = formatDateKeyInTimezone(maxDate, timezone);

            if (lastDateKey < todayKey) {
                walkInIdsToExpire.push(String(walkIn.id));
            }
        }

        const expiredWalkInsResult = await prisma.opportunity.updateMany({
            // deletedAt: null throughout: the expiry cycle must not stamp
            // expiredAt onto a listing an admin has already removed, and the
            // stale-warning count must not report removed listings as actionable.
            // expiredAt: null keeps the cycle idempotent across reruns.
            where: { id: { in: walkInIdsToExpire }, status: OpportunityStatus.PUBLISHED, deletedAt: null, expiredAt: null },
            data: { expiredAt: nowUTC }
        });

        // 3. STALE WARNINGS
        const staleListingDays = Number(process.env.STALE_LISTING_DAYS || 30);
        const staleThreshold = new Date(nowUTC);
        staleThreshold.setDate(staleThreshold.getDate() - staleListingDays);

        const staleListings = await prisma.opportunity.count({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                expiresAt: null,
                recruitmentMethod: { not: RecruitmentMethod.WALK_IN },
                lastVerified: { lt: staleThreshold }
            }
        });

        // 4. DATABASE PRUNING (Free Tier Storage Safety)
        // Prune RawOpportunity and AlertDispatchLog thresholds
        const rawPruneDays = Number(process.env.PRUNE_RAW_OPPORTUNITY_DAYS || 14);
        const logsPruneDays = Number(process.env.PRUNE_LOGS_DAYS || 30);

        const rawPruneThreshold = new Date(nowUTC);
        rawPruneThreshold.setDate(rawPruneThreshold.getDate() - rawPruneDays);

        const logsPruneThreshold = new Date(nowUTC);
        logsPruneThreshold.setDate(logsPruneThreshold.getDate() - logsPruneDays);

        const rawPruned = await prisma.rawOpportunity.deleteMany({
            where: { createdAt: { lt: rawPruneThreshold } }
        });
        const logsPruned = await prisma.alertDispatchLog.deleteMany({
            where: { createdAt: { lt: logsPruneThreshold } }
        });

        // Expired refresh tokens are dead weight: they can never authenticate, and
        // the table only grows because rotation adds a row per refresh. Keep a
        // short grace window past expiry for forensics, then delete.
        const refreshTokenPruneDays = Number(process.env.PRUNE_REFRESH_TOKENS_DAYS || 7);
        const refreshTokenPruneThreshold = new Date(nowUTC);
        refreshTokenPruneThreshold.setDate(
            refreshTokenPruneThreshold.getDate() - refreshTokenPruneDays
        );
        const refreshTokensPruned = await prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: refreshTokenPruneThreshold } }
        });

        // 5. PUBLIC PAGE ACTIVATION REMINDERS
        // A public page lapses when its activation window closes, so warn owners inside
        // the last day. Isolated: a failure here must never break job expiry.
        let profilePageReminders = { candidates: 0, sent: 0, skipped: 0 };
        try {
            profilePageReminders = await runProfilePageExpiryReminders(nowUTC);
        } catch (error) {
            logger.error('Profile page reminder cycle failed', error);
        }

        const endTime = new Date();
        const durationMs = endTime.getTime() - startTime.getTime();

        const summary = {
            durationMs,
            totalExpired: expiredJobsResult.count + expiredWalkInsResult.count,
            staleWarnings: staleListings,
            pruned: { raw: rawPruned.count, logs: logsPruned.count, refreshTokens: refreshTokensPruned.count },
            profilePageReminders
        };

        logger.info('Expiry cycle completed successfully', summary);

        await TelegramService.notifyExpirySummary({
            totalExpired: summary.totalExpired,
            jobsInternshipsExpired: expiredJobsResult.count,
            walkInsExpired: expiredWalkInsResult.count,
            staleWarnings: summary.staleWarnings,
            prunedCount: rawPruned.count + logsPruned.count + refreshTokensPruned.count
        });

        // Trigger bootstrap feed refresh if anything expired
        if (summary.totalExpired > 0) {
            void StaticFeedService.refresh();
        }

        return summary;

    } catch (error) {
        logger.error('Expiry cycle failed', error);
        throw error;
    }
}
