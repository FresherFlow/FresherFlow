import crypto from 'crypto';
import os from 'os';

import { Request, Response, NextFunction } from 'express';
import {
    getAlertMetrics,
    getAllMetrics,
    getIngestionMetrics,
    observeHttpRequest,
    prometheusLabelBlock,
    renderPrometheusText,
    PROMETHEUS_CONTENT_TYPE
} from '../infrastructure/observability/metrics';
import { getRecentSlowQueries, getSlowQueryReport, isSlowQueryTrackingEnabled } from '../infrastructure/observability/slowQuery';

type RouteMetrics = {
    requests: number;
    errors: number;
    totalLatencyMs: number;
    maxLatencyMs: number;
};

type MetricsSnapshot = {
    uptimeSec: number;
    totals: {
        requests: number;
        errors: number;
        errorRatePct: number;
        avgLatencyMs: number;
        p95LatencyMs: number;
    };
    routes: Record<string, {
        requests: number;
        errors: number;
        errorRatePct: number;
        avgLatencyMs: number;
        maxLatencyMs: number;
    }>;
};

const startedAt = Date.now();
const routeStats = new Map<string, RouteMetrics>();
const latencyWindowMs: number[] = [];
const LATENCY_WINDOW_LIMIT = 1000;

let totalRequests = 0;
let totalErrors = 0;
let totalLatencyMs = 0;

function percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[index];
}

function routeKey(req: Request): string {
    const method = req.method.toUpperCase();
    const routePath = req.route?.path;
    const baseUrl = req.baseUrl || '';
    if (routePath) {
        return `${method} ${baseUrl}${routePath}`;
    }
    return `${method} ${req.path}`;
}

/**
 * Low-cardinality route label for the exported metric series.
 *
 * WHY this is separate from routeKey(): routeKey is the admin-facing display key and keeps the
 * raw path for unmatched requests, which is useful when debugging. That is exactly wrong for a
 * metric label — `req.path` embeds ids and slugs, so labelling with it creates a new time series
 * per request and is a cardinality bomb. Here an unmatched request collapses to the single
 * reserved label `unmatched`, and a matched one uses the Express pattern (`/jobs/:id`), which is
 * code-controlled and bounded by the number of registered routes.
 */
const UNMATCHED_ROUTE_LABEL = 'unmatched';

function metricRouteLabel(req: Request): string {
    const routePath = req.route?.path;
    if (!routePath) return UNMATCHED_ROUTE_LABEL;
    const baseUrl = req.baseUrl || '';
    // Express 5 types `route.path` as string | string[]; arrays are joined, never dropped.
    const pathPart = Array.isArray(routePath) ? routePath.join(',') : String(routePath);
    const label = `${baseUrl}${pathPart}`;
    return label.length > 120 ? `${label.slice(0, 120)}...` : label;
}

export function observabilityMiddleware(req: Request, res: Response, next: NextFunction) {
    const started = process.hrtime.bigint();

    res.on('finish', () => {
        const ended = process.hrtime.bigint();
        const latencyMs = Number(ended - started) / 1_000_000;
        const key = routeKey(req);
        const isError = res.statusCode >= 400;

        totalRequests += 1;
        totalLatencyMs += latencyMs;
        if (isError) totalErrors += 1;

        latencyWindowMs.push(latencyMs);
        if (latencyWindowMs.length > LATENCY_WINDOW_LIMIT) {
            latencyWindowMs.shift();
        }

        const existing = routeStats.get(key) || {
            requests: 0,
            errors: 0,
            totalLatencyMs: 0,
            maxLatencyMs: 0
        };
        existing.requests += 1;
        existing.totalLatencyMs += latencyMs;
        if (isError) existing.errors += 1;
        if (latencyMs > existing.maxLatencyMs) existing.maxLatencyMs = latencyMs;
        routeStats.set(key, existing);

        // Feed the scrapeable registry. This is additive: everything above still drives the frozen
        // getObservabilityMetrics() shape, and this only adds a counter + histogram sample so an
        // external collector can read the same traffic. It is the path a Prometheus-style scrape
        // aggregates across replicas, which the in-process totals above cannot do.
        observeHttpRequest(metricRouteLabel(req), req.method.toUpperCase(), res.statusCode, latencyMs);
    });

    next();
}

