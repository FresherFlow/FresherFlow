import prisma from '../../infrastructure/database/prisma';
import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { runLinkVerification } from '../../infrastructure/services/verificationBot';
import { getObservabilityMetrics } from '../../middleware/observability';
import { TelegramBroadcastStatus } from '@fresherflow/database';
import { runAlertsCycle } from '../../infrastructure/services/alerts.service';
import { getAdminMetricsV2, MetricsWindow } from '../../infrastructure/services/adminMetrics.service';
import { getAdminDeliveryControls, updateAdminDeliveryControls } from '../../infrastructure/services/adminDeliveryControl.service';


const router = Router();

// --- Shared helpers ---
const METRICS_WINDOWS: MetricsWindow[] = ['24h', '7d', '14d', '30d'];

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
