import { prisma } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { logger } from '@fresherflow/logger';
import TelegramService from '../infrastructure/services/telegram.service';
import { StaticFeedService } from '../infrastructure/services/staticFeed.service';

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
        // 1. EXPIRE JOBS & INTERNSHIPS
        const expiredJobsResult = await prisma.opportunity.updateMany({
            where: {
                type: { in: [OpportunityType.JOB, OpportunityType.INTERNSHIP] },
                status: OpportunityStatus.PUBLISHED,
                expiresAt: { lt: nowUTC }
            },
            data: {
                expiredAt: nowUTC
            }
        });

        // 2. EXPIRE WALK-INS
        const activeWalkIns = await prisma.opportunity.findMany({
            where: {
                type: OpportunityType.WALKIN,
                status: OpportunityStatus.PUBLISHED
            },
            include: { walkInDetails: true }
        });

        const walkInIdsToExpire: string[] = [];
        for (const walkIn of activeWalkIns) {
            const walkInDates = Array.isArray(walkIn.walkInDetails?.dates)
                ? (walkIn.walkInDetails.dates as Array<string | Date>)
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
            where: { id: { in: walkInIdsToExpire }, status: OpportunityStatus.PUBLISHED },
            data: { expiredAt: nowUTC }
        });

        // 3. STALE WARNINGS
        const staleListingDays = Number(process.env.STALE_LISTING_DAYS || 30);
        const staleThreshold = new Date(nowUTC);
        staleThreshold.setDate(staleThreshold.getDate() - staleListingDays);

        const staleListings = await prisma.opportunity.count({
            where: {
                status: OpportunityStatus.PUBLISHED,
                expiresAt: null,
                type: { not: OpportunityType.WALKIN },
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

        const endTime = new Date();
        const durationMs = endTime.getTime() - startTime.getTime();

        const summary = {
            durationMs,
            totalExpired: expiredJobsResult.count + expiredWalkInsResult.count,
            staleWarnings: staleListings,
            pruned: { raw: rawPruned.count, logs: logsPruned.count }
        };

        logger.info('Expiry cycle completed successfully', summary);

        await TelegramService.notifyExpirySummary({
            totalExpired: summary.totalExpired,
            jobsInternshipsExpired: expiredJobsResult.count,
            walkInsExpired: expiredWalkInsResult.count,
            staleWarnings: summary.staleWarnings,
            prunedCount: rawPruned.count + logsPruned.count
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
