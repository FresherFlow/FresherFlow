import prisma from '../../infrastructure/database/prisma';
import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { runLinkVerification } from '../../infrastructure/services/opportunity/verificationBot';
import { getObservabilityMetrics } from '../../middleware/observability';
import { TelegramBroadcastStatus } from '@fresherflow/database';
import { runAlertsCycle } from '../../infrastructure/services/alerts/alerts.service';
import { getAdminMetricsV2, MetricsWindow } from '../../infrastructure/services/platform/adminMetrics.service';
import { getAdminDeliveryControls, updateAdminDeliveryControls } from '../../infrastructure/services/platform/adminDeliveryControl.service';
import { StaticFeedService } from '../../infrastructure/services/opportunity/staticFeed.service';
import { redis } from '@fresherflow/database';
import { enqueueCacheRevalidation } from '@fresherflow/queue';
import { logger } from '@fresherflow/utils';
import { deliverFeedRevalidation } from '../../infrastructure/services/opportunity/webRevalidation.service';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { adminRateLimit } from '../../middleware/adminRateLimit';

const router = Router();

// --- Shared helpers ---
const METRICS_WINDOWS: MetricsWindow[] = ['24h', '7d', '14d', '30d'];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PUBLIC_WEB_CACHE_TAGS = [
    'feed-version',
    'homepage-feed',
    'government-feed',
    'expired-feed',
    'category-shards',
    'company-shards',
    'companies-metadata',
    'education-metadata',
    'skills-metadata',
    'sitemap-data',
];

// ⚠️  ISR WRITE SAFETY — READ BEFORE EDITING THIS FILE
// Hub/list pages (/jobs, /internships, /walk-ins, /remote, etc.) are powered by the CDN
// JSON feed (R2). They do NOT need revalidatePath(). They update lazily via tag invalidation
// (stale-while-revalidate = zero ISR writes on the call itself).
//
// NEVER pass hub/list page paths to /api/revalidate. Doing so caused a 20k+ ISR write
// spike (commit 8b1cc2d). Only job detail slugs (e.g. /some-job-title-abc123) may use
// revalidatePath() — and only from publicOpportunityCache.service.ts.
//
// Rule: feed revalidation = tags only. Slug revalidation = revalidatePath (one-off per job).
// Must cover every tag the web readers cache under (see cdnFeed.ts): the
// feed-index tag powers /jobs list pages, so omitting it left the pre-regen
// index served from Next's data cache after every regeneration.
const FEED_REVALIDATE_TAGS = [
    'feed-version',
    'homepage-feed',
    'feed-index',
    'government-feed',
    'expired-feed',
    'companies-metadata',
    // Redirect/ever-published map for /companies/{slug}. Without this the web
    // keeps serving a stale alias map and a renamed company's old URL 404s
    // until the data cache entry is evicted some other way.
    'company-slug-history',
    'category-shards',
    'company-shards',
    'skills-metadata',
    'education-metadata',
    'sitemap-data',
] as const;

// Targets handled by StaticFeedService.refresh(). Anything else silently
// regenerates nothing (every feed block is `target === 'all' || ...`) while
// still bumping feed-version and reporting success — so reject unknowns.
const regenerateFeedsSchema = z.object({
    target: z
        .enum(['all', 'bootstrap', 'govt', 'walkin', 'expired', 'sitemap', 'jobs', 'companies', 'resources'])
        .optional()
        .default('all'),
});

/**
 * Parse a configured web base URL before fetching it. Rejects non-http(s)
 * origins so a malformed PUBLIC_WEB_URL entry can never turn the
 * revalidation fan-out into a server-side request forgery vector.
 */
function parseRevalidateBaseUrl(raw: string): string | null {
    try {
        const parsed = new URL(raw.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.origin;
    } catch {
        return null;
    }
}

function parseMetricsWindow(raw: unknown, defaultWindow: MetricsWindow = '30d'): MetricsWindow {
    const val = String(raw || '').toLowerCase();
    return METRICS_WINDOWS.includes(val as MetricsWindow) ? (val as MetricsWindow) : defaultWindow;
}

/**
 * Admin delivery controls
 * GET /api/admin/system/delivery-controls
 */
router.get('/delivery-controls', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const controls = await getAdminDeliveryControls();
        res.json(controls);
    } catch (error) {
        next(error);
    }
});

/**
 * Update admin delivery controls
 */
router.put('/delivery-controls', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body as { socialAutoPostingEnabled?: boolean; userAlertsEnabled?: boolean; userEmailNotificationsEnabled?: boolean };
        const updates: { socialAutoPostingEnabled?: boolean; userAlertsEnabled?: boolean; userEmailNotificationsEnabled?: boolean } = {};
        if (typeof body.socialAutoPostingEnabled === 'boolean') updates.socialAutoPostingEnabled = body.socialAutoPostingEnabled;
        if (typeof body.userAlertsEnabled === 'boolean') updates.userAlertsEnabled = body.userAlertsEnabled;
        if (typeof body.userEmailNotificationsEnabled === 'boolean') updates.userEmailNotificationsEnabled = body.userEmailNotificationsEnabled;

        const controls = await updateAdminDeliveryControls(updates, req.adminId as string);
        res.json(controls);
    } catch (error) {
        next(error);
    }
});

