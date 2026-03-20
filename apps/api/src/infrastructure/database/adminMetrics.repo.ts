import prisma from '../../infrastructure/database/prisma';
import { Prisma, RawOpportunityStatus } from '@fresherflow/database';
import { OpportunityStatus } from '@fresherflow/types';

/**
 * Repository to execute direct Prisma Database calls for admin metrics aggregations.
 * This is pure external data IO setups.
 */
export async function fetchRawMetricsStats(windowStart: Date) {
    const nowMs = Date.now();
    const now = new Date();
    const oneDayAgo = new Date(nowMs - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(nowMs - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);

    const liveWhere: Prisma.OpportunityWhereInput = {
        status: OpportunityStatus.PUBLISHED,
        deletedAt: null,
        expiredAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    return Promise.all([
        // [0] statusStats
        prisma.opportunity.groupBy({
            by: ['status'],
            _count: true,
            where: { deletedAt: null }
        }),
        // [1] deletedCount
        prisma.opportunity.count({ where: { deletedAt: { not: null } } }),
        // [2] new24hCount
        prisma.opportunity.count({
            where: {
                deletedAt: null,
                postedAt: { gte: oneDayAgo },
            },
        }),
        // [3] linkHealthStats
        prisma.opportunity.groupBy({
            by: ['linkHealth'],
            _count: true,
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
        }),
        // [4] applications30d
        prisma.userAction.count({ where: { actionType: 'APPLIED', createdAt: { gte: thirtyDaysAgo } } }),
        // [5] newUsers30d
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        // [6] bookmarks7d
        prisma.savedOpportunity.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        // [7] growthStats
        prisma.growthEvent.groupBy({
            by: ['event'],
            _count: { _all: true },
            where: { createdAt: { gte: windowStart } },
        }),
        // [8] viewedActionsWindow
        prisma.userAction.count({
            where: {
                actionType: 'VIEWED',
                createdAt: { gte: windowStart }
            }
        }),
        // [9] applyClicksWindow
        prisma.opportunityClick.count({
            where: {
                createdAt: { gte: windowStart },
                isInternal: false
            }
        }),
        // [10] savedWindow
        prisma.savedOpportunity.count({
            where: {
                createdAt: { gte: windowStart }
            }
        }),
        // [11] channelSources30d
        prisma.opportunityClick.groupBy({
            by: ['source'],
            where: { createdAt: { gte: thirtyDaysAgo }, isInternal: false },
            _count: { _all: true },
        }),
        // [12] recentListings
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
        // [13] actionUsers14dCount
        prisma.userAction.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: fourteenDaysAgo } },
            _max: { createdAt: true }
        }),
        // [14] savedUsers14dCount
        prisma.savedOpportunity.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: fourteenDaysAgo } },
            _max: { createdAt: true }
        }),
        // [15] clickUsers14dCount
        prisma.opportunityClick.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: fourteenDaysAgo }, userId: { not: null } },
            _max: { createdAt: true }
        }),
        // [16] alertUsers14dCount
        prisma.alertDelivery.groupBy({
            by: ['userId'],
            where: { sentAt: { gte: fourteenDaysAgo } },
            _count: true
        }),
        // [17] pendingSubmissions
        prisma.rawOpportunity.count({
            where: {
                status: RawOpportunityStatus.FETCHED,
                reasonFlags: { has: 'CROWDSOURCED' }
            }
        }),
        // [18] live count separate list Contiguous triggers
        prisma.opportunity.count({ where: liveWhere }),
        // [19] liveWalkins
        prisma.opportunity.count({ where: { ...liveWhere, type: 'WALKIN' } }),
        // [20] expired
        prisma.opportunity.count({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [{ expiredAt: { not: null } }, { expiresAt: { lte: now } }],
            },
        }),
    ]);
}
