import type { Opportunity } from '@fresherflow/types';

const FEED_CACHE_KEY = 'ff_feed_cache_v2';
const MAX_ITEMS = 250;
const LEGACY_SCOPE = 'all';

type FeedCachePayload = {
    cachedAt: number;
    opportunities: Opportunity[];
    count: number;
};

function normalizeScope(scope?: string | null) {
    return (scope || LEGACY_SCOPE).toLowerCase().trim() || LEGACY_SCOPE;
}

function scopedKey(scope?: string | null) {
    return `${FEED_CACHE_KEY}:${normalizeScope(scope)}`;
}

function getOppSortTime(opp: Opportunity) {
    const updated = (opp as Opportunity & { updatedAt?: string | Date }).updatedAt;
    if (updated) return new Date(updated).getTime();
    return new Date(opp.postedAt).getTime();
}

function mergeUnique(existing: Opportunity[], incoming: Opportunity[]) {
    const byId = new Map<string, Opportunity>();
    for (const opp of [...existing, ...incoming]) {
        const current = byId.get(opp.id);
        if (!current) {
            byId.set(opp.id, opp);
            continue;
        }
        if (getOppSortTime(opp) >= getOppSortTime(current)) {
            byId.set(opp.id, opp);
        }
    }
    return [...byId.values()]
        .sort((a, b) => getOppSortTime(b) - getOppSortTime(a))
        .slice(0, MAX_ITEMS);
}

export function saveFeedCache(opportunities: Opportunity[], count: number, scope?: string | null) {
    if (typeof window === 'undefined') return;
    const payload: FeedCachePayload = {
        cachedAt: Date.now(),
        opportunities: opportunities.slice(0, MAX_ITEMS),
        count
    };
    try {
        localStorage.setItem(scopedKey(scope), JSON.stringify(payload));
        // Keep a broad fallback cache for older readers and "all" tab.
        if (normalizeScope(scope) !== LEGACY_SCOPE) {
            localStorage.setItem(scopedKey(LEGACY_SCOPE), JSON.stringify(payload));
        }
    } catch {
        // Ignore storage failures in private mode/quota pressure.
    }
}

export function mergeFeedCache(opportunities: Opportunity[], count: number, scope?: string | null) {
    if (typeof window === 'undefined') return;
    const existing = readFeedCache(scope);
    const merged = mergeUnique(existing?.opportunities || [], opportunities);
    const payload: FeedCachePayload = {
        cachedAt: Date.now(),
        opportunities: merged,
        count: Math.max(count, existing?.count || 0, merged.length)
    };
    try {
        localStorage.setItem(scopedKey(scope), JSON.stringify(payload));
        if (normalizeScope(scope) !== LEGACY_SCOPE) {
            localStorage.setItem(scopedKey(LEGACY_SCOPE), JSON.stringify(payload));
        }
    } catch {
        // Ignore storage failures in private mode/quota pressure.
    }
}

export function readFeedCache(scope?: string | null): FeedCachePayload | null {
    if (typeof window === 'undefined') return null;
    try {
        const rawScoped = localStorage.getItem(scopedKey(scope));
        const rawLegacy = localStorage.getItem(FEED_CACHE_KEY); // fallback for older versions
        const rawAll = localStorage.getItem(scopedKey(LEGACY_SCOPE));
        const raw = rawScoped || rawLegacy || rawAll;
        if (!raw) return null;
        const parsed = JSON.parse(raw) as FeedCachePayload;
        if (!Array.isArray(parsed.opportunities) || typeof parsed.cachedAt !== 'number') return null;
        return parsed;
    } catch {
        return null;
    }
}
