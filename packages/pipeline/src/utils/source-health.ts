import { downloadJsonFromR2, uploadJsonToR2 } from '@fresherflow/utils/r2';

// ─────────────────────────────────────────────────────────────────────────────
// Source health ledger — per-source fetch + yield history in R2.
// ─────────────────────────────────────────────────────────────────────────────
// Problem it solves: per-run counters (ats_raw, agg_raw, channel yield) die
// with the run logs. A source yielding 0 jobs is then indistinguishable from
// a broken source (fetch failing). This ledger records FETCH health alongside
// yield, so "dead" and "healthy but idle" read differently.
//
// Design rules (reliability first):
// - Best-effort only: every public function never throws. A ledger failure
//   must never fail or slow a discovery run.
// - Always R2 (never the local state backend): this is durable history, and
//   both scheduled bots have R2 credentials. Missing bucket/creds → warn + skip.
// - Two files split by writer kind (ats.json vs aggregators.json) so the ATS
//   bot and aggregator bot never read-modify-write the same object.
// - Entries merge PER DAY (IST calendar): 4 runs/day stay one entry per
//   source per day. Same-day re-saves adjust totals instead of double counting.
// - Test/dry runs never write: `--test` in argv disables the save.
// - Days capped (120 entries ≈ 30 days at 4 runs/day); lifetime totals are
//   running counters so capping loses no totals.

export type SourceFetch = 'ok' | 'empty' | 'error' | 'skipped';
export type SourceKind = 'ats' | 'site' | 'channel';

export interface SourceRunDay {
    d: string; // YYYY-MM-DD (IST)
    fetch: SourceFetch;
    links: number; // links/posts seen from this source that day
    jobs: number; // verified jobs out (accepted)
    review: number; // verified jobs out needing review
    err?: string; // short error, fetch=error only
}

export interface SourceHealthRecord {
    id: string; // 'ats:greenhouse' | 'site:Naukri' | 'channel:xyz'
    kind: SourceKind;
    name: string;
    firstSeen: string; // YYYY-MM-DD
    totalLinks: number;
    totalJobs: number;
    days: SourceRunDay[];
}

export interface HealthLedger {
    version: 1;
    updatedAt: string;
    configured: string[]; // source ids configured this run (unioned, capped)
    sources: Record<string, SourceHealthRecord>;
}

const MAX_DAY_ENTRIES = 120;
const MAX_CONFIGURED = 300;
const R2_PREFIX = 'discovery-state/health/';

function ledgerKey(kind: SourceKind): string {
    return R2_PREFIX + (kind === 'ats' ? 'ats.json' : 'aggregators.json');
}

