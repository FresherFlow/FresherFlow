import prisma from '../database/prisma';
import { RawOpportunityStatus } from '@fresherflow/database';
import { getObservabilityMetrics } from '../../middleware/observability';

import redis from '@fresherflow/redis';

export type MetricsWindow = '24h' | '7d' | '14d' | '30d';

const CACHE_KEY_PREFIX = 'admin:metrics:v3:';
const CACHE_TTL_SECONDS = 300;

type MetricsV2Response = {
    window: MetricsWindow;
    generatedAt: string;
    listings: {
        live: number;
        published: number;
        drafts: number;
        expired: number;
        deleted: number;
        new24h: number;
        pendingSubmissions: number;
    };
    linkHealth: {
        healthy: number;
        broken: number;
        percentage: number;
    };
    funnel: {
        applyClick: number;
        detailView: number;
        authSuccess: number;
    };
    traffic: {
        dau: number;
        wau: number;
        newUsers30d: number;
        requests: number;
    };
    recentListings: {
        id: string;
        title: string;
        company: string;
        type: string;
        postedAt: string;
    }[];
};

function toWindowStart(window: MetricsWindow): Date {
    const now = Date.now();
    if (window === '24h') return new Date(now - 24 * 60 * 60 * 1000);
    if (window === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
    if (window === '14d') return new Date(now - 14 * 24 * 60 * 60 * 1000);
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
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
    } catch { /* ignore */ }

    const now = new Date();
    const windowStart = toWindowStart(window);

    const [
        statusStats,
        deletedCount,
        new24h,
        linkHealthStats,
        platformEvents,
        pendingSubmissions,
        liveCount,
        expiredCount,
        dauGroup,
        wauGroup,
        newUsers30d,
        dbRecentListings
    ] = await Promise.all([
        prisma.opportunity.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
        prisma.opportunity.count({ where: { deletedAt: { not: null } } }),
        prisma.opportunity.count({ where: { postedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
        prisma.opportunity.groupBy({ by: ['linkHealth'], _count: true, where: { status: 'PUBLISHED', deletedAt: null } }),
        prisma.platformEvent.groupBy({ by: ['type'], where: { createdAt: { gte: windowStart } }, _count: { _all: true } }),
        prisma.rawOpportunity.count({ where: { status: RawOpportunityStatus.FETCHED, reasonFlags: { has: 'CROWDSOURCED' } } }),
        prisma.opportunity.count({ where: { status: 'PUBLISHED', deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
        prisma.opportunity.count({ where: { status: 'PUBLISHED', deletedAt: null, expiresAt: { lte: now } } }),
        prisma.platformEvent.groupBy({
            by: ['userId'],
            where: {
                userId: { not: null },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
        }),
        prisma.platformEvent.groupBy({
            by: ['userId'],
            where: {
                userId: { not: null },
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
        }),
        prisma.user.count({
            where: {
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
        }),
        prisma.opportunity.findMany({
            where: { status: 'PUBLISHED', deletedAt: null },
            orderBy: { postedAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                company: true,
                type: true,
                postedAt: true
            }
        })
    ]);

    const stats: Record<string, number> = statusStats.reduce((acc: Record<string, number>, s) => { acc[s.status] = s._count; return acc; }, {});
    const linkHealth: Record<string, number> = linkHealthStats.reduce((acc: Record<string, number>, s) => { acc[s.linkHealth] = s._count; return acc; }, { HEALTHY: 0, BROKEN: 0 });
    const rawFunnel: Record<string, number> = platformEvents.reduce((acc: Record<string, number>, s) => { acc[s.type] = s._count._all; return acc; }, {});

    const funnel = {
        applyClick: rawFunnel.CLICK_APPLY || 0,
        detailView: rawFunnel.VIEW_JOB || 0,
        authSuccess: rawFunnel.AUTH_STEP || 0
    };

    const dau = dauGroup.length;
    const wau = wauGroup.length;

    const recentListings = dbRecentListings.map(item => ({
        id: item.id,
        title: item.title,
        company: item.company,
        type: item.type,
        postedAt: item.postedAt.toISOString()
    }));

    const observability = getObservabilityMetrics();

    const response: MetricsV2Response = {
        window,
        generatedAt: now.toISOString(),
        listings: {
            live: liveCount,
            published: stats.PUBLISHED || 0,
            drafts: stats.DRAFT || 0,
            expired: expiredCount,
            deleted: deletedCount,
            new24h,
            pendingSubmissions,
        },
        linkHealth: {
            healthy: linkHealth.HEALTHY,
            broken: linkHealth.BROKEN,
            percentage: Math.round((linkHealth.HEALTHY / (linkHealth.HEALTHY + linkHealth.BROKEN || 1)) * 100),
        },
        funnel,
        traffic: {
            dau,
            wau,
            newUsers30d,
            requests: observability.totals.requests,
        },
        recentListings
    };

    await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS).catch(() => null);
    return response;
}
