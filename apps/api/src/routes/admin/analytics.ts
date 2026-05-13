import prisma from '../../infrastructure/database/prisma';
import { Router, Request, Response, NextFunction } from 'express';
import { OpportunityStatus } from '@fresherflow/types';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

interface ActivitySignal {
    userId: string;
    createdAt: Date;
}

function parseDays(raw: unknown, fallback = 30): number {
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.round(value), 1), 90);
}


/**
 * GET /api/admin/analytics/overview
 * Platform-wide analytics for the admin dashboard
 */
router.get('/overview', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const days = parseDays(req.query.days, 30);
        const now = new Date();
        const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const previousWindowStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);
        const previousWindowEnd = windowStart;
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Link Health Distribution
        const linkHealthStats = await prisma.opportunity.groupBy({
            by: ['linkHealth'],
            _count: true,
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null
            }
        });

        const healthDistribution = {
            healthy: 0,
            broken: 0,
            retrying: 0
        };

        linkHealthStats.forEach(stat => {
            if (stat.linkHealth === 'HEALTHY') healthDistribution.healthy = stat._count;
            if (stat.linkHealth === 'BROKEN') healthDistribution.broken = stat._count;
            if (stat.linkHealth === 'RETRYING') healthDistribution.retrying = stat._count;
        });

        // 2. Opportunity Stats by Status
        const opportunityStats = await prisma.opportunity.groupBy({
            by: ['status'],
            _count: true,
            where: { deletedAt: null }
        });

        const statusDistribution = {
            published: 0,
            draft: 0,
            archived: 0
        };

        opportunityStats.forEach(stat => {
            if (stat.status === 'PUBLISHED') statusDistribution.published = stat._count;
            if (stat.status === 'DRAFT') statusDistribution.draft = stat._count;
            if (stat.status === 'ARCHIVED') statusDistribution.archived = stat._count;
        });

        // 3. Recent Activity (Last 30 days)
        const recentApplications = await prisma.userAction.count({
            where: {
                actionType: 'APPLIED',
                createdAt: { gte: windowStart }
            }
        });

        const recentUsers = await prisma.user.count({
            where: {
                createdAt: { gte: windowStart }
            }
        });

        const typeStats = await prisma.opportunity.groupBy({
            by: ['type'],
            _count: true,
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null
            }
        });

        // 5. Recent Bookmarks (Last 7 days)
        const recentBookmarks = await prisma.savedOpportunity.count({
            where: {
                createdAt: { gte: windowStart }
            }
        });

        // 6. Feedback Summary
        const feedbackStats = await prisma.listingFeedback.groupBy({
            by: ['reason'],
            _count: true,
            where: {
                createdAt: { gte: windowStart }
            }
        });

        const feedbackDistribution: Record<string, number> = {};
        feedbackStats.forEach(stat => {
            feedbackDistribution[stat.reason] = stat._count;
        });

        // 7. Closing Soon Opportunities
        const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const closingSoonCount = await prisma.opportunity.count({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                expiresAt: {
                    gt: now,
                    lt: fortyEightHoursFromNow
                }
            }
        });

        // 8. Growth Funnel Stats (Last 30 days)
        const growthStats = await prisma.growthEvent.groupBy({
            by: ['event'],
            _count: true,
            where: {
                createdAt: { gte: windowStart }
            }
        });

        const funnel: Record<string, number> = {};
        growthStats.forEach(stat => {
            funnel[stat.event] = stat._count;
        });

        // 10. Moderation Metrics (Last 30 days)
        const [totalShares30d, approvedShares30d, rejectedShares30d] = await Promise.all([
            prisma.rawOpportunity.count({
                where: { sourceId: 'USER_SHARE', createdAt: { gte: windowStart } }
            }),
            prisma.opportunity.count({
                where: {
                    publishedAt: { gte: windowStart },
                    postedByUserId: { not: { in: ['SYSTEM_DEFAULT', 'SYSTEM_ADMIN'] } }
                }
            }),
            prisma.adminAudit.count({
                where: { action: { in: ['REJECT', 'SPAM'] }, createdAt: { gte: windowStart } }
            })
        ]);

        const approvalRate = totalShares30d > 0
            ? Math.round((approvedShares30d / totalShares30d) * 100)
            : 0;


        // 9. Apply click quality metrics (exclude internal/test traffic)
        const clickWhere = {
            createdAt: { gte: windowStart },
            isInternal: false
        } as const;

        const [applyClicks30d, uniqueUserClickers30d, uniqueSessionClickers30d, topClickedRows] = await Promise.all([
            prisma.opportunityClick.count({ where: clickWhere }),
            prisma.opportunityClick.groupBy({
                by: ['userId'],
                where: {
                    ...clickWhere,
                    userId: { not: null }
                },
                _count: { _all: true }
            }),
            prisma.opportunityClick.groupBy({
                by: ['sessionId'],
                where: {
                    ...clickWhere,
                    userId: null,
                    sessionId: { not: null }
                },
                _count: { _all: true }
            }),
            prisma.opportunityClick.groupBy({
                by: ['opportunityId'],
                where: clickWhere,
                _count: { _all: true },
                orderBy: { _count: { opportunityId: 'desc' } },
                take: 10
            })
        ]);

        const [
            actionUsers14d,
            savedUsers14d,
            clickUsers14d,
            alertUsers14d,
            channelSources30d
        ] = await Promise.all([
            prisma.userAction.findMany({
                where: { createdAt: { gte: windowStart } },
                select: { userId: true, createdAt: true }
            }),
            prisma.savedOpportunity.findMany({
                where: { createdAt: { gte: windowStart } },
                select: { userId: true, createdAt: true }
            }),
            prisma.opportunityClick.findMany({
                where: { createdAt: { gte: windowStart }, userId: { not: null } },
                select: { userId: true, createdAt: true }
            }),
            prisma.alertDelivery.findMany({
                where: { sentAt: { gte: windowStart } },
                select: { userId: true, sentAt: true }
            }),
            prisma.opportunityClick.groupBy({
                by: ['source'],
                where: clickWhere,
                _count: { _all: true }
            })
        ]);

        const activitySignals: ActivitySignal[] = [
            ...actionUsers14d.map((item) => ({ userId: item.userId, createdAt: item.createdAt })),
            ...savedUsers14d.map((item) => ({ userId: item.userId, createdAt: item.createdAt })),
            ...clickUsers14d
                .filter((item): item is { userId: string; createdAt: Date } => Boolean(item.userId))
                .map((item) => ({ userId: item.userId, createdAt: item.createdAt })),
            ...alertUsers14d.map((item) => ({ userId: item.userId, createdAt: item.sentAt })),
        ];

        const activeUsers1d = new Set(
            activitySignals
                .filter((item) => item.createdAt >= oneDayAgo)
                .map((item) => item.userId)
        );
        const activeUsers7d = new Set(
            activitySignals
                .filter((item) => item.createdAt >= windowStart)
                .map((item) => item.userId)
        );
        const previous7dUsers = new Set(
            activitySignals
                .filter((item) => item.createdAt >= previousWindowStart && item.createdAt < previousWindowEnd)
                .map((item) => item.userId)
        );
        const returningUsers7d = new Set(
            Array.from(activeUsers7d).filter((userId) => previous7dUsers.has(userId))
        );

        const returningRate7d = activeUsers7d.size > 0
            ? Math.round((returningUsers7d.size / activeUsers7d.size) * 100)
            : 0;

        const sourceBuckets = {
            telegram: 0,
            whatsapp: 0,
            linkedin: 0,
            others: 0,
        };

        for (const row of channelSources30d) {
            const source = (row.source || '').toLowerCase();
            if (source.includes('telegram')) sourceBuckets.telegram += row._count._all;
            else if (source.includes('whatsapp')) sourceBuckets.whatsapp += row._count._all;
            else if (source.includes('linkedin')) sourceBuckets.linkedin += row._count._all;
            else sourceBuckets.others += row._count._all;
        }

        const topOpportunityIds = topClickedRows.map((row) => row.opportunityId);
        const topOpportunityMap = new Map<string, { title: string; company: string; slug: string }>();

        if (topOpportunityIds.length > 0) {
            const opportunities = await prisma.opportunity.findMany({
                where: { id: { in: topOpportunityIds } },
                select: { id: true, title: true, company: true, slug: true }
            });

            opportunities.forEach((item) => {
                topOpportunityMap.set(item.id, { title: item.title, company: item.company, slug: item.slug });
            });
        }

        const topClickedOpportunities = topClickedRows.map((row) => ({
            opportunityId: row.opportunityId,
            clicks: row._count._all,
            ...(topOpportunityMap.get(row.opportunityId) || { title: 'Unknown', company: 'Unknown', slug: '' })
        }));

        res.json({
            windowDays: days,
            linkHealth: healthDistribution,
            opportunityStatus: statusDistribution,
            activity: {
                applications30d: recentApplications,
                newUsers30d: recentUsers,
                bookmarks7d: recentBookmarks,
                dau: activeUsers1d.size,
                wau: activeUsers7d.size,
                returningUsers7d: returningUsers7d.size,
                returningRate7d,
                signupViews30d: funnel.SIGNUP_VIEW || 0,
                signupSuccess30d: funnel.SIGNUP_SUCCESS || 0,
                signupConversionRate30d: (funnel.SIGNUP_VIEW || 0) > 0
                    ? Math.round(((funnel.SIGNUP_SUCCESS || 0) / (funnel.SIGNUP_VIEW || 0)) * 100)
                    : 0
            },
            typeDistribution: typeStats.map((t) => ({ type: t.type, count: t._count })),
            feedback: feedbackDistribution,
            funnel,
            clicks: {
                applyClicks30d,
                uniqueUserClickers30d: uniqueUserClickers30d.length,
                uniqueAnonSessions30d: uniqueSessionClickers30d.length,
                topClickedOpportunities
            },
            channelAttribution: sourceBuckets,
            moderation: {
                totalShares30d,
                approvedShares30d,
                rejectedShares30d,
                approvalRate
            },
            urgent: {

                closingSoon48h: closingSoonCount,
                brokenLinks: healthDistribution.broken
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/analytics/recent-activity
 * Recent user actions and registrations
 */
router.get('/recent-activity', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;

        const recentActions = await prisma.userAction.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { fullName: true, email: true }
                },
                opportunity: {
                    select: { title: true, company: true }
                }
            }
        });

        const recentUsers = await prisma.user.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fullName: true,
                email: true,
                createdAt: true,
                profile: {
                    select: { completionPercentage: true }
                }
            }
        });

        res.json({
            actions: recentActions,
            users: recentUsers
        });
    } catch (error) {
        next(error);
    }
});

export default router;