/** IST calendar day (India has no DST — fixed +5:30 is exact). */
export function istDay(ts: number = Date.now()): string {
    const ist = new Date(ts + 5.5 * 60 * 60 * 1000);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ist.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Ledger id for a discovery origin. Single mapping — dashboard must reuse it. */
export function ledgerIdFor(source: string, sourceType: 'ATS' | 'AGGREGATOR'): string {
    if (sourceType === 'ATS') return `ats:${source}`;
    if (source.startsWith('channel-')) return `channel:${source.slice('channel-'.length)}`;
    return `site:${source}`;
}

function splitId(id: string): { kind: SourceKind; name: string } {
    if (id.startsWith('ats:')) return { kind: 'ats', name: id.slice(4) };
    if (id.startsWith('channel:')) return { kind: 'channel', name: id.slice(8) };
    if (id.startsWith('site:')) return { kind: 'site', name: id.slice(5) };
    return { kind: 'site', name: id };
}

// ─── In-run collector (module singleton: one run per process) ────────────────

interface PendingFetch {
    kind: SourceKind;
    name: string;
    fetch: SourceFetch;
    links: number;
    err?: string;
}

const pendingFetches = new Map<string, PendingFetch>();
const configuredIds = new Set<string>();

function shortErr(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.slice(0, 160);
}

/** Record one source's fetch outcome for this run. Overwrites on repeat. */
export function recordSourceFetch(
    id: string,
    fetch: SourceFetch,
    links: number,
    err?: unknown,
): void {
    try {
        const { kind, name } = splitId(id);
        pendingFetches.set(id, {
            kind,
            name,
            fetch,
            links: Math.max(0, Math.floor(links)),
            err: fetch === 'error' ? shortErr(err ?? 'unknown error') : undefined,
        });
    } catch {
        // Collector must never break a run.
    }
}

/** Record the ids configured this run (unioned into the ledger file). */
export function markConfigured(ids: string[]): void {
    try {
        for (const id of ids) {
            if (typeof id === 'string' && id) configuredIds.add(id);
        }
    } catch {
        // Collector must never break a run.
    }
}

function getBucket(): string {
    return (process.env.R2_BUCKET_NAME || '').trim();
}

function emptyLedger(): HealthLedger {
    return { version: 1, updatedAt: new Date().toISOString(), configured: [], sources: {} };
}

async function loadLedgerFile(key: string, bucket: string): Promise<HealthLedger> {
    try {
        const data = await downloadJsonFromR2(bucket, key);
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            const ledger = data as Partial<HealthLedger>;
            if (ledger.sources && typeof ledger.sources === 'object') {
                return {
                    version: 1,
                    updatedAt: typeof ledger.updatedAt === 'string' ? ledger.updatedAt : new Date().toISOString(),
                    configured: Array.isArray(ledger.configured) ? ledger.configured.filter((s): s is string => typeof s === 'string') : [],
                    sources: ledger.sources as Record<string, SourceHealthRecord>,
                };
            }
        }
    } catch {
        // Missing/corrupt ledger starts fresh — history loss is logged below.
        console.warn(`[health] Ledger ${key} unreadable — starting fresh.`);
    }
    return emptyLedger();
}

function ensureRecord(ledger: HealthLedger, id: string): SourceHealthRecord {
    let rec = ledger.sources[id];
    if (!rec || typeof rec !== 'object') {
        const { kind, name } = splitId(id);
        const today = istDay();
        rec = { id, kind, name, firstSeen: today, totalLinks: 0, totalJobs: 0, days: [] };
        ledger.sources[id] = rec;
    }
    if (!Array.isArray(rec.days)) rec.days = [];
    return rec;
}

// Worse fetch wins when merging a day's repeated runs.
const FETCH_RANK: Record<SourceFetch, number> = { error: 0, ok: 1, empty: 2, skipped: 3 };

/** Exported for unit tests — merges one day-entry, keeping totals exact. */
export function applyDay(rec: SourceHealthRecord, day: string, fetch: SourceFetch, links: number, jobs: number, review: number, err?: string): void {
    let entry = rec.days.find((e) => e.d === day);
    if (entry) {
        // Same-day re-save (e.g. manual re-run): back out old values first so
        // running totals never double count, then add back the merged entry.
        rec.totalLinks = Math.max(0, rec.totalLinks - entry.links);
        rec.totalJobs = Math.max(0, rec.totalJobs - entry.jobs);
        entry.links += links;
        entry.jobs += jobs;
        entry.review += review;
        if (FETCH_RANK[fetch] < FETCH_RANK[entry.fetch]) {
            entry.fetch = fetch;
            if (err) entry.err = err;
        } else if (fetch === 'error' && !entry.err && err) {
            entry.err = err;
        }
        rec.totalLinks += entry.links;
        rec.totalJobs += entry.jobs;
    } else {
        entry = { d: day, fetch, links, jobs, review };
        if (err) entry.err = err;
        rec.days.push(entry);
        rec.days.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
        if (rec.days.length > MAX_DAY_ENTRIES) {
            rec.days.splice(0, rec.days.length - MAX_DAY_ENTRIES);
        }
        rec.totalLinks += links;
        rec.totalJobs += jobs;
    }
}