export function getObservabilityMetrics(): MetricsSnapshot {
    const routes: MetricsSnapshot['routes'] = {};
    for (const [key, stats] of routeStats.entries()) {
        const avgLatencyMs = stats.requests ? stats.totalLatencyMs / stats.requests : 0;
        const errorRatePct = stats.requests ? (stats.errors / stats.requests) * 100 : 0;
        routes[key] = {
            requests: stats.requests,
            errors: stats.errors,
            errorRatePct: Number(errorRatePct.toFixed(2)),
            avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
            maxLatencyMs: Number(stats.maxLatencyMs.toFixed(2))
        };
    }

    const avgLatency = totalRequests ? totalLatencyMs / totalRequests : 0;
    const errorRate = totalRequests ? (totalErrors / totalRequests) * 100 : 0;

    return {
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        totals: {
            requests: totalRequests,
            errors: totalErrors,
            errorRatePct: Number(errorRate.toFixed(2)),
            avgLatencyMs: Number(avgLatency.toFixed(2)),
            p95LatencyMs: Number(percentile(latencyWindowMs, 95).toFixed(2))
        },
        routes
    };
}

/**
 * Merged snapshot: existing HTTP metrics plus the Phase 19 ingestion/alert/slow-query data.
 * WHY a separate function: getObservabilityMetrics() is consumed by existing routes, so its
 * return shape is frozen. This is purely additive.
 */
export type ObservabilitySnapshotV2 = MetricsSnapshot & {
    ingestion: ReturnType<typeof getIngestionMetrics>;
    alerts: ReturnType<typeof getAlertMetrics>;
    slowQueries: ReturnType<typeof getSlowQueryReport> & {
        trackingEnabled: boolean;
        recent: Array<{ operation: string; durationMs: number }>;
    };
};

export function getObservabilitySnapshot(): ObservabilitySnapshotV2 {
    return {
        ...getObservabilityMetrics(),
        ingestion: getIngestionMetrics(),
        alerts: getAlertMetrics(),
        slowQueries: {
            ...getSlowQueryReport(),
            trackingEnabled: isSlowQueryTrackingEnabled(),
            recent: getRecentSlowQueries()
        }
    };
}

// ---------------------------------------------------------------------------
// Scrapeable metrics endpoint
// ---------------------------------------------------------------------------

/**
 * Stable-per-process identity for the scrape payload.
 *
 * WHY: a per-process counter is only meaningful to a collector if the collector can tell replicas
 * apart, and an `instance` label is what lets `sum by (route)` produce a service-wide number. The
 * pid makes it unique per process without needing a uuid generator, and the start time makes it
 * obvious when a series resets (a restart, or a deploy).
 */
export function getInstanceIdentity(): { instance: string; pid: number; startedAt: string; uptimeSec: number } {
    return {
        instance: `${process.env.HOSTNAME || os.hostname()}-${process.pid}`,
        pid: process.pid,
        startedAt: new Date(startedAt).toISOString(),
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000)
    };
}

/**
 * Build the scrape payload. Additive: it embeds the existing snapshot and adds the registry plus
 * an explicit scope block, so a reader can tell which numbers are per-process without inferring it
 * from the field names.
 */
export function buildMetricsPayload(): ObservabilitySnapshotV2 & {
    scope: {
        level: 'process';
        instance: string;
        pid: number;
        startedAt: string;
        note: string;
        aggregatable: string[];
        processOnly: string[];
    };
    registry: ReturnType<typeof getAllMetrics>;
} {
    const identity = getInstanceIdentity();
    return {
        ...getObservabilitySnapshot(),
        scope: {
            level: 'process',
            instance: identity.instance,
            pid: identity.pid,
            startedAt: identity.startedAt,
            note:
                'All values in this payload describe THIS process only. They reset on deploy and are not shared between replicas.',
            aggregatable: [
                'registry.*.counters (monotonic, sum across instances)',
                'registry.*.histograms buckets/sum/count (sum across instances, then derive quantiles)'
            ],
            processOnly: [
                'totals.* and routes.* (derived per process; never sum or average these across instances)',
                'slowQueries.* (per-process sampling)'
            ]
        },
        registry: getAllMetrics()
    };
}

