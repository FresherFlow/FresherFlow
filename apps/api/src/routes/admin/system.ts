import prisma from '../../lib/prisma';
import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { getVerificationStats, runLinkVerification } from '../../services/verificationBot';
import { getObservabilityMetrics } from '../../middleware/observability';
import { getGrowthFunnelMetrics, GrowthWindow } from '../../services/growthFunnel.service';
import { AlertChannel, AlertDispatchReason, AlertDispatchStatus, AlertKind, IngestionSourceType, OpportunityType, TelegramBroadcastStatus } from '@prisma/client';
import TelegramService from '../../services/telegram.service';
import { runIngestionForSource } from '../../services/ingestion.service';
import { runAlertsCycle } from '../../services/alerts.service';
import { sendNewJobAlerts } from '../../services/notification.service';
import { clearAdminMetricsCache, getAdminMetricsV2, MetricsWindow } from '../../services/adminMetrics.service';

const router = Router();


type SourceHealth = 'healthy' | 'degraded' | 'failing';

function getIngestionSourceHealth(source: {
    enabled: boolean;
    runFrequencyMinutes: number;
    lastRunAt: Date | null;
    lastSuccessAt: Date | null;
    runs?: Array<{ status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' }>;
}): SourceHealth {
    if (!source.enabled) return 'degraded';
    if (!source.lastRunAt) return 'degraded';

    const now = Date.now();
    const runLagMs = now - source.lastRunAt.getTime();
    const maxHealthyLagMs = Math.max(source.runFrequencyMinutes, 5) * 3 * 60 * 1000;
    const recentRun = source.runs?.[0];

    if (recentRun?.status === 'FAILED') return 'failing';
    if (!source.lastSuccessAt) return 'failing';
    if (source.lastSuccessAt.getTime() < source.lastRunAt.getTime() - 5000) return 'degraded';
    if (runLagMs > maxHealthyLagMs) return 'degraded';
    return 'healthy';
}

/**
 * Trigger Link Verification Bot
 * POST /api/admin/system/verify-links
 */
router.post('/verify-links', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const results = await runLinkVerification();
        res.json({
            success: true,
            message: 'Verification bot run complete.',
            ...results
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Trigger alerts cycle manually
 * POST /api/admin/system/alerts/run
 */
router.post('/alerts/run', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await runAlertsCycle();
        res.json({
            success: true,
            message: 'Alerts cycle run complete.',
            ...result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Backfill NEW_JOB app alerts for recently published opportunities.
 * Useful when notification logic was changed or when users missed prior pushes.
 * POST /api/admin/system/alerts/backfill-new-jobs?hours=72&limit=100
 */
router.post('/alerts/backfill-new-jobs', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hoursRaw = Number(req.query.hours || 72);
        const limitRaw = Number(req.query.limit || 100);
        const hours = Number.isFinite(hoursRaw) ? Math.min(Math.max(hoursRaw, 1), 24 * 30) : 72;
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        const opportunities = await prisma.opportunity.findMany({
            where: {
                status: 'PUBLISHED',
                deletedAt: null,
                postedAt: { gte: since }
            },
            select: { id: true, postedAt: true },
            orderBy: { postedAt: 'desc' },
            take: limit
        });

        let processed = 0;
        let usersSent = 0;
        let emailsSent = 0;
        let appAlertsSent = 0;
        const errors: Array<{ opportunityId: string; message: string }> = [];

        for (const opp of opportunities) {
            try {
                const result = await sendNewJobAlerts(opp.id);
                processed += 1;
                usersSent += result.usersSent;
                emailsSent += result.emailsSent;
                appAlertsSent += result.appAlertsSent;
            } catch (error) {
                errors.push({
                    opportunityId: opp.id,
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        }

        res.json({
            success: true,
            message: 'Backfill complete',
            windowHours: hours,
            considered: opportunities.length,
            processed,
            usersSent,
            emailsSent,
            appAlertsSent,
            errors
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Config + migration readiness for alerts/push rollout
 * GET /api/admin/system/config-health
 */
router.get('/config-health', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const [pushTableRow] = await prisma.$queryRaw<Array<{ exists: boolean }>>`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'PushSubscription'
            ) AS "exists"
        `;

        const [alertChannelPushRow] = await prisma.$queryRaw<Array<{ exists: boolean }>>`
            SELECT EXISTS (
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'AlertChannel'
                  AND e.enumlabel = 'PUSH'
            ) AS "exists"
        `;

        const [growthInstallRow] = await prisma.$queryRaw<Array<{ exists: boolean }>>`
            SELECT EXISTS (
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'GrowthFunnelEvent'
                  AND e.enumlabel IN ('INSTALL_PROMPT_SHOWN', 'INSTALL_ACCEPTED', 'OPENED_STANDALONE')
                GROUP BY t.typname
                HAVING COUNT(*) = 3
            ) AS "exists"
        `;

        const env = {
            webPushPublicKey: Boolean(process.env.WEB_PUSH_VAPID_PUBLIC_KEY),
            webPushPrivateKey: Boolean(process.env.WEB_PUSH_VAPID_PRIVATE_KEY),
            webPushSubject: Boolean(process.env.WEB_PUSH_SUBJECT),
            redisUrl: Boolean(process.env.REDIS_URL),
            cronSecret: Boolean(process.env.CRON_SECRET),
            telegramBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
            telegramPublicChannel: Boolean(process.env.TELEGRAM_PUBLIC_CHANNEL),
        };

        const db = {
            pushSubscriptionTable: Boolean(pushTableRow?.exists),
            alertChannelPushEnum: Boolean(alertChannelPushRow?.exists),
            growthInstallEnums: Boolean(growthInstallRow?.exists),
        };

        const ready = {
            pushDeliveryReady: db.pushSubscriptionTable && db.alertChannelPushEnum && env.webPushPublicKey && env.webPushPrivateKey,
            installTrackingReady: db.growthInstallEnums,
            cronAuthReady: env.cronSecret,
            redisConfigured: env.redisUrl,
        };

        res.json({ ready, env, db });
    } catch (error) {
        next(error);
    }
});

/**
 * Alert dispatch observability logs (minimal v1 surface).
 * GET /api/admin/system/alerts/dispatch-logs
 */
router.get('/alerts/dispatch-logs', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const statusRaw = String(req.query.status || '').toUpperCase();
        const kindRaw = String(req.query.kind || '').toUpperCase();
        const channelRaw = String(req.query.channel || '').toUpperCase();
        const reasonRaw = String(req.query.reason || '').toUpperCase();
        const correlationIdRaw = String(req.query.correlationId || '').trim();
        const limitRaw = Number(req.query.limit || 100);
        const sinceHoursRaw = Number(req.query.sinceHours || 24);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;
        const sinceHours = Number.isFinite(sinceHoursRaw) ? Math.min(Math.max(sinceHoursRaw, 1), 24 * 30) : 24;
        const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

        const where: {
            createdAt: { gte: Date };
            status?: AlertDispatchStatus;
            kind?: AlertKind;
            channel?: AlertChannel;
            reason?: AlertDispatchReason;
            correlationId?: string;
        } = {
            createdAt: { gte: since },
        };

        if (Object.values(AlertDispatchStatus).includes(statusRaw as AlertDispatchStatus)) {
            where.status = statusRaw as AlertDispatchStatus;
        }
        if (Object.values(AlertKind).includes(kindRaw as AlertKind)) {
            where.kind = kindRaw as AlertKind;
        }
        if (Object.values(AlertChannel).includes(channelRaw as AlertChannel)) {
            where.channel = channelRaw as AlertChannel;
        }
        if (Object.values(AlertDispatchReason).includes(reasonRaw as AlertDispatchReason)) {
            where.reason = reasonRaw as AlertDispatchReason;
        }
        if (correlationIdRaw) {
            where.correlationId = correlationIdRaw;
        }

        const [logs, statusTotals, reasonTotals, kindChannelStatusTotals] = await Promise.all([
            prisma.alertDispatchLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    user: { select: { id: true, email: true } },
                    opportunity: { select: { id: true, slug: true, title: true } },
                },
            }),
            prisma.alertDispatchLog.groupBy({
                by: ['status'],
                where,
                _count: { _all: true },
            }),
            prisma.alertDispatchLog.groupBy({
                by: ['reason'],
                where,
                _count: { _all: true },
            }),
            prisma.alertDispatchLog.groupBy({
                by: ['kind', 'channel', 'status'],
                where,
                _count: { _all: true },
            }),
        ]);

        res.json({
            filters: {
                status: where.status || null,
                kind: where.kind || null,
                channel: where.channel || null,
                reason: where.reason || null,
                correlationId: where.correlationId || null,
                since,
                limit,
            },
            totals: {
                byStatus: statusTotals,
                byReason: reasonTotals,
                byKindChannelStatus: kindChannelStatusTotals,
            },
            logs,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get Health Statistics
 * GET /api/admin/system/health-stats
 */
router.get('/health-stats', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const counts = await prisma.opportunity.groupBy({
            by: ['linkHealth'],
            _count: true,
            where: {
                status: 'PUBLISHED',
                deletedAt: null
            }
        });

        const stats = {
            healthy: 0,
            broken: 0,
            retrying: 0
        };

        counts.forEach(c => {
            if (c.linkHealth === 'HEALTHY') stats.healthy = c._count;
            if (c.linkHealth === 'BROKEN') stats.broken = c._count;
            if (c.linkHealth === 'RETRYING') stats.retrying = c._count;
        });

        res.json({ stats });
    } catch (error) {
        next(error);
    }
});

/**
 * Get Link Verification Bot run stats
 * GET /api/admin/system/verify-links/stats
 */
router.get('/verify-links/stats', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            stats: getVerificationStats()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get request observability metrics
 * GET /api/admin/system/metrics
 */
router.get('/metrics', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const metrics = getObservabilityMetrics();
        res.json({ metrics });
    } catch (error) {
        next(error);
    }
});

/**
 * Canonical admin metrics endpoint
 * GET /api/admin/system/metrics-v2?window=24h|7d|30d
 */
router.get('/metrics-v2', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rawWindow = String(req.query.window || '30d').toLowerCase();
        const allowedWindows: MetricsWindow[] = ['24h', '7d', '30d'];
        const window = allowedWindows.includes(rawWindow as MetricsWindow)
            ? (rawWindow as MetricsWindow)
            : '30d';

        const metrics = await getAdminMetricsV2(window);
        res.json(metrics);
    } catch (error) {
        next(error);
    }
});

/**
 * Force refresh canonical admin metrics cache
 * POST /api/admin/system/metrics-v2/refresh
 */
router.post('/metrics-v2/refresh', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rawWindow = String(req.query.window || '30d').toLowerCase();
        const allowedWindows: MetricsWindow[] = ['24h', '7d', '30d'];
        const window = allowedWindows.includes(rawWindow as MetricsWindow)
            ? (rawWindow as MetricsWindow)
            : '30d';

        clearAdminMetricsCache();
        const metrics = await getAdminMetricsV2(window);
        res.json({ refreshed: true, metrics });
    } catch (error) {
        next(error);
    }
});

/**
 * Get growth funnel metrics by source
 * GET /api/admin/system/growth-funnel
 */
router.get('/growth-funnel', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rawWindow = String(req.query.window || '30d').toLowerCase();
        const allowedWindows: GrowthWindow[] = ['24h', '7d', '30d', 'all'];
        const window = allowedWindows.includes(rawWindow as GrowthWindow)
            ? (rawWindow as GrowthWindow)
            : '30d';

        const metrics = await getGrowthFunnelMetrics(window);
        res.json({ metrics });
    } catch (error) {
        next(error);
    }
});

/**
 * Growth funnel sanity check against route/click signals.
 * GET /api/admin/system/growth-funnel/sanity?window=24h|7d|30d
 */
router.get('/growth-funnel/sanity', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rawWindow = String(req.query.window || '7d').toLowerCase();
        const windowHours = rawWindow === '24h' ? 24 : rawWindow === '30d' ? 24 * 30 : 24 * 7;
        const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

        const [growthGrouped, applyClicks] = await Promise.all([
            prisma.growthEvent.groupBy({
                by: ['event'],
                where: { createdAt: { gte: since } },
                _count: { _all: true }
            }),
            prisma.opportunityClick.count({
                where: { createdAt: { gte: since } }
            })
        ]);

        const growthCounts = growthGrouped.reduce<Record<string, number>>((acc, row) => {
            acc[row.event] = row._count._all;
            return acc;
        }, {});

        const metrics = getObservabilityMetrics();
        const routeSamples = Object.entries(metrics.routes)
            .filter(([key]) => key.includes('/api/opportunities'))
            .sort((a, b) => b[1].requests - a[1].requests)
            .slice(0, 20)
            .map(([route, values]) => ({
                route,
                requests: values.requests,
                errors: values.errors,
                avgLatencyMs: values.avgLatencyMs
            }));

        res.json({
            window: rawWindow,
            since,
            growthCounts: {
                detailView: growthCounts.DETAIL_VIEW || 0,
                applyClick: growthCounts.APPLY_CLICK || 0,
                saveJob: growthCounts.SAVE_JOB || 0,
                authSuccess: growthCounts.AUTH_SUCCESS || 0,
            },
            rawSignals: {
                applyClickRows: applyClicks,
                observabilitySinceProcessStart: metrics.totals.requests,
                opportunityRouteSamples: routeSamples,
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * List Telegram broadcast attempts
 * GET /api/admin/system/telegram-broadcasts
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

        const where: {
            status?: TelegramBroadcastStatus;
            createdAt?: { gte: Date };
        } = {};

        if (statusRaw && Object.values(TelegramBroadcastStatus).includes(statusRaw as TelegramBroadcastStatus)) {
            where.status = statusRaw as TelegramBroadcastStatus;
        }
        if (fromDate) {
            where.createdAt = { gte: fromDate };
        }

        const broadcasts = await prisma.telegramBroadcast.findMany({
            where,
            include: {
                opportunity: {
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        company: true,
                        type: true,
                        locations: true,
                        applyLink: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        const grouped = await prisma.telegramBroadcast.groupBy({
            where,
            by: ['status'],
            _count: true
        });
        const summary = { sent: 0, failed: 0, skipped: 0 };
        for (const row of grouped) {
            if (row.status === 'SENT') summary.sent = row._count;
            if (row.status === 'FAILED') summary.failed = row._count;
            if (row.status === 'SKIPPED') summary.skipped = row._count;
        }

        res.json({
            broadcasts,
            count: broadcasts.length,
            summary
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Retry one failed/skipped Telegram broadcast
 * POST /api/admin/system/telegram-broadcasts/:id/retry
 */
router.post('/telegram-broadcasts/:id/retry', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        if (!id) {
            return res.status(400).json({ message: 'Broadcast ID is required' });
        }

        const broadcast = await prisma.telegramBroadcast.findUnique({
            where: { id },
            include: {
                opportunity: {
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        company: true,
                        type: true,
                        locations: true,
                        applyLink: true,
                    }
                }
            }
        });

        if (!broadcast || !broadcast.opportunity) {
            return res.status(404).json({ message: 'Broadcast not found' });
        }

        const opp = broadcast.opportunity;
        await TelegramService.broadcastNewOpportunity(
            opp.id,
            opp.title,
            opp.company,
            opp.type,
            opp.locations,
            opp.slug,
            { force: true }
        );

        const refreshed = await prisma.telegramBroadcast.findUnique({ where: { id } });
        res.json({
            success: true,
            broadcast: refreshed
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Ingestion sources management
 */
router.get('/ingestion/sources', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const sources = await prisma.ingestionSource.findMany({
            include: {
                runs: {
                    orderBy: { startedAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        status: true,
                        startedAt: true,
                        endedAt: true,
                        fetchedCount: true,
                        draftCreatedCount: true,
                        dedupedCount: true,
                        rejectedCount: true,
                        errorCount: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const normalized = sources.map((source) => ({
            ...source,
            health: getIngestionSourceHealth(source),
            latestRun: source.runs[0] || null,
            runs: undefined,
        }));

        res.json({ sources: normalized });
    } catch (error) {
        next(error);
    }
});

router.post('/ingestion/sources', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name = String(req.body?.name || '').trim();
        const endpoint = String(req.body?.endpoint || '').trim();
        const sourceTypeRaw = String(req.body?.sourceType || '').toUpperCase();
        const sourceType = Object.values(IngestionSourceType).includes(sourceTypeRaw as IngestionSourceType)
            ? (sourceTypeRaw as IngestionSourceType)
            : IngestionSourceType.JSON_FEED;
        const runFrequencyMinutes = Number(req.body?.runFrequencyMinutes || 60);
        const defaultTypeRaw = String(req.body?.defaultType || '').toUpperCase();
        const defaultType = Object.values(OpportunityType).includes(defaultTypeRaw as OpportunityType)
            ? (defaultTypeRaw as OpportunityType)
            : OpportunityType.JOB;

        if (!name || !endpoint) {
            return res.status(400).json({ message: 'name and endpoint are required' });
        }

        const source = await prisma.ingestionSource.create({
            data: {
                name,
                endpoint,
                sourceType,
                runFrequencyMinutes: Number.isFinite(runFrequencyMinutes) ? Math.max(5, runFrequencyMinutes) : 60,
                defaultType,
                createdByUserId: req.adminId || null
            }
        });

        res.status(201).json({ source });
    } catch (error) {
        next(error);
    }
});

router.patch('/ingestion/sources/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id || '');
        const data: Record<string, unknown> = {};

        if (req.body?.name !== undefined) data.name = String(req.body.name).trim();
        if (req.body?.endpoint !== undefined) data.endpoint = String(req.body.endpoint).trim();
        if (req.body?.enabled !== undefined) data.enabled = Boolean(req.body.enabled);

        if (req.body?.runFrequencyMinutes !== undefined) {
            const parsed = Number(req.body.runFrequencyMinutes);
            data.runFrequencyMinutes = Number.isFinite(parsed) ? Math.max(5, parsed) : 60;
        }

        if (req.body?.sourceType !== undefined) {
            const sourceTypeRaw = String(req.body.sourceType).toUpperCase();
            if (Object.values(IngestionSourceType).includes(sourceTypeRaw as IngestionSourceType)) {
                data.sourceType = sourceTypeRaw as IngestionSourceType;
            }
        }

        if (req.body?.defaultType !== undefined) {
            const defaultTypeRaw = String(req.body.defaultType).toUpperCase();
            if (Object.values(OpportunityType).includes(defaultTypeRaw as OpportunityType)) {
                data.defaultType = defaultTypeRaw as OpportunityType;
            }
        }

        const source = await prisma.ingestionSource.update({
            where: { id },
            data
        });

        res.json({ source });
    } catch (error) {
        next(error);
    }
});

router.post('/ingestion/sources/:id/run', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id || '');
        if (!id) return res.status(400).json({ message: 'source id is required' });

        const result = await runIngestionForSource(id);
        res.json({ success: true, result });
    } catch (error) {
        next(error);
    }
});

router.get('/ingestion/runs', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId : undefined;
        const limitRaw = Number(req.query.limit || 25);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 25;

        const runs = await prisma.ingestionRun.findMany({
            where: sourceId ? { sourceId } : undefined,
            include: {
                source: {
                    select: { id: true, name: true, sourceType: true }
                },
                rawItems: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    select: {
                        id: true,
                        status: true,
                        title: true,
                        company: true,
                        applyLink: true,
                        fresherScore: true,
                        reasonFlags: true,
                        sourceExternalId: true,
                        errorMessage: true,
                        createdAt: true,
                    }
                },
            },
            orderBy: { startedAt: 'desc' },
            take: limit
        });

        res.json({
            runs: runs.map((run) => ({
                ...run,
                rawItems: run.rawItems.map((item) => ({
                    id: item.id,
                    status: item.status,
                    title: item.title,
                    company: item.company,
                    applyLink: item.applyLink,
                    qualityScore: item.fresherScore,
                    dedupeReason: item.reasonFlags.join(', ') || null,
                    sourceRecordId: item.sourceExternalId,
                    errorMessage: item.errorMessage,
                    createdAt: item.createdAt,
                })),
            }))
        });
    } catch (error) {
        next(error);
    }
});

export default router;

