import { fetchRawMetricsStats } from '../../infrastructure/database/adminMetrics.repo';
import { getObservabilityMetrics } from '../../middleware/observability';
import redis from '@fresherflow/redis';

export type MetricsWindow = '24h' | '7d' | '14d' | '30d';

type StatusStatRow = { status: string | null; _count: number };
type LinkHealthRow = { linkHealth: string | null; _count: number };
type GrowthStatRow = { event: string; _count: { _all: number } };
type ChannelSourceRow = { source: string | null; _count: { _all: number } };
type RecentListingRow = {
    id: string;
    slug: string | null;
    title: string;
    company: string;
    type: string;
    status: string;
    postedAt: Date;
};
type UserMaxRow = { userId: string | null; _max: { createdAt: Date | null } };
type AlertUserRow = { userId: string | null };

const CACHE_KEY_PREFIX = 'admin:metrics:v2:';
const CACHE_TTL_SECONDS = 300;

function toWindowStart(window: MetricsWindow): Date {
    const now = Date.now();
    if (window === '24h') return new Date(now - 24 * 60 * 60 * 1000);
    if (window === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
    if (window === '14d') return new Date(now - 14 * 24 * 60 * 60 * 1000);
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

function toPercent(numerator: number, denominator: number): number {
    if (!denominator) return 0;
    return Math.round((numerator / denominator) * 100);
}

function getRouteMetrics() {
    const snapshot = getObservabilityMetrics();
    const routeMetrics = Object.entries(snapshot.routes).map(([route, values]) => ({
        route, ...values,
    }));
    const topSlowRoutes = routeMetrics
        .filter((row) => row.requests >= 5)
        .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)
        .slice(0, 5);
    const topErrorRoutes = routeMetrics
        .filter((row) => row.errors > 0)
        .sort((a, b) => b.errorRatePct - a.errorRatePct)
        .slice(0, 5);
    return { totals: snapshot.totals, topSlowRoutes, topErrorRoutes };
}

export async function getAdminMetricsV2(window: MetricsWindow) {
    const cacheKey = CACHE_KEY_PREFIX + window;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch {
        // Ignore cache read failures and fall back to live metrics.
    }

    const nowMs = Date.now();
    const oneDayAgo = new Date(nowMs - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(nowMs - 14 * 24 * 60 * 60 * 1000);
    const windowStart = toWindowStart(window);

    const results = await fetchRawMetricsStats(windowStart);

    const [
        statusStats, deletedCount, new24hCount, linkHealthStats,
        applications30d, newUsers30d, bookmarks7d, growthStats,
        viewedActionsWindow, applyClicksWindow, savedWindow,
        channelSources30d, recentListings, actionUsers14dCount,
        savedUsers14dCount, clickUsers14dCount, alertUsers14dCount,
        pendingSubmissions, live, liveWalkins, expired
    ] = results as [
        StatusStatRow[],
        number,
        number,
        LinkHealthRow[],
        number,
        number,
        number,
        GrowthStatRow[],
        number,
        number,
        number,
        ChannelSourceRow[],
        RecentListingRow[],
        UserMaxRow[],
        UserMaxRow[],
        UserMaxRow[],
        AlertUserRow[],
        number,
        number,
        number,
        number
    ];

    const stats: Record<string, number> = { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 };
    for (const s of statusStats) { if (s.status) stats[s.status] = s._count; }

    const linkHealth = { healthy: 0, retrying: 0, broken: 0 };
    for (const row of linkHealthStats) {
        if (row.linkHealth === 'HEALTHY') linkHealth.healthy = row._count;
        if (row.linkHealth === 'RETRYING') linkHealth.retrying = row._count;
        if (row.linkHealth === 'BROKEN') linkHealth.broken = row._count;
    }

    const funnelMap = new Map<string, number>();
    for (const row of growthStats) { funnelMap.set(row.event, row._count._all); }
    const detailView = Math.max(funnelMap.get('DETAIL_VIEW') || 0, viewedActionsWindow);
    const loginView = funnelMap.get('LOGIN_VIEW') || 0;
    const authSuccess = funnelMap.get('AUTH_SUCCESS') || 0;
    const applyClick = Math.max(funnelMap.get('APPLY_CLICK') || 0, applyClicksWindow);
    const saveJob = Math.max(funnelMap.get('SAVE_JOB') || 0, savedWindow);

    const sourceBuckets = { telegram: 0, whatsapp: 0, linkedin: 0, others: 0 };
    for (const row of channelSources30d) {
        const source = (row.source || '').toLowerCase();
        if (source.includes('telegram')) sourceBuckets.telegram += row._count._all;
        else if (source.includes('whatsapp')) sourceBuckets.whatsapp += row._count._all;
    }

    const activitySignals: Array<{ userId: string; createdAt: Date }> = [];
    for (const row of actionUsers14dCount) { if (row.userId && row._max.createdAt) activitySignals.push({ userId: row.userId, createdAt: row._max.createdAt }); }
    for (const row of savedUsers14dCount) { if (row.userId && row._max.createdAt) activitySignals.push({ userId: row.userId, createdAt: row._max.createdAt }); }
    for (const row of clickUsers14dCount) { if (row.userId && row._max.createdAt) activitySignals.push({ userId: row.userId, createdAt: row._max.createdAt }); }

    const notifiedUsers14d = new Set(
        alertUsers14dCount
            .map((item) => item.userId)
            .filter((userId): userId is string => Boolean(userId))
    );
    const dau = new Set(activitySignals.filter((item) => item.createdAt >= oneDayAgo).map((item) => item.userId));
    const wau = new Set(activitySignals.filter((item) => item.createdAt >= sevenDaysAgo).map((item) => item.userId));
    const previousWeek = new Set(activitySignals.filter((item) => item.createdAt >= fourteenDaysAgo && item.createdAt < sevenDaysAgo).map((item) => item.userId));
    const returning = new Set(Array.from(wau).filter((userId) => previousWeek.has(userId)));

    const observability = getRouteMetrics();

    const response = {
        window,
        generatedAt: new Date().toISOString(),
        cacheTtlSeconds: CACHE_TTL_SECONDS,
        listings: { live, published: stats.PUBLISHED || 0, drafts: stats.DRAFT || 0, expired, deleted: deletedCount, new24h: new24hCount, liveWalkins, pendingSubmissions },
        linkHealth: { ...linkHealth, percentage: toPercent(linkHealth.healthy, linkHealth.healthy + linkHealth.retrying + linkHealth.broken) },
        traffic: {
            applications30d, newUsers30d, bookmarks7d, dau: dau.size, wau: wau.size,
            returningUsers7d: returning.size, returningRate7d: toPercent(returning.size, wau.size),
            notifiedUsers14d: notifiedUsers14d.size, requests: observability.totals.requests,
            errorRatePct: observability.totals.errorRatePct, avgLatencyMs: observability.totals.avgLatencyMs,
            topSlowRoutes: observability.topSlowRoutes, topErrorRoutes: observability.topErrorRoutes
        },
        funnel: { detailView, loginView, authSuccess, applyClick, saveJob, detailToLoginPct: toPercent(loginView, detailView), loginToAuthPct: toPercent(authSuccess, loginView) },
        channelAttribution: sourceBuckets,
        recentListings: recentListings.map((item) => ({ ...item, postedAt: item.postedAt.toISOString() }))
    };

    try {
        await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS);
    } catch {
        // Ignore cache write failures; metrics response is still valid.
    }
    return response;
}

export async function clearAdminMetricsCache() {
    const keys = ['24h', '7d', '14d', '30d'].map(w => CACHE_KEY_PREFIX + w);
    await Promise.all(keys.map(k => redis.del(k)));
}