/**
 * Trigger Link Verification Bot
 */
router.post('/verify-links', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const results = await runLinkVerification();
        res.json({ success: true, ...results });
    } catch (error) {
        next(error);
    }
});

/**
 * Trigger alerts cycle manually
 */
router.post('/alerts/run', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await runAlertsCycle();
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

/**
 * Manually trigger static CDN feeds regeneration.
 * After regenerating R2 files, busts the Next.js feed tag cache (tags only, no paths).
 */
router.post('/regenerate-feeds', requireAdmin, adminRateLimit, validate(regenerateFeedsSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { target: targetStr } = req.body as { target: string };
        await StaticFeedService.refresh(targetStr);

        // Bust Next.js feed caches via tags only (stale-while-revalidate, zero ISR writes).
        // DO NOT add paths here — see ⚠️ ISR WRITE SAFETY note at the top of this file.
        const secret = process.env.REVALIDATE_SECRET_TOKEN;
        const webUrl = process.env.PUBLIC_WEB_URL;

        // The result is reported, not assumed. This endpoint used to answer
        // `success: true` with "web cache revalidated" even when the webhook was
        // skipped entirely because these env vars were unset — so a misconfigured
        // deploy looked exactly like a working refresh button, and the operator
        // kept clicking it while the site served stale feeds.
        let webTargets = 0;
        let webFailures = 0;

        if (secret && webUrl) {
            const urls = webUrl.split(',').map(u => u.trim()).filter(Boolean);
            await Promise.all(
                urls.map(async (url) => {
                    const base = parseRevalidateBaseUrl(url);
                    if (!base) {
                        logger.error(`[Regenerate Feeds Revalidate] Skipping invalid PUBLIC_WEB_URL entry: ${url}`);
                        webFailures += 1;
                        return;
                    }
                    webTargets += 1;
                    // Retried delivery: a single blip here is the difference between
                    // "the button worked" and "the site is stale until someone notices".
                    const delivery = await deliverFeedRevalidation(base, secret);
                    if (!delivery.ok) {
                        logger.error(`[Regenerate Feeds Revalidate] Failed for ${url}/api/revalidate - ${delivery.reason ?? 'unknown error'}`);
                        webFailures += 1;
                    }
                })
            );
        }

        // Drain Redis cache queues into the BullMQ worker for trickle
        // revalidation.
        //
        // The writer is `invalidatePublicOpportunityCache`, which now delivers
        // its paths to the web app directly, so a healthy deployment leaves
        // this set empty. The drain stays for entries left behind by an older
        // API instance during a rolling deploy.
        try {
            const pendingPaths = await redis.smembers('pending_cache_paths');
            // We ignore pending_cache_tags because tag busts cause Next.js data cache fragmentation
            
            if (pendingPaths && pendingPaths.length > 0) {
                await redis.del('pending_cache_paths', 'pending_cache_tags');
                await enqueueCacheRevalidation(pendingPaths);
                logger.info(`Enqueued ${pendingPaths.length} paths for background trickle revalidation`);
            }
        } catch (err: unknown) {
            logger.error('Failed to drain pending cache paths', { error: err instanceof Error ? err.message : String(err) });
        }

        const webRevalidated = webTargets > 0 && webFailures === 0;
        const warnings: string[] = [];
        if (!secret || !webUrl) {
            warnings.push(
                'REVALIDATE_SECRET_TOKEN and/or PUBLIC_WEB_URL are not configured on this API, so the '
                + 'web app was never told about this rebuild. The R2 feeds are current, but pages keep '
                + "serving the previous feed version until those env vars are set and this button is run again.",
            );
        }
        if (webFailures > 0) {
            warnings.push(`${webFailures} of ${webTargets} web target(s) rejected the revalidation or could not be reached; see the API logs for the response body.`);
        }

        res.json({
            success: true,
            webRevalidated,
            webTargets,
            webFailures,
            warnings,
            // The target count is reported because it is the only way to see a
            // half-configured deploy from here: with the public site and the
            // admin dashboard on separate Vercel projects, each has its own Next
            // data cache and both need the bust. "busted on 1 target" against a
            // two-project setup means one site will stay stale.
            message: webRevalidated
                ? `Static feeds (${targetStr}) regenerated and the web cache busted on ${webTargets} target(s). Confirm that is one per deployed web project.`
                : `Static feeds (${targetStr}) regenerated, but the web cache was NOT busted. ${warnings.join(' ')}`,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Manually trigger Next.js tag cache revalidation (without regenerating R2 feeds).
 * Useful when R2 is already up to date but Next.js is still serving stale data.
 */
router.post('/revalidate-web', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const secret = process.env.REVALIDATE_SECRET_TOKEN;
        const webUrl = process.env.PUBLIC_WEB_URL;

        if (!secret || !webUrl) {
            return res.status(500).json({ success: false, message: 'REVALIDATE_SECRET_TOKEN or PUBLIC_WEB_URL not configured' });
        }

        const urls = webUrl.split(',').map(u => u.trim()).filter(Boolean);
        const failures: string[] = [];

        await Promise.all(
            urls.map(async (url) => {
                const base = parseRevalidateBaseUrl(url);
                if (!base) {
                    logger.error(`[Revalidate] Skipping invalid PUBLIC_WEB_URL entry: ${url}`);
                    failures.push(`${url} (invalid origin)`);
                    return;
                }
                // Tags only — no paths. See ⚠️ ISR WRITE SAFETY note at the top of this file.
                const delivery = await deliverFeedRevalidation(base, secret);
                if (!delivery.ok) {
                    logger.error(`[Revalidate] Failed for ${url}/api/revalidate - ${delivery.reason ?? 'unknown error'}`);
                    failures.push(`${url} (${delivery.reason ?? 'unknown error'})`);
                }
            })
        );

        if (failures.length > 0) {
            throw new Error(`Web cache was not busted on ${failures.length} target(s): ${failures.join('; ')}`);
        }

        res.json({ success: true, message: 'Next.js web cache successfully revalidated on all targets.' });
    } catch (error) {
        next(error);
    }
});

/**
 * Canonical admin metrics endpoint
 */
router.get('/metrics-v2', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const window = parseMetricsWindow(req.query.window);
        const metrics = await getAdminMetricsV2(window);
        res.json(metrics);
    } catch (error) {
        next(error);
    }
});

/**
 * Get growth funnel metrics (Unified PlatformEvent)
 */
router.get('/growth-funnel', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rawWindow = String(req.query.window || '30d').toLowerCase();
        const windowHours = rawWindow === '24h' ? 24 : rawWindow === '7d' ? 24 * 7 : rawWindow === 'all' ? 24 * 365 : 24 * 30;
        const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

        const grouped = await prisma.platformEvent.groupBy({
            by: ['type'],
            where: { createdAt: { gte: since } },
            _count: { _all: true }
        });

        const metrics = grouped.reduce((acc: Record<string, number>, row) => {
            acc[row.type] = row._count._all;
            return acc;
        }, {});

        res.json({ metrics });
    } catch (error) {
        next(error);
    }
});

