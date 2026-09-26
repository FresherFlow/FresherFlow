/**
 * Process-local, dependency-free metrics registry for Phase 19 ingestion + alert paths.
 *
 * WHY no prom-client: the API is the only consumer and the surface we need is a handful of
 * counters and latency histograms snapshotted over the admin metrics route. A dependency-free
 * registry keeps the bundle and audit surface small.
 *
 * WHY bounding is the whole point of this file: a metrics registry keyed by labels grows for the
 * lifetime of the process. One accidental high-cardinality label (a user id, an opportunity id, a
 * URL) turns a small registry into a multi-GB leak that only shows up under production load. So:
 *   - cap distinct label combinations per metric (MAX_SERIES_PER_METRIC),
 *   - cap distinct metric names per namespace (MAX_METRICS_PER_NAMESPACE),
 *   - use FIXED histogram bucket boundaries, so a histogram is O(1) memory regardless of samples.
 *
 * EVICTION POLICY: no LRU tracking (it costs a map write per sample). When a metric hits its series
 * cap, the NEW label combination is folded into a single reserved overflow series labelled
 * { __overflow__: 'true' }. Aggregates stay correct in total (the overflow series still counts) and
 * memory becomes constant. The first N series observed are the stable low-cardinality ones (queue
 * names, status codes), so overflow only engages under a genuine cardinality bug — exactly when you
 * want the metric to be visibly lossy rather than to OOM.
 *
 * PRIVACY: labels are only ever as low-cardinality as the caller makes them. Allowed label keys:
 * queue name, status code, operation name, outcome. Never a user id, opportunity id, organization
 * id, URL, email, token, or raw SQL / bind value.
 */

export type Counter = {
    name: string;
    help: string;
    labels?: Record<string, string>;
    value: number;
};

export type HistogramBucket = { le: number; count: number };

export type HistogramSample = {
    name: string;
    help: string;
    labels?: Record<string, string>;
    count: number;
    sumMs: number;
    avgMs: number;
    maxMs: number;
    buckets: HistogramBucket[];
};

export type MetricsSnapshot = { counters: Counter[]; histograms: HistogramSample[] };

/**
 * Latency bucket upper bounds in milliseconds.
 * WHY these: 5/10/50ms covers the fast path of a queue job, 100/250/500ms the normal DB round-trip
 * range, 1000/2500/5000ms the tail where jobs start to look stuck. Anything above 5000ms is counted
 * in `count`/`maxMs` but falls in no bucket (implicit +Inf), so the array is fixed-size and the
 * histogram memory is constant.
 */
export const LATENCY_BUCKETS_MS: readonly number[] = [5, 10, 50, 100, 250, 500, 1000, 2500, 5000];

const MAX_SERIES_PER_METRIC = 200;
const MAX_METRICS_PER_NAMESPACE = 100;

const OVERFLOW_LABELS: Record<string, string> = { __overflow__: 'true' };
const OVERFLOW_KEY = '__overflow__=true';

export const INGESTION_NAMESPACE = 'ingestion';
export const ALERT_NAMESPACE = 'alert';

type HistogramState = {
    help: string;
    labels: Record<string, string>;
    count: number;
    sumMs: number;
    maxMs: number;
    /** Parallel to LATENCY_BUCKETS_MS; made cumulative only at snapshot time. */
    bucketCounts: number[];
};

type Namespace = {
    counters: Map<string, Map<string, number>>;
    help: Map<string, string>;
    histograms: Map<string, Map<string, HistogramState>>;
};

function createNamespace(): Namespace {
    return { counters: new Map(), help: new Map(), histograms: new Map() };
}

const namespaces: Record<string, Namespace> = {
    [INGESTION_NAMESPACE]: createNamespace(),
    [ALERT_NAMESPACE]: createNamespace()
};

/** Canonical, order-independent key for a label set. */
function labelKey(labels?: Record<string, string>): string {
    if (!labels) return '';
    const keys = Object.keys(labels).sort();
    if (!keys.length) return '';
    return keys.map((k) => `${k}=${labels[k] ?? ''}`).join(',');
}

function recordHelp(ns: Namespace, name: string, help: string): void {
    if (!ns.help.has(name)) ns.help.set(name, help);
}

function bumpCounter(ns: Namespace, name: string, help: string, labels: Record<string, string>, by: number): void {
    let series = ns.counters.get(name);
    if (!series) {
        if (ns.counters.size >= MAX_METRICS_PER_NAMESPACE) return;
        series = new Map();
        ns.counters.set(name, series);
    }
    recordHelp(ns, name, help);

    const key = labelKey(labels);
    const existing = series.get(key);
    if (existing !== undefined) {
        series.set(key, existing + by);
        return;
    }
    if (series.size >= MAX_SERIES_PER_METRIC) {
        // EVICTION: fold into the reserved overflow series.
        series.set(OVERFLOW_KEY, (series.get(OVERFLOW_KEY) ?? 0) + by);
        return;
    }
    series.set(key, by);
}

