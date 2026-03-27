import prisma from '../../infrastructure/database/prisma';
import { LinkHealth } from '@fresherflow/database';
import { OpportunityStatus } from '@fresherflow/types';
import { logger } from '@fresherflow/logger';
import TelegramService from './telegram.service';

// ── Bot Configuration ─────────────────────────────────────────────────────────
const MAX_HARD_FAILURES = 5; // Archive after 5 consecutive hard fails (was 3 — too aggressive)
const MAX_SOFT_FAILURES = 7; // Archive after 7 soft fails (rate-limits, WAF blocks)
const REQUEST_TIMEOUT = 10000; // 10s

// 403 deliberately excluded: many valid ATS portals (Workday, SuccessFactors)
// return 403 to bots even when the job is live. Treating it as soft-fail avoids
// false-positive archiving.
const SOFT_FAIL_STATUSES = new Set([401, 429, 502, 503, 504]);

const VERIFICATION_BOT_CONTACT_URL =
    process.env.SITE_URL ||
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_WEB_URL ||
    'http://localhost:3000';
const VERIFICATION_BOT_USER_AGENT = `FresherFlow-VerificationBot/1.0 (+${VERIFICATION_BOT_CONTACT_URL})`;
const DEFAULT_VERIFICATION_LOOKBACK_HOURS = process.env.NODE_ENV === 'production' ? 72 : 12;
const DEFAULT_VERIFICATION_BATCH_SIZE = process.env.NODE_ENV === 'production' ? 20 : 50;

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function getVerificationUrl(opportunity: {
    applyLink?: string | null;
    sourceLink?: string | null;
}): string | null {
    const applyLink = typeof opportunity.applyLink === 'string' ? opportunity.applyLink.trim() : '';
    if (applyLink) return applyLink;
    const sourceLink = typeof opportunity.sourceLink === 'string' ? opportunity.sourceLink.trim() : '';
    return sourceLink || null;
}

// ── Main Run ──────────────────────────────────────────────────────────────────
/**
 * Verification Bot Service
 * Performs link health scans on all published listings.
 */
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
            select: {
                id: true,
                title: true,
                company: true,
                applyLink: true,
                sourceLink: true,
                verificationFailures: true
            },
            orderBy: [
                { lastVerifiedAt: 'asc' },
                { postedAt: 'asc' }
            ],
            take: verificationBatchSize
        });

        logger.info(`Verification Bot: found ${opportunities.length} candidates for verification`, {
            verificationLookbackHours,
            verificationBatchSize,
        });

        let processed = 0, healthy = 0, softFailures = 0, hardFailures = 0, archived = 0;

        for (const opp of opportunities) {
            const verificationUrl = getVerificationUrl(opp);
            if (!verificationUrl) {
                logger.warn(`Verification Bot: skipping "${opp.title}" — no URL`);
                continue;
            }

            const checkResult = await pingUrl(verificationUrl);
            processed++;

            if (checkResult === 'HEALTHY') {
                healthy++;
                await prisma.opportunity.update({
                    where: { id: String(opp.id) },
                    data: {
                        linkHealth: LinkHealth.HEALTHY,
                        verificationFailures: 0,
                        lastVerifiedAt: new Date(),
                        lastVerified: new Date()
                    }
                });
                logger.info(`Verification Bot: ✓ healthy — "${opp.title}"`);
                continue;
            }

            if (checkResult === 'SOFT_FAIL') {
                const newFailures = Number(opp.verificationFailures ?? 0) + 1;
                const shouldArchive = newFailures >= MAX_SOFT_FAILURES;
                softFailures++;
                if (shouldArchive) archived++;

                await prisma.opportunity.update({
                    where: { id: String(opp.id) },
                    data: {
                        linkHealth: shouldArchive ? LinkHealth.BROKEN : LinkHealth.RETRYING,
                        verificationFailures: newFailures,
                        lastVerifiedAt: new Date(),
                        ...(shouldArchive ? { status: OpportunityStatus.ARCHIVED } : {})
                    }
                });
                logger.warn(`Verification Bot: ~ soft-fail "${opp.title}" failures=${newFailures}/${MAX_SOFT_FAILURES}${shouldArchive ? ' [ARCHIVING]' : ''}`);

                if (shouldArchive) {
                    await TelegramService.notifyLinkArchived(String(opp.title), String(opp.company), String(opp.id), newFailures);
                }
                continue;
            }

            // HARD_FAIL
            hardFailures++;
            const newFailures = Number(opp.verificationFailures ?? 0) + 1;
            const shouldArchive = newFailures >= MAX_HARD_FAILURES;
            if (shouldArchive) archived++;

            logger.warn(`Verification Bot: ✗ hard-fail "${opp.title}" @ ${opp.company} failures=${newFailures}/${MAX_HARD_FAILURES}${shouldArchive ? ' [ARCHIVING]' : ''}`);

            await prisma.opportunity.update({
                where: { id: String(opp.id) },
                data: {
                    verificationFailures: newFailures,
                    linkHealth: shouldArchive ? LinkHealth.BROKEN : LinkHealth.RETRYING,
                    lastVerifiedAt: new Date(),
                    ...(shouldArchive ? { status: OpportunityStatus.ARCHIVED } : {})
                }
            });

            if (shouldArchive) {
                await TelegramService.notifyLinkArchived(String(opp.title), String(opp.company), String(opp.id), newFailures);
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
            processed, healthy, softFailures, hardFailures, archived, duration,
            runAt: new Date().toISOString()
        };

        logger.info(`Verification Bot: done processed=${processed} healthy=${healthy} soft=${softFailures} hard=${hardFailures} archived=${archived} duration=${duration}s`);
        return { processed, healthy, softFailures, hardFailures, archived, duration };

    } catch (error) {
        logger.error('Verification Bot error:', error);
        throw error;
    }
}

