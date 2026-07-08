import prisma from '../../infrastructure/database/prisma';
import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { runLinkVerification } from '../../infrastructure/services/verificationBot';
import { getObservabilityMetrics } from '../../middleware/observability';
import { TelegramBroadcastStatus } from '@fresherflow/database';
import { runAlertsCycle } from '../../infrastructure/services/alerts.service';
import { getAdminMetricsV2, MetricsWindow } from '../../infrastructure/services/adminMetrics.service';
import { getAdminDeliveryControls, updateAdminDeliveryControls } from '../../infrastructure/services/adminDeliveryControl.service';
import { StaticFeedService } from '../../infrastructure/services/staticFeed.service';

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FEED_REVALIDATE_TAGS = [
    'feed-version',
    'homepage-feed',
    'government-feed',
    'expired-feed',
    'companies-metadata',
] as const;

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
router.post('/regenerate-feeds', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { target } = req.body;
        const targetStr = typeof target === 'string' ? target : 'all';
        await StaticFeedService.refresh(targetStr);

        // Bust Next.js feed caches via tags only (stale-while-revalidate, zero ISR writes).
        // DO NOT add paths here — see ⚠️ ISR WRITE SAFETY note at the top of this file.
        const secret = process.env.REVALIDATE_SECRET_TOKEN;
        const webUrl = process.env.PUBLIC_WEB_URL;
        if (secret && webUrl) {
            try {
                await fetch(`${webUrl}/api/revalidate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret, tags: FEED_REVALIDATE_TAGS }),
                });
            } catch {
                // Non-fatal — feed is already updated in R2, tag bust is best-effort
            }
        }

        res.json({ success: true, message: `Static feeds (${targetStr}) successfully regenerated and web cache revalidated.` });
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

        // Tags only — no paths. See ⚠️ ISR WRITE SAFETY note at the top of this file.
        const response = await fetch(`${webUrl}/api/revalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, tags: FEED_REVALIDATE_TAGS }),
        });

        if (!response.ok) {
            throw new Error(`Web server responded with ${response.status}`);
        }

        res.json({ success: true, message: 'Next.js web cache successfully revalidated.' });
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
