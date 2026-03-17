import prisma from '../lib/prisma';
import { Prisma, RawOpportunityStatus } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { getObservabilityMetrics } from '../middleware/observability';
import redis from '@fresherflow/redis';

export type MetricsWindow = '24h' | '7d' | '14d' | '30d';

const CACHE_KEY_PREFIX = 'admin:metrics:v2:';
const CACHE_TTL_SECONDS = 300; // 5 minutes

type RouteMetric = {
    route: string;
    requests: number;
    errors: number;
    errorRatePct: number;
    avgLatencyMs: number;
    maxLatencyMs: number;
};

type MetricsV2Response = {
    window: MetricsWindow;
    generatedAt: string;
    cacheTtlSeconds: number;
    listings: {
        live: number;
        published: number;
        drafts: number;
        expired: number;
        deleted: number;
        new24h: number;
        liveWalkins: number;
        pendingSubmissions: number; // Added for crowdsourced links review
    };
    linkHealth: {
        healthy: number;
        retrying: number;
        broken: number;
        percentage: number;
    };
    traffic: {
        applications30d: number;
        newUsers30d: number;
        bookmarks7d: number;
        dau: number;
        wau: number;
        returningUsers7d: number;
        returningRate7d: number;
        notifiedUsers14d: number;
        requests: number;
        errorRatePct: number;
        avgLatencyMs: number;
        p95LatencyMs: number;
        topSlowRoutes: RouteMetric[];
        topErrorRoutes: RouteMetric[];
    };
    funnel: {
        detailView: number;
        loginView: number;
        authSuccess: number;
        signupSuccess: number;
        applyClick: number;
        saveJob: number;
        detailToLoginPct: number;
        loginToAuthPct: number;
    };
    channelAttribution: {
        telegram: number;
        whatsapp: number;
        linkedin: number;
        others: number;
    };
    recentListings: Array<{
        id: string;
        slug: string;
        title: string;
        company: string;
        type: OpportunityType;
        status: OpportunityStatus;
        postedAt: string;
    }>;
};

// Local cache removal in favor of Redis

