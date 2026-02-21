import prisma from '../lib/prisma';
import { OpportunityStatus, LinkHealth } from '@prisma/client';
import logger from '../utils/logger';
import TelegramService from './telegram.service';



// Bot Configuration
const MAX_FAILURES = 3; // Quarantine after 3 hard fails
const REQUEST_TIMEOUT = 8000; // 8 seconds per ping
const SOFT_FAIL_STATUSES = new Set([401, 403, 429, 503]);

type LinkCheckResult = 'HEALTHY' | 'SOFT_FAIL' | 'HARD_FAIL';

type VerificationRunResult = {
    processed: number;
    healthy: number;
    softFailures: number;
    hardFailures: number;
    archived: number;
    duration: number;
    runAt: string;
};

type VerificationStats = {
    totalRuns: number;
    totalProcessed: number;
    totalHealthy: number;
    totalSoftFailures: number;
    totalHardFailures: number;
    totalArchived: number;
    successRate: number;
    lastRun: VerificationRunResult | null;
};

const verificationStats: VerificationStats = {
    totalRuns: 0,
    totalProcessed: 0,
    totalHealthy: 0,
    totalSoftFailures: 0,
    totalHardFailures: 0,
    totalArchived: 0,
    successRate: 0,
    lastRun: null
};

/**
 * Verification Bot Service
 * Performs lightweight health pings on published listings.
 */
export async function runLinkVerification() {
    const startTime = Date.now();
    logger.info('Verification Bot: initiating link health scan');

    try {
        // Fetch published opportunities not verified recently or already retrying.
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

        const opportunities = await prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [
                    { lastVerifiedAt: { lt: twelveHoursAgo } },
                    { linkHealth: LinkHealth.RETRYING }
                ]
            },
            select: {
                id: true,
                title: true,
                company: true,
                applyLink: true,
                verificationFailures: true
            },
            take: 50
        });

        logger.info(`Verification Bot: found ${opportunities.length} candidates for verification`);

        let processed = 0;
        let healthy = 0;
        let softFailures = 0;
        let hardFailures = 0;
        let archived = 0;

        for (const opp of opportunities) {
            if (!opp.applyLink) continue;

            const checkResult = await pingUrl(opp.applyLink);
            processed++;

            if (checkResult === 'HEALTHY') {
                healthy++;
                await prisma.opportunity.update({
                    where: { id: opp.id },
                    data: {
                        linkHealth: LinkHealth.HEALTHY,
                        verificationFailures: 0,
                        lastVerifiedAt: new Date(),
                        lastVerified: new Date()
                    }
                });
                continue;
            }

            if (checkResult === 'SOFT_FAIL') {
                // Keep retrying for protected/rate-limited links without adding hard failures.
                softFailures++;
                await prisma.opportunity.update({
                    where: { id: opp.id },
                    data: {
                        linkHealth: LinkHealth.RETRYING,
                        lastVerifiedAt: new Date()
                    }
                });
                continue;
            }

            hardFailures++;
            const newFailures = opp.verificationFailures + 1;
            const shouldArchive = newFailures >= MAX_FAILURES;
            if (shouldArchive) archived++;

            logger.warn(`Verification Bot: link failed for "${opp.title}" @ ${opp.company}. failures=${newFailures}`);

            await prisma.opportunity.update({
                where: { id: opp.id },
                data: {
                    verificationFailures: newFailures,
                    linkHealth: shouldArchive ? LinkHealth.BROKEN : LinkHealth.RETRYING,
                    lastVerifiedAt: new Date(),
                    ...(shouldArchive ? { status: OpportunityStatus.ARCHIVED } : {})
                }
            });

            if (shouldArchive) {
                await TelegramService.notifyLinkArchived(
                    opp.title,
                    opp.company,
                    opp.id,
                    newFailures
                );
            }
        }

        const duration = (Date.now() - startTime) / 1000;
        verificationStats.totalRuns += 1;
        verificationStats.totalProcessed += processed;
        verificationStats.totalHealthy += healthy;
        verificationStats.totalSoftFailures += softFailures;
        verificationStats.totalHardFailures += hardFailures;
        verificationStats.totalArchived += archived;
        verificationStats.successRate = verificationStats.totalProcessed > 0
            ? Number(((verificationStats.totalHealthy / verificationStats.totalProcessed) * 100).toFixed(2))
            : 0;
        verificationStats.lastRun = {
            processed,
            healthy,
            softFailures,
            hardFailures,
            archived,
            duration,
            runAt: new Date().toISOString()
        };

        logger.info(`Verification Bot: scan complete processed=${processed} healthy=${healthy} softFailures=${softFailures} hardFailures=${hardFailures} archived=${archived} duration=${duration}s`);

        return { processed, healthy, softFailures, hardFailures, archived, duration };
    } catch (error) {
        logger.error('Verification Bot error:', error);
        throw error;
    }
}

export function getVerificationStats(): VerificationStats {
    return verificationStats;
}

/**
 * Lightweight request to check if a URL exists.
 */
async function pingUrl(url: string): Promise<LinkCheckResult> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'FresherFlow-VerificationBot/1.0 (+https://fresherflow.in)'
            }
        });

        clearTimeout(timeoutId);
        if (response.ok || (response.status >= 300 && response.status < 400)) return 'HEALTHY';
        if (SOFT_FAIL_STATUSES.has(response.status)) return 'SOFT_FAIL';
        return 'HARD_FAIL';
    } catch {
        // If HEAD fails, try GET with range (some sites block HEAD).
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'FresherFlow-VerificationBot/1.0 (+https://fresherflow.in)',
                    'Range': 'bytes=0-0'
                }
            });

            clearTimeout(timeoutId);
            if (response.ok || (response.status >= 300 && response.status < 400)) return 'HEALTHY';
            if (SOFT_FAIL_STATUSES.has(response.status)) return 'SOFT_FAIL';
            return 'HARD_FAIL';
        } catch {
            return 'HARD_FAIL';
        }
    }
}

