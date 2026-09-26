/**
 * Slow-query visibility for the API process.
 *
 * PRIVACY (the important part): we aggregate by OPERATION NAME ONLY. The SQL text, the bind
 * values and the result rows are never passed in, never stored and never logged. A query log
 * keyed by SQL text is a data-leak waiting to happen — SQL routinely embeds emails, tokens and
 * company names in a WHERE clause or an IN list. Callers pass the Prisma model/method they
 * invoked (e.g. "opportunity.findMany"), which is a fixed, code-controlled, low-cardinality
 * string. That is the same reason we never accept a `query`/`sql` parameter at all: making it
 * impossible to pass raw SQL is stronger than documenting that you shouldn't.
 *
 * COST: tracking is opt-in via SLOW_QUERY_TRACKING_ENABLED and defaults OFF. When off,
 * recordQueryDuration is a single boolean check and allocates nothing.
 *
 * MEMORY: two bounded structures, both fixed-size.
 *   - MAX_OPERATIONS distinct operation aggregates. A new operation beyond the cap is folded
 *     into the reserved '__overflow__' aggregate (same overflow policy as metrics.ts).
 *   - RECENT_BUFFER_LIMIT recent slow-write records in a fixed circular buffer. Once full the
 *     oldest entry is overwritten. This is a ring, not an array that grows, so memory is O(1).
 */

const MAX_OPERATIONS = 100;
const RECENT_BUFFER_LIMIT = 200;
const OVERFLOW_OPERATION = '__overflow__';
/** Default "this query is slow" bar, in ms. */
const SLOW_THRESHOLD_MS = 200;

export type SlowQueryEntry = { operation: string; durationMs: number };

type OperationAgg = { count: number; totalMs: number; maxMs: number; lastMs: number };

let enabled = false;
let sampled = 0;
let slow = 0;
const operations = new Map<string, OperationAgg>();
/** Circular buffer, newest write wins the free slot once full. */
const recent: SlowQueryEntry[] = new Array<SlowQueryEntry>(RECENT_BUFFER_LIMIT);
let recentCursor = 0;

function envFlag(name: string): boolean {
    const raw = process.env[name];
    return typeof raw === 'string' && (raw === '1' || raw.toLowerCase() === 'true');
}

function normalizeOperation(operation: string): string {
    const trimmed = (operation ?? '').trim();
    if (!trimmed) return OVERFLOW_OPERATION;
    // WHY clamp length: operation names are code-controlled, but a dynamic caller could build
    // one from data. Clamping keeps a single key small even if someone misuses the API.
    return trimmed.length > 64 ? trimmed.slice(0, 64) : trimmed;
}

/**
 * Opt-in switch. Default OFF: without SLOW_QUERY_TRACKING_ENABLED=true, recordQueryDuration
 * costs one boolean check and allocates nothing.
 */
export function startSlowQueryTracking(): void {
    enabled = envFlag('SLOW_QUERY_TRACKING_ENABLED');
}

export function stopSlowQueryTracking(): void {
    enabled = false;
}

export function isSlowQueryTrackingEnabled(): boolean {
    return enabled;
}

/**
 * Record one query duration. No-op (single boolean check) when tracking is off.
 * @param labels optional low-cardinality labels; retained only as a count, never as identity.
 */
export function recordQueryDuration(durationMs: number, operation: string, labels?: Record<string, string>): void {
    if (!enabled) return;
    if (!Number.isFinite(durationMs) || durationMs < 0) return;

    let op = normalizeOperation(operation);
    sampled += 1;

    let agg = operations.get(op);
    if (!agg) {
        if (operations.size >= MAX_OPERATIONS) {
            op = OVERFLOW_OPERATION;
            agg = operations.get(op);
        }
        if (!agg) {
            agg = { count: 0, totalMs: 0, maxMs: 0, lastMs: 0 };
            operations.set(op, agg);
        }
    }
    agg.count += 1;
    agg.totalMs += durationMs;
    agg.lastMs = durationMs;
    if (durationMs > agg.maxMs) agg.maxMs = durationMs;

    if (durationMs >= SLOW_THRESHOLD_MS) {
        slow += 1;
        recent[recentCursor] = { operation: op, durationMs: Math.round(durationMs * 100) / 100 };
        recentCursor = (recentCursor + 1) % RECENT_BUFFER_LIMIT;
    }
    // `labels` is accepted for call-site symmetry with metrics.ts but deliberately not stored:
    // storing arbitrary label sets is exactly the cardinality leak this module avoids.
    void labels;
}

export function getSlowQueryReport(thresholdMs = 200): {
    thresholdMs: number;
    sampled: number;
    slow: number;
    slowPct: number;
    slowest: Array<{ operation: string; durationMs: number; count: number }>;
} {
    const threshold = Number.isFinite(thresholdMs) && thresholdMs > 0 ? thresholdMs : SLOW_THRESHOLD_MS;

    const slowest = [...operations.entries()]
        .map(([operation, agg]) => ({
            operation,
            durationMs: Math.round(agg.maxMs * 100) / 100,
            count: agg.count
        }))
        .filter((row) => row.durationMs >= threshold)
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 20);

    return {
        thresholdMs: threshold,
        sampled,
        slow,
        slowPct: sampled ? Number(((slow / sampled) * 100).toFixed(2)) : 0,
        slowest
    };
}

/** Most recent slow writes, newest first. Bounded by RECENT_BUFFER_LIMIT. */
export function getRecentSlowQueries(): SlowQueryEntry[] {
    const out: SlowQueryEntry[] = [];
    for (let i = 0; i < recent.length; i += 1) {
        const idx = (recentCursor + i) % recent.length;
        const entry = recent[idx];
        if (entry) out.push(entry);
    }
    return out.reverse();
}

/** Test/diagnostic helper. */
export function resetSlowQueryTracking(): void {
    sampled = 0;
    slow = 0;
    operations.clear();
    recent.fill(undefined as unknown as SlowQueryEntry);
    recentCursor = 0;
}
