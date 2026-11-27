import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { redis } from '@fresherflow/database';
import { logger } from '@fresherflow/utils';
import { requireInternalApiKey } from '../../middleware/auth';
import { createRateLimiter } from '../../middleware/rateLimit';

/**
 * Durable per-route cost metrics from the web app.
 *
 * Vercel retains 12 hours of function metrics on Hobby, and the window it keeps
 * is not the window that exhausts the plan. The web app measures each
 * instrumented render (wall time + `process.cpuUsage()` delta) and posts
 * batches here after the response is sent; this route aggregates them per UTC
 * day so a month of burn can be attributed to routes afterwards.
 *
 * Storage is one JSON document per day (`route_metrics:<YYYY-MM-DD>`) rather
 * than Redis hashes, because the shared `redis` export is typed as an ioredis
 * client OR a minimal shim that only implements string/incr commands. The
 * trade-off is a read-modify-write: two batches landing on the same day in the
 * same millisecond can lose one pair of increments. These are cost-attribution
 * numbers with an approximate CPU proxy behind them, so an occasional lost
 * increment is acceptable — silently dropping a whole batch would not be.
 *
 * This surface holds no user data and is unreachable without
 * INTERNAL_API_SECRET, exactly like the other `/api/internal` mounts.
 */

const router = Router();

const RATE_LIMIT = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many route-metric batches.',
    keyPrefix: 'route-metrics',
});

/** Redis keeps a rolling window; the longest readable range is 35 days. */
const RETENTION_SECONDS = 35 * 24 * 60 * 60;
const MAX_DAYS = 35;

const sampleSchema = z.object({
    route: z.string().trim().min(1).max(200),
    status: z.string().trim().min(1).max(10),
    ms: z.number().finite().min(0).max(600_000),
    cpuMs: z.number().finite().min(0).max(600_000),
    at: z.number().int().positive(),
});

const ingestSchema = z.object({
    samples: z.array(sampleSchema).min(1).max(200),
});

interface RouteTotals {
    n: number;
    ms: number;
    cpu: number;
}

type DayDocument = Record<string, RouteTotals>;

function utcDay(timestamp: number): string {
    return new Date(timestamp).toISOString().slice(0, 10);
}

function dayKey(day: string): string {
    return `route_metrics:${day}`;
}

/**
 * `route|status` is the document key. A literal pipe inside either value would
 * split into the wrong field, so it is replaced rather than escaped.
 */
function metricField(route: string, status: string): string {
    return `${route.replace(/\|/g, '/')}|${status.replace(/\|/g, '/')}`;
}

async function readDay(day: string): Promise<DayDocument> {
    try {
        const raw = await redis.get(dayKey(day));
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed as DayDocument;
    } catch {
        return {};
    }
}

/**
 * POST /api/internal/route-metrics
 * Body: { samples: [{ route, status, ms, cpuMs, at }] }
 */
router.post('/', RATE_LIMIT, requireInternalApiKey, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = ingestSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: { message: 'Invalid route-metric batch' } });
            return;
        }

        // One read-modify-write per day in the batch, not per sample.
        const byDay = new Map<string, Map<string, RouteTotals>>();
        for (const sample of parsed.data.samples) {
            const day = utcDay(sample.at);
            const field = metricField(sample.route, sample.status);
            const fields = byDay.get(day) ?? new Map<string, RouteTotals>();
            const totals = fields.get(field) ?? { n: 0, ms: 0, cpu: 0 };
            totals.n += 1;
            totals.ms += Math.round(sample.ms);
            totals.cpu += Math.round(sample.cpuMs);
            fields.set(field, totals);
            byDay.set(day, fields);
        }

        await Promise.all(
            Array.from(byDay.entries()).map(async ([day, fields]) => {
                const document = await readDay(day);
                for (const [field, totals] of fields) {
                    const existing = document[field] ?? { n: 0, ms: 0, cpu: 0 };
                    document[field] = {
                        n: existing.n + totals.n,
                        ms: existing.ms + totals.ms,
                        cpu: existing.cpu + totals.cpu,
                    };
                }
                await redis.setex(dayKey(day), RETENTION_SECONDS, JSON.stringify(document));
            }),
        );

        res.status(202).json({ accepted: parsed.data.samples.length });
    } catch (error) {
        logger.error('[routeMetrics] Failed to record route metrics', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
});

/**
 * GET /api/internal/route-metrics?days=7
 *
 * Returns per day, per route: invocations, total and average wall time, total
 * and average CPU proxy. Sorted by CPU descending, so the burn ranking is the
 * first thing in the response.
 */
router.get('/', RATE_LIMIT, requireInternalApiKey, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requested = Number(req.query.days);
        const days = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), MAX_DAYS) : 7;

        const now = Date.now();
        const dayList: string[] = [];
        for (let offset = 0; offset < days; offset += 1) {
            dayList.push(utcDay(now - offset * 24 * 60 * 60 * 1000));
        }

        const documents = await Promise.all(dayList.map((day) => readDay(day)));

        const rows: Array<{
            day: string;
            route: string;
            status: string;
            count: number;
            totalMs: number;
            totalCpuMs: number;
            avgMs: number;
            avgCpuMs: number;
        }> = [];

        dayList.forEach((day, index) => {
            for (const [field, totals] of Object.entries(documents[index])) {
                if (!totals || !Number.isFinite(totals.n) || totals.n <= 0) continue;
                const separator = field.lastIndexOf('|');
                const route = separator === -1 ? field : field.slice(0, separator);
                const status = separator === -1 ? '' : field.slice(separator + 1);
                const totalMs = Number(totals.ms) || 0;
                const totalCpuMs = Number(totals.cpu) || 0;

                rows.push({
                    day,
                    route,
                    status,
                    count: totals.n,
                    totalMs,
                    totalCpuMs,
                    avgMs: Math.round(totalMs / totals.n),
                    avgCpuMs: Math.round(totalCpuMs / totals.n),
                });
            }
        });

        rows.sort((a, b) => b.totalCpuMs - a.totalCpuMs);

        res.json({
            days,
            totals: {
                invocations: rows.reduce((sum, row) => sum + row.count, 0),
                cpuMs: rows.reduce((sum, row) => sum + row.totalCpuMs, 0),
            },
            rows,
        });
    } catch (error) {
        logger.error('[routeMetrics] Failed to read route metrics', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
});

export default router;