/**
 * Prometheus text exposition of every registry namespace for this process.
 *
 * WHY the const labels: `instance` and `pid` are attached to every series so a collector can sum
 * counters and histogram buckets across replicas. Without them a fleet scrape would silently blend
 * N processes into one indistinguishable series.
 */
export function renderMetricsExposition(): string {
    const identity = getInstanceIdentity();
    const constLabels = { instance: identity.instance, pid: String(identity.pid) };
    const registry = getAllMetrics();

    const lines: string[] = [
        `# HELP process_start_time_seconds Start time of this process since the unix epoch.`,
        `# TYPE process_start_time_seconds gauge`,
        `process_start_time_seconds${prometheusLabelBlock(constLabels)} ${Math.floor(startedAt / 1000)}`,
        `# HELP process_uptime_seconds Uptime of this process in seconds.`,
        `# TYPE process_uptime_seconds gauge`,
        `process_uptime_seconds${prometheusLabelBlock(constLabels)} ${identity.uptimeSec}`
    ];

    for (const [namespace, snap] of Object.entries(registry)) {
        const rendered = renderPrometheusText(snap, { ...constLabels, namespace });
        if (rendered) lines.push(rendered.trimEnd());
    }

    return `${lines.join('\n')}\n`;
}

/**
 * Optional shared-secret gate for the scrape endpoints.
 *
 * WHY: a metrics endpoint on a public hostname is an information leak — route names, status-code
 * distribution and latency percentiles describe the service's internals to anyone who asks. The
 * routes are meant to sit behind the collector, so when `METRICS_SCRAPE_TOKEN` is set the request
 * must present it. When it is unset the endpoint is open, which matches how /api/health already
 * behaves, and the deployment is expected to either set the token or keep the route internal.
 *
 * The comparison is length-checked first and then constant-time, so a wrong-length token cannot be
 * used to probe the real one byte by byte.
 */
function scrapeTokenConfigured(): string | null {
    const token = process.env.METRICS_SCRAPE_TOKEN;
    return typeof token === 'string' && token.length > 0 ? token : null;
}

function tokenMatches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/** Bearer token, or the x-metrics-token header. Returns true when access is allowed. */
function isScrapeAuthorized(req: Request): boolean {
    const expected = scrapeTokenConfigured();
    if (!expected) return true;

    const header = req.get('authorization') || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const direct = (req.get('x-metrics-token') || '').trim();
    const provided = bearer || direct;
    if (!provided) return false;
    return tokenMatches(provided, expected);
}

/**
 * GET /api/metrics — Prometheus text exposition.
 *
 * WHY this endpoint exists: everything else in this file is in-process state that resets on deploy
 * and is invisible outside the one replica that served the request. This is the surface an external
 * collector can poll, and because every series carries an `instance` label, the collector can sum
 * counters and histogram buckets across replicas to get a service-wide number. The per-process
 * gauges in the JSON view (p95, error rate) have no such property and stay per-instance.
 */
export function metricsHandler(req: Request, res: Response): void {
    if (!isScrapeAuthorized(req)) {
        res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Metrics token required' } });
        return;
    }
    res.setHeader('Content-Type', PROMETHEUS_CONTENT_TYPE);
    // A cached scrape would hand a collector stale numbers, and any intermediary cache would
    // serve one replica's data to every collector.
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(renderMetricsExposition());
}

/** GET /api/metrics.json — the same data as JSON, with an explicit scope block. */
export function metricsJsonHandler(req: Request, res: Response): void {
    if (!isScrapeAuthorized(req)) {
        res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Metrics token required' } });
        return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(buildMetricsPayload());
}