/**
 * Growth funnel sanity check (Unified PlatformEvent)
 */
router.get('/growth-funnel/sanity', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rawWindow = String(req.query.window || '7d').toLowerCase();
        const windowHours = rawWindow === '24h' ? 24 : rawWindow === '30d' ? 24 * 30 : 24 * 7;
        const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

        const [growthGrouped] = await Promise.all([
            prisma.platformEvent.groupBy({
                by: ['type'],
                where: { createdAt: { gte: since } },
                _count: { _all: true }
            })
        ]);

        const growthCounts = (growthGrouped as Array<{ type: string; _count: { _all: number } }>).reduce<Record<string, number>>((acc, row) => {
            acc[row.type] = row._count._all;
            return acc;
        }, {});

        const metrics = getObservabilityMetrics();
        res.json({
            window: rawWindow,
            since,
            growthCounts: {
                detailView: growthCounts.VIEW_JOB || 0,
                applyClick: growthCounts.CLICK_APPLY || 0,
                saveJob: growthCounts.SAVE_JOB || 0,
                authSuccess: growthCounts.AUTH_STEP || 0,
            },
            rawSignals: {
                observabilitySinceProcessStart: metrics.totals.requests,
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * List Telegram broadcast attempts
 */
router.get('/telegram-broadcasts', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const statusRaw = String(req.query.status || '').toUpperCase();
        const limitRaw = Number(req.query.limit || 50);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
        const windowRaw = String(req.query.window || 'all').toLowerCase();

        let fromDate: Date | undefined;
        if (windowRaw === '24h') fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (windowRaw === '7d') fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (windowRaw === '30d') fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const where: { status?: TelegramBroadcastStatus; createdAt?: { gte: Date } } = {};
        if (statusRaw && Object.values(TelegramBroadcastStatus).includes(statusRaw as TelegramBroadcastStatus)) where.status = statusRaw as TelegramBroadcastStatus;
        if (fromDate) where.createdAt = { gte: fromDate };

        const broadcasts = await prisma.telegramBroadcast.findMany({
            where,
            include: { opportunity: { select: { id: true, slug: true, title: true, company: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        res.json({ broadcasts });
    } catch (error) {
        next(error);
    }
});

export default router;