export interface TallyJob {
    source: string;
    sourceType: 'ATS' | 'AGGREGATOR';
    reviewRequired?: boolean;
}

/**
 * Merge this run's fetch records + verified jobs into both R2 ledger files.
 * Never throws; skips silently with a warning when R2 is unavailable or this
 * is a `--test` dry run.
 */
export async function saveHealthLedger(jobs: TallyJob[]): Promise<void> {
    try {
        if (process.argv.includes('--test')) {
            console.log('[health] --test run — ledger write skipped.');
            return;
        }
        const bucket = getBucket();
        if (!bucket) {
            console.warn('[health] R2_BUCKET_NAME not set — ledger write skipped.');
            return;
        }
        if (pendingFetches.size === 0 && (!Array.isArray(jobs) || jobs.length === 0) && configuredIds.size === 0) {
            console.log('[health] Nothing to record — ledger write skipped.');
            return;
        }

        const today = istDay();
        const tally = new Map<string, { jobs: number; review: number }>();
        for (const j of jobs || []) {
            if (!j || typeof j.source !== 'string' || !j.source) continue;
            const id = ledgerIdFor(j.source, j.sourceType === 'ATS' ? 'ATS' : 'AGGREGATOR');
            const t = tally.get(id) || { jobs: 0, review: 0 };
            if (j.reviewRequired) t.review++;
            else t.jobs++;
            tally.set(id, t);
        }

        // Split by destination file: ats.json holds ats:* only, so the ATS bot
        // and aggregator bot never read-modify-write the same object.
        const byFile = new Map<string, { kind: SourceKind; ids: Set<string> }>();
        const fileFor = (kind: SourceKind): string => ledgerKey(kind);
        const collect = (id: string, kind: SourceKind): void => {
            const key = fileFor(kind);
            let slot = byFile.get(key);
            if (!slot) {
                slot = { kind, ids: new Set<string>() };
                byFile.set(key, slot);
            }
            slot.ids.add(id);
        };
        for (const [id, p] of pendingFetches) collect(id, p.kind);
        for (const id of tally.keys()) collect(id, splitId(id).kind);

        for (const [key, slot] of byFile) {
            const ledger = await loadLedgerFile(key, bucket);
            for (const id of slot.ids) {
                const rec = ensureRecord(ledger, id);
                const p = pendingFetches.get(id);
                const t = tally.get(id) || { jobs: 0, review: 0 };
                applyDay(
                    rec,
                    today,
                    p ? p.fetch : 'skipped',
                    p ? p.links : 0,
                    t.jobs,
                    t.review,
                    p?.err,
                );
            }
            for (const id of configuredIds) {
                const { kind } = splitId(id);
                if (fileFor(kind) !== key) continue;
                ensureRecord(ledger, id);
            }
            const merged = Array.from(new Set([...ledger.configured, ...configuredIds])).slice(-MAX_CONFIGURED);
            ledger.configured = merged;
            ledger.updatedAt = new Date().toISOString();
            await uploadJsonToR2(ledger, bucket, key);
            console.log(`[health] Saved ${slot.ids.size} source(s) to R2 ${key}.`);
        }
    } catch (err) {
        console.warn('[health] Ledger write failed (non-fatal):', err instanceof Error ? err.message : err);
    } finally {
        pendingFetches.clear();
        configuredIds.clear();
    }
}

/** Reader for dashboards/digests. Returns null when unavailable — never throws. */
export async function loadHealthLedger(kind: SourceKind): Promise<HealthLedger | null> {
    try {
        const bucket = getBucket();
        if (!bucket) return null;
        const ledger = await loadLedgerFile(ledgerKey(kind), bucket);
        return Object.keys(ledger.sources).length > 0 ? ledger : null;
    } catch {
        return null;
    }
}
