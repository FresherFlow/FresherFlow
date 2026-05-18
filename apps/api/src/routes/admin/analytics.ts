import prisma from '../../infrastructure/database/prisma';
import { Router, Request, Response, NextFunction } from 'express';
import { OpportunityStatus } from '@fresherflow/types';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

function parseDays(raw: unknown, fallback = 30): number {
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.round(value), 1), 90);
}

const overviewCache = new Map<string, { timestamp: number; data: unknown }>();

/**
 * GET /api/admin/analytics/overview
 * Refactored to use PlatformEvent (Unified Tracking)
 */
router.get('/overview', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const days = parseDays(req.query.days, 30);
        const now = new Date();
        const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const cacheKey = `admin_overview_v3_${days}`;
        const cached = overviewCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < 10 * 60 * 1000)) {
            return res.json(cached.data);
        }

        const [
            linkHealthStats,
            statusStats,
            recentUsers,
            typeStats,
            recentBookmarks,
            feedbackStats,
            platformEventsGrouped,
            channelSourceStats,
            topClickedEvents,
            dauGroupOverview,
            wauGroupOverview,
            brokenLinksCount,
            closingSoon48hCount
        ] = await Promise.all([
            prisma.opportunity.groupBy({
                by: ['linkHealth'],
                _count: true,
                where: { status: OpportunityStatus.PUBLISHED, deletedAt: null }
            }),
            prisma.opportunity.groupBy({
                by: ['status'],
                _count: true,
                where: { deletedAt: null }
            }),
            prisma.user.count({ where: { createdAt: { gte: windowStart } } }),
            prisma.opportunity.groupBy({
                by: ['type'],
                _count: true,
                where: { status: OpportunityStatus.PUBLISHED, deletedAt: null }
            }),
            prisma.savedOpportunity.count({ where: { createdAt: { gte: windowStart } } }),
            prisma.listingFeedback.groupBy({
                by: ['reason'],
                _count: true,
                where: { createdAt: { gte: windowStart } }
            }),
            prisma.platformEvent.groupBy({
                by: ['type'],
                where: { createdAt: { gte: windowStart } },
                _count: { _all: true }
            }),
            prisma.platformEvent.groupBy({
                by: ['source'],
                where: {
                    createdAt: { gte: windowStart },
                    type: { in: ['CLICK_APPLY', 'VIEW_JOB'] }
                },
                _count: { _all: true }
            }),
            prisma.platformEvent.groupBy({
                by: ['opportunityId'],
                where: {
                    createdAt: { gte: windowStart },
                    type: 'CLICK_APPLY',
                    opportunityId: { not: null }
                },
                _count: { _all: true },
                orderBy: {
                    _count: {
                        opportunityId: 'desc'
                    }
                },
                take: 5
            }),
            prisma.platformEvent.groupBy({
                by: ['userId'],
                where: {
                    userId: { not: null },
                    createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
                }
            }),
            prisma.platformEvent.groupBy({
                by: ['userId'],
                where: {
                    userId: { not: null },
                    createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
                }
            }),
            prisma.opportunity.count({
                where: { linkHealth: 'BROKEN', status: OpportunityStatus.PUBLISHED, deletedAt: null }
            }),
            prisma.opportunity.count({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    expiresAt: {
                        gte: now,
                        lte: new Date(now.getTime() + 48 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        const funnel: Record<string, number> = {};
        platformEventsGrouped.forEach(e => {
            funnel[e.type] = e._count._all;
        });

        const healthDistribution = { healthy: 0, broken: 0, retrying: 0 };
        linkHealthStats.forEach(s => {
            if (s.linkHealth === 'HEALTHY') healthDistribution.healthy = s._count;
            if (s.linkHealth === 'BROKEN') healthDistribution.broken = s._count;
            if (s.linkHealth === 'RETRYING') healthDistribution.retrying = s._count;
        });

        const statusDistribution = { published: 0, draft: 0, archived: 0 };
        statusStats.forEach(s => {
            if (s.status === 'PUBLISHED') statusDistribution.published = s._count;
            if (s.status === 'DRAFT') statusDistribution.draft = s._count;
            if (s.status === 'ARCHIVED') statusDistribution.archived = s._count;
        });

        // 1. Channel Attribution / Traffic Sources
        const channelAttribution = { telegram: 0, whatsapp: 0, linkedin: 0, others: 0 };
        channelSourceStats.forEach(stat => {
            const src = (stat.source || 'others').toLowerCase();
            if (src.includes('telegram')) {
                channelAttribution.telegram += stat._count._all;
            } else if (src.includes('whatsapp')) {
                channelAttribution.whatsapp += stat._count._all;
            } else if (src.includes('linkedin')) {
                channelAttribution.linkedin += stat._count._all;
            } else {
                channelAttribution.others += stat._count._all;
            }
        });

        // 2. Top Clicked Opportunities
        const topClickedOpportunities = await Promise.all(
            topClickedEvents.map(async (event) => {
                const opp = await prisma.opportunity.findUnique({
                    where: { id: event.opportunityId as string },
                    select: { title: true, company: true }
                });
                return {
                    opportunityId: event.opportunityId as string,
                    clicks: event._count._all,
                    title: opp?.title || 'Unknown Opportunity',
                    company: opp?.company || 'Unknown Company'
                };
            })
        );

        // 3. DAU / WAU overview
        const dau = dauGroupOverview.length;
        const wau = wauGroupOverview.length;

        // 4. Returning Users & Signup Conversions
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const userCreatedBefore7dLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const activeUsers7dGroup = await prisma.platformEvent.groupBy({
            by: ['userId'],
            where: {
                userId: { not: null },
                createdAt: { gte: weekAgo }
            }
        });
        const activeUserIds7d = activeUsers7dGroup.map(g => g.userId as string);

        const returningUsers7d = await prisma.user.count({
            where: {
                id: { in: activeUserIds7d },
                createdAt: { lt: userCreatedBefore7dLimit }
            }
        });
        const returningRate7d = wau > 0 ? Math.round((returningUsers7d / wau) * 100) : 0;

        const signupSuccess30d = funnel.AUTH_STEP || 0;
        const landingVisits = funnel.APP_INIT || 1;
        const signupConversionRate30d = Math.round((signupSuccess30d / (landingVisits || 1)) * 100);

        const responsePayload = {
            windowDays: days,
            linkHealth: healthDistribution,
            opportunityStatus: statusDistribution,
            activity: {
                newUsers30d: recentUsers,
                bookmarks7d: recentBookmarks,
                applyClicks30d: funnel.CLICK_APPLY || 0,
                jobViews30d: funnel.VIEW_JOB || 0,
                authSteps30d: funnel.AUTH_STEP || 0,
                signupSuccess30d,
                dau,
                wau,
                returningUsers7d,
                returningRate7d,
                signupConversionRate30d,
            },
            typeDistribution: typeStats.map((t) => ({ type: t.type, count: t._count })),
            feedback: feedbackStats.reduce((acc: Record<string, number>, s) => { acc[s.reason] = s._count; return acc; }, {}),
            channelAttribution,
            clicks: {
                applyClicks30d: funnel.CLICK_APPLY || 0,
                topClickedOpportunities
            },
            urgent: {
                closingSoon48h: closingSoon48hCount,
                brokenLinks: brokenLinksCount
            },
            funnel
        };

        overviewCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
        res.json(responsePayload);
    } catch (error) {
        next(error);
    }
});

router.get('/recent-activity', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const [recentEvents, recentUsers] = await Promise.all([
            prisma.platformEvent.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    opportunity: { select: { title: true, company: true } },
                    user: { select: { fullName: true, email: true } }
                }
            }),
            prisma.user.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: { id: true, fullName: true, email: true, createdAt: true, profile: { select: { completionPercentage: true } } }
            })
        ]);

        const items = recentEvents.map(event => {
            let entity = 'System';
            if (event.opportunity) {
                entity = `${event.opportunity.company} - ${event.opportunity.title}`;
            } else if (event.user && event.user.fullName) {
                entity = event.user.fullName;
            }

            return {
                id: event.id,
                action: event.type,
                entity,
                createdAt: event.createdAt ? new Date(event.createdAt as unknown as Date).toISOString() : new Date().toISOString()
            };
        });

        res.json({ items, users: recentUsers });
    } catch (error) {
        next(error);
    }
});

export default router;