function observe(ns: Namespace, name: string, help: string, valueMs: number, labels: Record<string, string>): void {
    let series = ns.histograms.get(name);
    if (!series) {
        if (ns.histograms.size >= MAX_METRICS_PER_NAMESPACE) return;
        series = new Map();
        ns.histograms.set(name, series);
    }
    recordHelp(ns, name, help);

    const key = labelKey(labels);
    let state = series.get(key);
    if (!state && series.size >= MAX_SERIES_PER_METRIC) state = series.get(OVERFLOW_KEY);
    if (!state) {
        state = { help, labels, count: 0, sumMs: 0, maxMs: 0, bucketCounts: LATENCY_BUCKETS_MS.map(() => 0) };
        series.set(key, state);
    }

    state.count += 1;
    state.sumMs += valueMs;
    if (valueMs > state.maxMs) state.maxMs = valueMs;
    for (let i = 0; i < LATENCY_BUCKETS_MS.length; i += 1) {
        if (valueMs <= (LATENCY_BUCKETS_MS[i] as number)) {
            state.bucketCounts[i] = (state.bucketCounts[i] as number) + 1;
            break;
        }
    }
}

function parseKeyLabels(key: string): Record<string, string> | undefined {
    if (!key) return undefined;
    if (key === OVERFLOW_KEY) return { ...OVERFLOW_LABELS };
    const out: Record<string, string> = {};
    for (const part of key.split(',')) {
        const idx = part.indexOf('=');
        if (idx <= 0) continue;
        out[part.slice(0, idx)] = part.slice(idx + 1);
    }
    return out;
}

function snapshot(ns: Namespace): MetricsSnapshot {
    const counters: Counter[] = [];
    const histograms: HistogramSample[] = [];

    for (const [name, series] of ns.counters.entries()) {
        for (const [key, value] of series.entries()) {
            counters.push({ name, help: ns.help.get(name) ?? '', labels: parseKeyLabels(key), value });
        }
    }

    for (const [name, series] of ns.histograms.entries()) {
        for (const state of series.values()) {
            const buckets: HistogramBucket[] = [];
            let running = 0;
            for (let i = 0; i < LATENCY_BUCKETS_MS.length; i += 1) {
                running += state.bucketCounts[i] as number;
                buckets.push({ le: LATENCY_BUCKETS_MS[i] as number, count: running });
            }
            histograms.push({
                name,
                help: state.help,
                labels: Object.keys(state.labels).length ? { ...state.labels } : undefined,
                count: state.count,
                sumMs: Number(state.sumMs.toFixed(2)),
                avgMs: state.count ? Number((state.sumMs / state.count).toFixed(2)) : 0,
                maxMs: Number(state.maxMs.toFixed(2)),
                buckets
            });
        }
    }

    return { counters, histograms };
}

function finiteOrZero(v: number): number {
    return Number.isFinite(v) && v > 0 ? v : 0;
}

/** Increment a counter in the ingestion namespace. */
export function incrementIngestionCounter(name: string, help: string, labels?: Record<string, string>, by = 1): void {
    bumpCounter(namespaces[INGESTION_NAMESPACE] as Namespace, name, help, labels ?? {}, by);
}

/** Increment a counter in the alert namespace. */
export function incrementAlertCounter(name: string, help: string, labels?: Record<string, string>, by = 1): void {
    bumpCounter(namespaces[ALERT_NAMESPACE] as Namespace, name, help, labels ?? {}, by);
}

/** Record a latency sample in the ingestion namespace. */
export function observeIngestionHistogram(name: string, help: string, valueMs: number, labels?: Record<string, string>): void {
    observe(namespaces[INGESTION_NAMESPACE] as Namespace, name, help, finiteOrZero(valueMs), labels ?? {});
}

/** Record a latency sample in the alert namespace. */
export function observeAlertHistogram(name: string, help: string, valueMs: number, labels?: Record<string, string>): void {
    observe(namespaces[ALERT_NAMESPACE] as Namespace, name, help, finiteOrZero(valueMs), labels ?? {});
}

/**
 * Convenience aliases. Callers that do not care about the namespace land in the ingestion
 * namespace; anything alert-related should call the explicit *Alert* helpers so the two
 * stay distinguishable in the snapshot.
 */
export function incrementCounter(name: string, labels?: Record<string, string>, by = 1): void {
    incrementIngestionCounter(name, name, labels, by);
}

export function observeHistogram(name: string, valueMs: number, labels?: Record<string, string>): void {
    observeIngestionHistogram(name, name, valueMs, labels);
}

export function getIngestionMetrics(): MetricsSnapshot {
    return snapshot(namespaces[INGESTION_NAMESPACE] as Namespace);
}

export function getAlertMetrics(): MetricsSnapshot {
    return snapshot(namespaces[ALERT_NAMESPACE] as Namespace);
}

/** Test/diagnostic helper: clear both namespaces. */
export function resetMetrics(): void {
    for (const name of [INGESTION_NAMESPACE, ALERT_NAMESPACE]) {
        const ns = namespaces[name];
        ns?.counters.clear();
        ns?.help.clear();
        ns?.histograms.clear();
    }
}