function toWindowStart(window: MetricsWindow): Date {
    const now = Date.now();
    if (window === '24h') return new Date(now - 24 * 60 * 60 * 1000);
    if (window === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
    if (window === '14d') return new Date(now - 14 * 24 * 60 * 60 * 1000);
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

function getRouteMetrics() {
    const snapshot = getObservabilityMetrics();
    const routeMetrics = Object.entries(snapshot.routes).map(([route, values]) => ({
        route,
        ...values,
    }));
    const topSlowRoutes = routeMetrics
        .filter((row) => row.requests >= 5)
        .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)
        .slice(0, 5);
    const topErrorRoutes = routeMetrics
        .filter((row) => row.errors > 0)
        .sort((a, b) => {
            if (b.errorRatePct !== a.errorRatePct) return b.errorRatePct - a.errorRatePct;
            return b.errors - a.errors;
        })
        .slice(0, 5);

    return {
        totals: snapshot.totals,
        topSlowRoutes,
        topErrorRoutes,
    };
}

function toPercent(numerator: number, denominator: number): number {
    if (!denominator) return 0;
    return Math.round((numerator / denominator) * 100);
}

export async function clearAdminMetricsCache() {
    const keys = ['24h', '7d', '14d', '30d'].map(w => CACHE_KEY_PREFIX + w);
    await Promise.all(keys.map(k => redis.del(k)));
}

export async function getAdminMetricsV2(window: MetricsWindow): Promise<MetricsV2Response> {
    const cacheKey = CACHE_KEY_PREFIX + window;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch { /* ignore cache read error */ }

    const nowMs = Date.now();
    const now = new Date();
    const oneDayAgo = new Date(nowMs - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(nowMs - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
    const windowStart = toWindowStart(window);

    const liveWhere: Prisma.OpportunityWhereInput = {
        status: OpportunityStatus.PUBLISHED,
        deletedAt: null,
        expiredAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    const [
        statusStats,
        deletedCount,
        new24hCount,
        linkHealthStats,
        applications30d,
        newUsers30d,
        bookmarks7d,
        growthStats,
        viewedActionsWindow,
        applyClicksWindow,
        savedWindow,
        channelSources30d,
        recentListings,
        actionUsers14dCount,
        savedUsers14dCount,
        clickUsers14dCount,
        alertUsers14dCount,
        pendingSubmissions,
    ] = await Promise.all([
        // Consolidate listing counts
        prisma.opportunity.groupBy({
            by: ['status'],
            _count: true,
            where: { deletedAt: null }
        }),
        prisma.opportunity.count({ where: { deletedAt: { not: null } } }),
        prisma.opportunity.count({
            where: {
                deletedAt: null,
                postedAt: { gte: oneDayAgo },
            },
        }),
        prisma.opportunity.groupBy({
            by: ['linkHealth'],
            _count: true,
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
        }),
        prisma.userAction.count({ where: { actionType: 'APPLIED', createdAt: { gte: thirtyDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.savedOpportunity.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.growthEvent.groupBy({
            by: ['event'],
            _count: { _all: true },
            where: { createdAt: { gte: windowStart } },
        }),
        prisma.userAction.count({
            where: {
                actionType: 'VIEWED',
                createdAt: { gte: windowStart }
            }
        }),
        prisma.opportunityClick.count({
            where: {
                createdAt: { gte: windowStart },
                isInternal: false
            }
        }),
        prisma.savedOpportunity.count({
            where: {
                createdAt: { gte: windowStart }
            }
        }),
        prisma.opportunityClick.groupBy({
            by: ['source'],
            where: { createdAt: { gte: thirtyDaysAgo }, isInternal: false },
            _count: { _all: true },
        }),
        prisma.opportunity.findMany({
            where: { deletedAt: null },
            orderBy: { postedAt: 'desc' },
            take: 5,
            select: {
                id: true,
                slug: true,
                title: true,
                company: true,
                type: true,
                status: true,
                postedAt: true,
            },
        }),
        // Efficient distinct user counts for DAU/WAU
        prisma.userAction.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: fourteenDaysAgo } },
            _max: { createdAt: true }
        }),
        prisma.savedOpportunity.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: fourteenDaysAgo } },
            _max: { createdAt: true }
        }),
        prisma.opportunityClick.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: fourteenDaysAgo }, userId: { not: null } },
            _max: { createdAt: true }
        }),
        prisma.alertDelivery.groupBy({
            by: ['userId'],
            where: { sentAt: { gte: fourteenDaysAgo } },
            _count: true
        }),
        prisma.rawOpportunity.count({
            where: {
                status: RawOpportunityStatus.FETCHED,
                reasonFlags: { has: 'CROWDSOURCED' }
            }
        }),
    ]);

    // Process status stats
    const stats: Record<string, number> = { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 };
    for (const s of statusStats) {
        if (s.status) stats[s.status] = s._count;
    }

    const published = stats.PUBLISHED || 0;
    const drafts = stats.DRAFT || 0;
    const deleted = deletedCount;
    const new24h = new24hCount;

    // Live counts still need a specific query if complexity grows, but for now we can approximate
    // or keep the specific liveWhere query if needed. 
    // Actually, let's just do the live counts separately for accuracy since they depend on expiresAt.
    const [live, liveWalkins, expired] = await Promise.all([
        prisma.opportunity.count({ where: liveWhere }),
        prisma.opportunity.count({ where: { ...liveWhere, type: OpportunityType.WALKIN } }),
        prisma.opportunity.count({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [{ expiredAt: { not: null } }, { expiresAt: { lte: now } }],
            },
        }),
    ]);

    const linkHealth = { healthy: 0, retrying: 0, broken: 0 };
    for (const row of linkHealthStats) {
        if (row.linkHealth === 'HEALTHY') linkHealth.healthy = row._count;
        if (row.linkHealth === 'RETRYING') linkHealth.retrying = row._count;
        if (row.linkHealth === 'BROKEN') linkHealth.broken = row._count;
    }
    const linkTotal = linkHealth.healthy + linkHealth.retrying + linkHealth.broken;

    const funnelMap = new Map<string, number>();
    for (const row of growthStats) {
        funnelMap.set(row.event, row._count._all);
    }
    const detailView = Math.max(funnelMap.get('DETAIL_VIEW') || 0, viewedActionsWindow);
    const loginView = funnelMap.get('LOGIN_VIEW') || 0;
    const authSuccess = funnelMap.get('AUTH_SUCCESS') || 0;
    const signupSuccess = funnelMap.get('SIGNUP_SUCCESS') || 0;
    const applyClick = Math.max(funnelMap.get('APPLY_CLICK') || 0, applyClicksWindow);
    const saveJob = Math.max(funnelMap.get('SAVE_JOB') || 0, savedWindow);

    const sourceBuckets = { telegram: 0, whatsapp: 0, linkedin: 0, others: 0 };
    for (const row of channelSources30d) {
        const source = (row.source || '').toLowerCase();
        if (source.includes('telegram')) sourceBuckets.telegram += row._count._all;
        else if (source.includes('whatsapp')) sourceBuckets.whatsapp += row._count._all;
        else if (source.includes('linkedin')) sourceBuckets.linkedin += row._count._all;
        else sourceBuckets.others += row._count._all;
    }

    const activitySignals: Array<{ userId: string, createdAt: Date }> = [];

    for (const row of actionUsers14dCount) {
        if (row.userId && row._max.createdAt) activitySignals.push({ userId: row.userId, createdAt: row._max.createdAt });
    }
    for (const row of savedUsers14dCount) {
        if (row.userId && row._max.createdAt) activitySignals.push({ userId: row.userId, createdAt: row._max.createdAt });
    }
    for (const row of clickUsers14dCount) {
        if (row.userId && row._max.createdAt) activitySignals.push({ userId: row.userId, createdAt: row._max.createdAt });
    }

    const notifiedUsers14d = new Set(alertUsers14dCount.map((item) => (item as { userId: string | null }).userId).filter(Boolean) as string[]);
    const dau = new Set(activitySignals.filter((item) => item.createdAt >= oneDayAgo).map((item) => item.userId));
    const wau = new Set(activitySignals.filter((item) => item.createdAt >= sevenDaysAgo).map((item) => item.userId));
    const previousWeek = new Set(
        activitySignals
            .filter((item) => item.createdAt >= fourteenDaysAgo && item.createdAt < sevenDaysAgo)
            .map((item) => item.userId)
    );
    const returning = new Set(Array.from(wau).filter((userId) => previousWeek.has(userId)));

    const observability = getRouteMetrics();

    const response: MetricsV2Response = {
        window,
        generatedAt: new Date().toISOString(),
        cacheTtlSeconds: CACHE_TTL_SECONDS,
        listings: {
            live,
            published,
            drafts,
            expired,
            deleted,
            new24h,
            liveWalkins,
            pendingSubmissions,
        },
        linkHealth: {
            ...linkHealth,
            percentage: toPercent(linkHealth.healthy, linkTotal),
        },
        traffic: {
            applications30d,
            newUsers30d,
            bookmarks7d,
            dau: dau.size,
            wau: wau.size,
            returningUsers7d: returning.size,
            returningRate7d: toPercent(returning.size, wau.size),
            notifiedUsers14d: notifiedUsers14d.size,
            requests: observability.totals.requests,
            errorRatePct: observability.totals.errorRatePct,
            avgLatencyMs: observability.totals.avgLatencyMs,
            p95LatencyMs: observability.totals.p95LatencyMs,
            topSlowRoutes: observability.topSlowRoutes,
            topErrorRoutes: observability.topErrorRoutes,
        },
        funnel: {
            detailView,
            loginView,
            authSuccess,
            signupSuccess,
            applyClick,
            saveJob,
            detailToLoginPct: toPercent(loginView, detailView),
            loginToAuthPct: toPercent(authSuccess, loginView),
        },
        channelAttribution: sourceBuckets,
        recentListings: recentListings.map((item) => ({
            ...item,
            type: item.type as unknown as OpportunityType,
            status: item.status as unknown as OpportunityStatus,
            postedAt: item.postedAt.toISOString(),
        })),
    };

    try {
        await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS);
    } catch { /* ignore cache write error */ }

    return response;
}
