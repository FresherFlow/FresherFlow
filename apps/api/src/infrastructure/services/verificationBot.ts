import prisma from '../../infrastructure/database/prisma';
import { LinkHealth } from '@fresherflow/database';
import { OpportunityStatus, Opportunity } from '@fresherflow/types';
import { logger } from '@fresherflow/logger';
import TelegramService from './telegram.service';
import { calculateTrendingScore } from '@fresherflow/domain';

// ── Bot Configuration ─────────────────────────────────────────────────────────
const MAX_HARD_FAILURES = 5;
const MAX_SOFT_FAILURES = 7;
const REQUEST_TIMEOUT = 10000;

const SOFT_FAIL_STATUSES = new Set([401, 429, 502, 503, 504]);

const VERIFICATION_BOT_CONTACT_URL =
    process.env.SITE_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000';
const VERIFICATION_BOT_USER_AGENT = `FresherFlow-VerificationBot/1.0 (+${VERIFICATION_BOT_CONTACT_URL})`;
const DEFAULT_VERIFICATION_LOOKBACK_HOURS = 72;
const DEFAULT_VERIFICATION_BATCH_SIZE = 20;

// ── Types ─────────────────────────────────────────────────────────────────────
type LinkCheckResult = 'HEALTHY' | 'SOFT_FAIL' | 'HARD_FAIL';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getVerificationUrl(opportunity: Opportunity): string | null {
    const applyLink = typeof opportunity.applyLink === 'string' ? opportunity.applyLink.trim() : '';
    if (applyLink) return applyLink;
    const sourceLink = typeof opportunity.sourceLink === 'string' ? opportunity.sourceLink.trim() : '';
    return sourceLink || null;
}

// ── Main Run ──────────────────────────────────────────────────────────────────
export async function runLinkVerification() {
    const startTime = Date.now();
    logger.info('Verification Bot: initiating link health scan');

    try {
        const verificationLookbackHours = Number(process.env.VERIFICATION_LOOKBACK_HOURS || DEFAULT_VERIFICATION_LOOKBACK_HOURS);
        const verificationBatchSize = Number(process.env.VERIFICATION_BATCH_SIZE || DEFAULT_VERIFICATION_BATCH_SIZE);
        const verificationThreshold = new Date(Date.now() - verificationLookbackHours * 60 * 60 * 1000);

        const opportunities = await prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [
                    { lastVerifiedAt: { lt: verificationThreshold } },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    { lastVerifiedAt: null as any },
                    { linkHealth: LinkHealth.RETRYING }
                ]
            },
            orderBy: [
                { lastVerifiedAt: 'asc' },
                { postedAt: 'asc' }
            ],
            take: verificationBatchSize
        }) as unknown as Opportunity[];

        logger.info(`Verification Bot: found ${opportunities.length} candidates for verification`);

        let processed = 0, healthy = 0, softFailures = 0, hardFailures = 0, archived = 0;

        for (const opp of opportunities) {
            const verificationUrl = getVerificationUrl(opp);
            if (!verificationUrl) continue;

            const checkResult = await pingUrl(verificationUrl);
            processed++;

            if (checkResult === 'HEALTHY') {
                healthy++;

                const newTrendingScore = calculateTrendingScore({
                    shares: opp.sharesCount || 0,
                    saves: opp.savesCount || 0,
                    clicks: opp.clicksCount || 0,
                    postedAt: opp.postedAt,
                    isVerified: true
                });

                await prisma.opportunity.update({
                    where: { id: opp.id as string },
                    data: {
                        linkHealth: LinkHealth.HEALTHY,
                        verificationFailures: 0,
                        lastVerifiedAt: new Date(),
                        lastVerified: new Date(),
                        trendingScore: newTrendingScore
                    }
                });
                continue;
            }

            if (checkResult === 'SOFT_FAIL') {
                const newFailures = (opp.verificationFailures || 0) + 1;
                const shouldArchive = newFailures >= MAX_SOFT_FAILURES;
                softFailures++;
                if (shouldArchive) archived++;

                await prisma.opportunity.update({
                    where: { id: opp.id as string },
                    data: {
                        linkHealth: shouldArchive ? LinkHealth.BROKEN : LinkHealth.RETRYING,
                        verificationFailures: newFailures,
                        lastVerifiedAt: new Date(),
                        ...(shouldArchive ? { status: OpportunityStatus.ARCHIVED } : {})
                    }
                });

                if (shouldArchive) {
                    await TelegramService.notifyLinkArchived(opp.title, opp.company, opp.id, newFailures);
                }
                continue;
            }

            // HARD_FAIL
            hardFailures++;
            const newFailures = (opp.verificationFailures || 0) + 1;
            const shouldArchive = newFailures >= MAX_HARD_FAILURES;
            if (shouldArchive) archived++;

            await prisma.opportunity.update({
                where: { id: opp.id as string },
                data: {
                    verificationFailures: newFailures,
                    linkHealth: shouldArchive ? LinkHealth.BROKEN : LinkHealth.RETRYING,
                    lastVerifiedAt: new Date(),
                    ...(shouldArchive ? { status: OpportunityStatus.ARCHIVED } : {})
                }
            });

            if (shouldArchive) {
                await TelegramService.notifyLinkArchived(opp.title, opp.company, opp.id, newFailures);
            }
        }

        const duration = (Date.now() - startTime) / 1000;
        logger.info(`Verification Bot: done processed=${processed} healthy=${healthy} duration=${duration}s`);

        const runResult = { processed, healthy, softFailures, hardFailures, archived, duration, runAt: new Date().toISOString() };
        verificationStats.totalRuns += 1;
        verificationStats.totalProcessed += processed;
        verificationStats.totalHealthy += healthy;
        verificationStats.totalSoftFailures += softFailures;
        verificationStats.totalHardFailures += hardFailures;
        verificationStats.totalArchived += archived;
        verificationStats.lastRun = runResult;

        return runResult;

    } catch (error) {
        logger.error('Verification Bot error:', error);
        throw error;
    }
}

export function getVerificationStats() {
    return {
        ...verificationStats,
        successRate: verificationStats.totalProcessed > 0
            ? Number(((verificationStats.totalHealthy / verificationStats.totalProcessed) * 100).toFixed(2))
            : 0
    };
}

const verificationStats = {
    totalRuns: 0,
    totalProcessed: 0,
    totalHealthy: 0,
    totalSoftFailures: 0,
    totalHardFailures: 0,
    totalArchived: 0,
    lastRun: null as {
        processed: number;
        healthy: number;
        softFailures: number;
        hardFailures: number;
        archived: number;
        duration: number;
        runAt: string;
    } | null
};


async function pingUrl(url: string): Promise<LinkCheckResult> {
    try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);

        const res = await fetch(url, {
            method: 'HEAD',
            signal: ctrl.signal,
            redirect: 'follow',
            headers: { 'User-Agent': VERIFICATION_BOT_USER_AGENT }
        });
        clearTimeout(tid);

        if (res.ok || (res.status >= 300 && res.status < 400)) return 'HEALTHY';
        if (res.status === 404 || res.status === 410) return 'HARD_FAIL';
        if (SOFT_FAIL_STATUSES.has(res.status)) return 'SOFT_FAIL';
        return 'HARD_FAIL';
    } catch {
        // Fallback or assume soft fail for network glitches
        return 'SOFT_FAIL';
    }
}
