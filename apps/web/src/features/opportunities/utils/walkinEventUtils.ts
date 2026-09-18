import type { Opportunity } from '@fresherflow/types';
import { parseWalkinDateRange } from './walkinMapUtils';

/**
 * Walk-in event-date engine.
 *
 * Pure helpers shared by the board (date grouping), cards (next-drive badge),
 * and the calendar page. No React, no side effects — safe to import anywhere.
 *
 * Date sources on a walk-in opportunity, in priority order:
 *  1. walkInDetails.dates[]   — explicit ISO dates (schema field, indexed)
 *  2. walkInDetails.dateRange — human string, parsed via parseWalkinDateRange
 *  3. walkInDetails.expiryDate
 *
 * All comparisons use LOCAL midnight boundaries (users think in their own
 * calendar), matching isStaleWalkin/isWalkinInPeriod conventions.
 */

export interface WalkinDateBucket {
    key: 'today' | 'tomorrow' | 'thisWeekend' | 'thisWeek' | 'later';
    label: string;
}

export const WALKIN_BUCKETS: WalkinDateBucket[] = [
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'thisWeekend', label: 'This Weekend' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'later', label: 'Later' },
];

function startOfLocalDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function endOfLocalDay(d: Date): number {
    return startOfLocalDay(d) + 24 * 60 * 60 * 1000 - 1;
}

/**
 * All concrete dates a drive happens on (expanded), ascending, deduped by day.
 * Returns [] when nothing parseable exists.
 */
export function getWalkinDates(opp: Opportunity): Date[] {
    const d = opp.walkInDetails as
        | { dates?: unknown; dateRange?: string; expiryDate?: unknown }
        | undefined;
    const out: Date[] = [];

    if (d && Array.isArray(d.dates)) {
        for (const raw of d.dates) {
            const dt = new Date(String(raw));
            if (!Number.isNaN(dt.getTime())) out.push(dt);
        }
    }

    if (out.length === 0 && d?.dateRange) {
        const parsed = parseWalkinDateRange(d.dateRange);
        if (parsed) {
            for (let t = startOfLocalDay(parsed.start); t <= startOfLocalDay(parsed.end); t += 86_400_000) {
                out.push(new Date(t));
            }
        }
    }

    if (out.length === 0 && d?.expiryDate) {
        const dt = new Date(String(d.expiryDate));
        if (!Number.isNaN(dt.getTime())) out.push(dt);
    }

    // Dedupe by local day, ascending
    const seen = new Set<number>();
    return out
        .map((dt) => new Date(startOfLocalDay(dt)))
        .filter((dt) => {
            const t = dt.getTime();
            if (seen.has(t)) return false;
            seen.add(t);
            return true;
        })
        .sort((a, b) => a.getTime() - b.getTime());
}

/**
 * The next upcoming drive date (>= start of today), or null when the drive
 * has no upcoming date left.
 */
export function getNextWalkinDate(opp: Opportunity): Date | null {
    const todayStart = startOfLocalDay(new Date());
    const upcoming = getWalkinDates(opp).find((d) => d.getTime() >= todayStart);
    return upcoming ?? null;
}

/**
 * Short badge label for the next drive date.
 * "Today" / "Tomorrow" / "Sat, 19 Sep" / "19 Sep".
 */
export function formatNextWalkinLabel(opp: Opportunity): string | null {
    const next = getNextWalkinDate(opp);
    if (!next) return null;
    const todayStart = startOfLocalDay(new Date());
    const dayDiff = Math.round((next.getTime() - todayStart) / 86_400_000);
    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Tomorrow';
    return next.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Which bucket a date falls into, relative to now. */
export function bucketForDate(date: Date): WalkinDateBucket['key'] {
    const now = new Date();
    const todayStart = startOfLocalDay(now);
    const t = date.getTime();

    if (t < todayStart + 86_400_000) return 'today';
    if (t < todayStart + 2 * 86_400_000) return 'tomorrow';

    // Weekend = Saturday/Sunday within the next 7 days
    const dayDiff = Math.round((t - todayStart) / 86_400_000);
    const dow = date.getDay(); // 0 Sun, 6 Sat
    if (dayDiff < 7 && (dow === 0 || dow === 6)) return 'thisWeekend';
    if (dayDiff < 7) return 'thisWeek';
    return 'later';
}

/**
 * Group walk-ins into ordered date buckets for the event board.
 * Input must already be in display order (date-ascending). Items with no
 * upcoming date are dropped — they are dead drives (expiry cron removes them
 * server-side; this is the client-side safety net).
 */
export function groupWalkinsByDate(opps: Opportunity[]): Array<{ bucket: WalkinDateBucket; items: Opportunity[] }> {
    const groups = new Map<WalkinDateBucket['key'], Opportunity[]>();
    for (const opp of opps) {
        const next = getNextWalkinDate(opp);
        if (!next) continue; // dead drive — skip
        const key = bucketForDate(next);
        const list = groups.get(key);
        if (list) list.push(opp);
        else groups.set(key, [opp]);
    }
    return WALKIN_BUCKETS.filter((b) => groups.has(b.key)).map((b) => ({ bucket: b, items: groups.get(b.key)! }));
}
