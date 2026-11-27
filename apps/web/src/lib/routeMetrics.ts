import { after } from 'next/server';
import { logRouteResult } from './observability';

/**
 * Per-route production cost instrumentation.
 *
 * Vercel keeps 12 hours of function metrics on Hobby, and that window is not
 * the window that burns the plan. This module records the two numbers that
 * attribute cost — wall time and CPU — for each instrumented route and ships
 * them to the API, which aggregates them in Redis per UTC day for 35 days.
 *
 * CPU is measured with `process.cpuUsage()` deltas. That is a PROXY, not the
 * platform's "Fluid Active CPU": under concurrency the deltas of overlapping
 * requests include each other's work, so treat per-route shares as an upper
 * bound and compare routes to each other rather than summing absolute values
 * across a window. It is still the only per-route signal available without
 * Observability Plus.
 *
 * Never throws into a render: a metrics failure must not fail a page.
 *
 * Server components only. `after` is a route-handler API — do not import this
 * module from the Edge proxy (use `lib/observability.ts` there).
 */

export type RouteStatus = '200' | '301' | '302' | '307' | '308' | '404' | '429' | '500' | '503';

interface RouteSample {
    route: string;
    status: RouteStatus;
    ms: number;
    cpuMs: number;
    at: number;
}

const MAX_BUFFER = 500;
const FLUSH_BATCH = 200;
const REQUEST_TIMEOUT_MS = 2_000;

const buffer: RouteSample[] = [];
let flushInFlight: Promise<void> | null = null;

function nowMs(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
}

/**
 * `process.cpuUsage` is absent in the Edge runtime. Returning null there
 * degrades to duration-only rather than throwing.
 */
function cpuUsageNow(): { user: number; system: number } | null {
    try {
        if (typeof process === 'undefined' || typeof process.cpuUsage !== 'function') return null;
        return process.cpuUsage();
    } catch {
        return null;
    }
}

/**
 * Start a trace for one request. Call once at the top of the route, then
 * `trace.end(status)` at every exit. `end` is idempotent, so a branch that logs
 * and returns early does not produce a second sample.
 */
export function startRouteTrace(route: string) {
    const startedAt = nowMs();
    const cpuStart = cpuUsageNow();
    let ended = false;

    return {
        end(status: RouteStatus = '200') {
            if (ended) return;
            ended = true;

            const ms = Math.max(0, Math.round(nowMs() - startedAt));
            let cpuMs = 0;
            const cpuEnd = cpuUsageNow();
            if (cpuStart && cpuEnd) {
                cpuMs = Math.max(
                    0,
                    Math.round(((cpuEnd.user - cpuStart.user) + (cpuEnd.system - cpuStart.system)) / 1000),
                );
            }

            logRouteResult(route, status);
            enqueue({ route, status, ms, cpuMs, at: Date.now() });
        },
    };
}

function enqueue(sample: RouteSample): void {
    buffer.push(sample);
    if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
    scheduleFlush();
}

/**
 * Flush after the response has been sent, so reporting adds no latency.
 * `after()` is only valid inside a request; outside one the sample stays
 * buffered and rides along with the next instrumented request.
 */
function scheduleFlush(): void {
    if (flushInFlight) return;
    try {
        after(() => flush());
    } catch {
        // Not in a request scope — buffered until the next one.
    }
}

async function flush(): Promise<void> {
    if (flushInFlight) return flushInFlight;
    if (buffer.length === 0) return;

    const batch = buffer.splice(0, FLUSH_BATCH);
    flushInFlight = send(batch).finally(() => {
        flushInFlight = null;
    });
    return flushInFlight;
}

async function send(batch: RouteSample[]): Promise<void> {
    const apiUrl = (process.env.API_URL || '').replace(/\/+$/, '');
    const secret = process.env.INTERNAL_API_SECRET;

    // Without a sink, still emit one aggregated line so Vercel's runtime logs
    // show per-route cost while the env vars are being set up.
    if (!apiUrl || !secret) {
        emitLog(batch);
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/api/internal/route-metrics`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-api-key': secret },
            body: JSON.stringify({ samples: batch }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) emitLog(batch);
    } catch {
        emitLog(batch);
    }
}

function emitLog(batch: RouteSample[]): void {
    const byRoute = new Map<string, { count: number; ms: number; cpuMs: number }>();
    for (const sample of batch) {
        const entry = byRoute.get(sample.route) ?? { count: 0, ms: 0, cpuMs: 0 };
        entry.count += 1;
        entry.ms += sample.ms;
        entry.cpuMs += sample.cpuMs;
        byRoute.set(sample.route, entry);
    }

    const routes = Array.from(byRoute.entries()).map(([route, entry]) => ({
        route,
        count: entry.count,
        avgMs: Math.round(entry.ms / entry.count),
        avgCpuMs: Math.round(entry.cpuMs / entry.count),
    }));

    console.log(JSON.stringify({ evt: 'route_metrics', batch: batch.length, routes }));
}