export function getVerificationStats(): VerificationStats {
    return verificationStats;
}

// ── Closed-job detection ─────────────────────────────────────────────────────

const CLOSED_URL_INDICATORS = [
    'closedjob', 'job-closed', '/404', 'notfound', 'not-found',
    'unavailable', 'no-longer-available', 'position-closed', 'expired'
];

const CLOSED_BODY_INDICATORS = [
    "you can't view this job because it's not available at this time",
    "this job is no longer available",
    "this position is no longer available",
    "job has been closed",
    "position has been filled",
    "no longer accepting applications",
    "this position is no longer accepting",
    "this job listing has expired",
    "this job has expired",
    "position is closed",
    "job posting has been removed",
    "this vacancy has been closed",
    "application for this job is closed",
    "not currently hiring",
];

function isRedirectedToClosedPage(finalUrl: string): boolean {
    const lower = finalUrl.toLowerCase();
    return CLOSED_URL_INDICATORS.some(i => lower.includes(i));
}

function containsClosedText(html: string): boolean {
    const lower = html.toLowerCase();
    return CLOSED_BODY_INDICATORS.some(i => lower.includes(i));
}

// ── Ping Logic ────────────────────────────────────────────────────────────────
/**
 * Strategy: try HEAD first (fast, no body download).
 * If HEAD is unsupported (405/501) or network fails, fall back to GET + body scan.
 *
 * 403: treated as SOFT_FAIL — many valid ATS sites WAF-block bots.
 *      Only promotes to HARD_FAIL if GET body confirms job is closed.
 */
async function pingUrl(url: string): Promise<LinkCheckResult> {
    // ── HEAD attempt ──────────────────────────────────────────────────────────
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

        if (res.url && isRedirectedToClosedPage(res.url)) return 'HARD_FAIL';
        if (res.ok || (res.status >= 300 && res.status < 400)) return 'HEALTHY';
        if (res.status === 404 || res.status === 410) return 'HARD_FAIL';
        if (res.status === 405 || res.status === 501) {
            // HEAD not allowed by server — fall through to GET
        } else if (res.status === 403) {
            // WAF/bot block — soft-fail, fall through to GET for confirmation
        } else if (SOFT_FAIL_STATUSES.has(res.status)) {
            return 'SOFT_FAIL';
        } else {
            return 'HARD_FAIL';
        }
    } catch {
        // Network error/timeout — fall through to GET
    }

    // ── GET fallback ──────────────────────────────────────────────────────────
    try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);

        const res = await fetch(url, {
            method: 'GET',
            signal: ctrl.signal,
            redirect: 'follow',
            headers: { 'User-Agent': VERIFICATION_BOT_USER_AGENT }
        });
        clearTimeout(tid);

        if (res.url && isRedirectedToClosedPage(res.url)) return 'HARD_FAIL';

        if (res.ok || (res.status >= 300 && res.status < 400)) {
            try {
                const html = await res.text();
                if (containsClosedText(html)) return 'HARD_FAIL';
            } catch { /* ignore parse errors */ }
            return 'HEALTHY';
        }

        if (res.status === 403) return 'SOFT_FAIL'; // bot-blocked, not necessarily closed
        if (res.status === 404 || res.status === 410) return 'HARD_FAIL';
        if (SOFT_FAIL_STATUSES.has(res.status)) return 'SOFT_FAIL';

        return 'HARD_FAIL';
    } catch {
        return 'HARD_FAIL';
    }
}
