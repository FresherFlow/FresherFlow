import prisma from '../lib/prisma';
import { OpportunityStatus, OpportunityType, Prisma } from '@prisma/client';
import { getObservabilityMetrics } from '../middleware/observability';

export type MetricsWindow = '24h' | '7d' | '30d';

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

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<MetricsWindow, { expiresAt: number; data: MetricsV2Response }>();

function toWindowStart(window: MetricsWindow): Date {
    const now = Date.now();
    if (window === '24h') return new Date(now - 24 * 60 * 60 * 1000);
    if (window === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
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

export function clearAdminMetricsCache() {
    cache.clear();
}

export async function getAdminMetricsV2(window: MetricsWindow): Promise<MetricsV2Response> {
    const nowMs = Date.now();
    const cached = cache.get(window);
    if (cached && cached.expiresAt > nowMs) {
        return cached.data;
    }

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
        published,
        drafts,
        deleted,
        expired,
        live,
        liveWalkins,
        new24h,
        linkHealthStats,
        applications30d,
        newUsers30d,
        bookmarks7d,
        growthStats,
        channelSources30d,
        recentListings,
        actionUsers14d,
        savedUsers14d,
        clickUsers14d,
        alertUsers14d,
    ] = await Promise.all([
        prisma.opportunity.count({ where: { status: OpportunityStatus.PUBLISHED, deletedAt: null } }),
        prisma.opportunity.count({ where: { status: OpportunityStatus.DRAFT, deletedAt: null } }),
        prisma.opportunity.count({ where: { deletedAt: { not: null } } }),
        prisma.opportunity.count({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [{ expiredAt: { not: null } }, { expiresAt: { lte: now } }],
            },
        }),
        prisma.opportunity.count({ where: liveWhere }),
        prisma.opportunity.count({ where: { ...liveWhere, type: OpportunityType.WALKIN } }),
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
        prisma.userAction.findMany({
            where: { createdAt: { gte: fourteenDaysAgo } },
            select: { userId: true, createdAt: true },
        }),
        prisma.savedOpportunity.findMany({
            where: { createdAt: { gte: fourteenDaysAgo } },
            select: { userId: true, createdAt: true },
        }),
        prisma.opportunityClick.findMany({
            where: { createdAt: { gte: fourteenDaysAgo }, userId: { not: null } },
            select: { userId: true, createdAt: true },
        }),
        prisma.alertDelivery.findMany({
            where: { sentAt: { gte: fourteenDaysAgo } },
            select: { userId: true, sentAt: true },
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
    const detailView = funnelMap.get('DETAIL_VIEW') || 0;
    const loginView = funnelMap.get('LOGIN_VIEW') || 0;
    const authSuccess = funnelMap.get('AUTH_SUCCESS') || 0;
    const signupSuccess = funnelMap.get('SIGNUP_SUCCESS') || 0;
    const applyClick = funnelMap.get('APPLY_CLICK') || 0;
    const saveJob = funnelMap.get('SAVE_JOB') || 0;

    const sourceBuckets = { telegram: 0, whatsapp: 0, linkedin: 0, others: 0 };
    for (const row of channelSources30d) {
        const source = (row.source || '').toLowerCase();
        if (source.includes('telegram')) sourceBuckets.telegram += row._count._all;
        else if (source.includes('whatsapp')) sourceBuckets.whatsapp += row._count._all;
        else if (source.includes('linkedin')) sourceBuckets.linkedin += row._count._all;
        else sourceBuckets.others += row._count._all;
    }

    const activitySignals = [
        ...actionUsers14d.map((item) => ({ userId: item.userId, createdAt: item.createdAt })),
        ...savedUsers14d.map((item) => ({ userId: item.userId, createdAt: item.createdAt })),
        ...clickUsers14d
            .filter((item): item is { userId: string; createdAt: Date } => Boolean(item.userId))
            .map((item) => ({ userId: item.userId, createdAt: item.createdAt })),
    ];
    const notifiedUsers14d = new Set(alertUsers14d.map((item) => item.userId));
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
        cacheTtlSeconds: Math.floor(CACHE_TTL_MS / 1000),
        listings: {
            live,
            published,
            drafts,
            expired,
            deleted,
            new24h,
            liveWalkins,
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
            postedAt: item.postedAt.toISOString(),
        })),
    };

    cache.set(window, {
        expiresAt: nowMs + CACHE_TTL_MS,
        data: response,
    });

    return response;
}
