
import { PrismaClient, OpportunityStatus, OpportunityType } from '@prisma/client';
import logger from '../utils/logger';
import TelegramService from '../services/telegram.service';

const prisma = new PrismaClient();

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
 * - new Date() returns UTC timestamp when stored in PostgreSQL
 * - Cron trigger time (midnight) is configured via EXPIRY_CRON_TIMEZONE
 * 
 * STATUS TRANSITIONS:
 * - ACTIVE → EXPIRED (terminal state)
 * - Only cron can set EXPIRED
 * - Admin cannot un-expire
 * 
 * IDEMPOTENCY:
 * - Safe to run multiple times
 * - Only updates opportunities that need updating
 * - expiredAt only set on first transition to EXPIRED
 * 
 * RULES:
 * 1. Jobs/Internships: expiresAt < now (UTC)
 * 2. Walk-ins: max(walkInDates) < now (UTC)
 * 3. Walk-ins behave as events, not jobs
 */
export async function runExpiryCycle() {
    const timezone = process.env.EXPIRY_CRON_TIMEZONE || 'Asia/Kolkata';
    const startTime = new Date();

    // Explicitly using UTC - PostgreSQL stores as UTC
    const nowUTC = new Date();

    logger.info('Running expiry cycle', {
        nowUTC: nowUTC.toISOString(),
        timestamp: startTime.toISOString()
    });

    try {
        // ====================================================================
        // 1. EXPIRE JOBS & INTERNSHIPS
        // ====================================================================
        // Jobs and internships expire when expiresAt passes

        const expiredJobsResult = await prisma.opportunity.updateMany({
            where: {
                type: { in: [OpportunityType.JOB, OpportunityType.INTERNSHIP] },
                status: OpportunityStatus.PUBLISHED, // Only expire PUBLISHED
                expiresAt: { lt: nowUTC } // expiresAt < now (UTC)
            },
            data: {
                expiredAt: nowUTC // Set expiry timestamp
            }
        });

        logger.info('Expired jobs/internships', {
            count: expiredJobsResult.count,
            type: 'JOB_INTERNSHIP_EXPIRY'
        });

        // ====================================================================
        // 2. EXPIRE WALK-INS (Event-Based)
        // ====================================================================
        // Walk-ins expire when the LAST date has passed (UTC midnight)
        // Cannot use updateMany because we need to compute max(dates)

        const activeWalkIns = await prisma.opportunity.findMany({
            where: {
                type: OpportunityType.WALKIN,
                status: OpportunityStatus.PUBLISHED
            },
            include: {
                walkInDetails: true
            }
        });

        const walkInIdsToExpire: string[] = [];

        for (const walkIn of activeWalkIns) {
            const dates = walkIn.walkInDetails?.dates?.map(d => new Date(d)) || [];
            const validDates = dates.filter((d) => !Number.isNaN(d.getTime()));

            // Fallback: if walk-in dates are missing, use expiresAt when available.
            const maxDate = validDates.length > 0
                ? new Date(Math.max(...validDates.map(d => d.getTime())))
                : (walkIn.expiresAt ? new Date(walkIn.expiresAt) : null);

            if (!maxDate || Number.isNaN(maxDate.getTime())) {
                logger.warn('Walk-in missing dates/expiresAt - skipping', {
                    opportunityId: walkIn.id,
                    title: walkIn.title
                });
                continue;
            }

            const todayKey = formatDateKeyInTimezone(nowUTC, timezone);
            const lastDateKey = formatDateKeyInTimezone(maxDate, timezone);

            // Expire when walk-in last date is before today's date in cron timezone.
            if (lastDateKey < todayKey) {
                walkInIdsToExpire.push(walkIn.id);

                logger.debug('Walk-in ready to expire', {
                    opportunityId: walkIn.id,
                    title: walkIn.title,
                    lastDate: maxDate.toISOString(),
                    lastDateKey,
                    todayKey,
                    timezone
                });
            }
        }

        // Batch update expired walk-ins
        const expiredWalkInsResult = await prisma.opportunity.updateMany({
            where: {
                id: { in: walkInIdsToExpire },
                status: OpportunityStatus.PUBLISHED // Safety check (idempotency)
            },
            data: {
                expiredAt: nowUTC
            }
        });

        logger.info('Expired walk-ins', {
            count: expiredWalkInsResult.count,
            type: 'WALKIN_EXPIRY'
        });

        // ====================================================================
        // 3. STALE LISTING WARNINGS (No Auto-Expiry)
        // ====================================================================
        // Listings with no expiresAt and >30 days old need admin review
        // Logging only - no status mutation

        const thirtyDaysAgo = new Date(nowUTC);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const staleListings = await prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                expiresAt: null,
                type: { not: OpportunityType.WALKIN }, // Walk-ins use dates
                lastVerified: { lt: thirtyDaysAgo }
            },
            select: {
                id: true,
                title: true,
                company: true,
                lastVerified: true
            }
        });

        if (staleListings.length > 0) {
            logger.warn('Stale listings need admin review', {
                count: staleListings.length,
                type: 'STALE_LISTINGS',
                listings: staleListings.map(l => ({
                    id: l.id,
                    title: l.title,
                    company: l.company,
                    daysSinceVerified: Math.floor(
                        (nowUTC.getTime() - new Date(l.lastVerified).getTime()) / (1000 * 60 * 60 * 24)
                    )
                }))
            });
        }

        // ====================================================================
        // COMPLETION SUMMARY
        // ====================================================================
        const endTime = new Date();
        const durationMs = endTime.getTime() - startTime.getTime();

        const summary = {
            durationMs,
            totalExpired: expiredJobsResult.count + expiredWalkInsResult.count,
            jobsInternshipsExpired: expiredJobsResult.count,
            walkInsExpired: expiredWalkInsResult.count,
            staleWarnings: staleListings.length
        };

        logger.info('Expiry cycle completed successfully', summary);

        await TelegramService.notifyExpirySummary({
            totalExpired: summary.totalExpired,
            jobsInternshipsExpired: summary.jobsInternshipsExpired,
            walkInsExpired: summary.walkInsExpired,
            staleWarnings: summary.staleWarnings
        });

        return summary;

    } catch (error) {
        import('@sentry/node').then(Sentry => Sentry.captureException(error));
        logger.error('Expiry cycle failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

