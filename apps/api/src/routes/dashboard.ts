import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, OpportunityEventType, OpportunityStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { profileGate } from '../middleware/profileGate';
import { filterOpportunitiesForUser, sortOpportunitiesForUser } from '../domain/eligibility';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/dashboard/highlights
 * Return urgent and personalized updates for the user dashboard
 */
router.get('/highlights', requireAuth, profileGate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;

        // 1. Get user profile
        const profile = await prisma.profile.findUnique({
            where: { userId }
        });

        if (!profile) {
            return res.json({ highlights: [] }); // Profile should theoretically exist due to profileGate
        }

        // 2. Fetch potentials for highlights
        const now = new Date();
        const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        // Fetching "Closing Soon" opportunities
        const potentials = await prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                expiresAt: {
                    gt: now,
                    lt: fortyEightHoursFromNow
                }
            },
            include: {
                walkInDetails: true,
                actions: {
                    where: { userId }
                },
                savedBy: {
                    where: { userId }
                }
            },
            orderBy: {
                expiresAt: 'asc'
            },
            take: 10
        });

        // 3. Apply eligibility filtering
        const eligiblePotentials = filterOpportunitiesForUser(potentials as any, profile as any);
        const rankedUrgent = sortOpportunitiesForUser(eligiblePotentials as any, profile as any);

        // 4. Categorize for the UI
        const walkins = rankedUrgent.filter(o => o.type === 'WALKIN');
        const others = rankedUrgent.filter(o => o.type !== 'WALKIN');

        // 5. Fetch "New Opportunities" (less than 24h old)
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const newOpps = await prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                postedAt: { gt: twentyFourHoursAgo },
                deletedAt: null
            },
            orderBy: { postedAt: 'desc' },
            take: 5
        });
        const eligibleNew = filterOpportunitiesForUser(newOpps as any, profile as any);
        const rankedNew = sortOpportunitiesForUser(eligibleNew as any, profile as any);

        // 6. New since last visit (based on latest VIEWED action)
        const latestViewed = await prisma.userAction.findFirst({
            where: { userId, actionType: 'VIEWED' },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true }
        });
        const since = latestViewed?.updatedAt || twentyFourHoursAgo;
        const newSinceLastVisitCandidates = await prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                postedAt: { gt: since },
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
            },
            include: {
                walkInDetails: true,
                actions: { where: { userId } },
                savedBy: { where: { userId } }
            },
            orderBy: { postedAt: 'desc' },
            take: 12
        });
        const newSinceLastVisit = sortOpportunitiesForUser(
            filterOpportunitiesForUser(newSinceLastVisitCandidates as any, profile as any),
            profile as any
        );

        const fortyFiveDaysFromNow = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
        const driveEventTypes: OpportunityEventType[] = [
            OpportunityEventType.NOTIFICATION,
            OpportunityEventType.REG_START,
            OpportunityEventType.REG_END,
            OpportunityEventType.EXAM_DATE,
            OpportunityEventType.RESULT,
        ];

        const upcomingDriveEvents = await prisma.opportunityEvent.findMany({
            where: {
                eventType: { in: driveEventTypes },
                eventDate: {
                    gte: new Date(now.getTime() - 6 * 60 * 60 * 1000),
                    lte: fortyFiveDaysFromNow
                },
                opportunity: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null
                }
            },
            include: {
                opportunity: {
                    select: {
                        id: true,
                        slug: true,
                        type: true,
                        title: true,
                        company: true,
                        locations: true,
                        expiresAt: true,
                        postedAt: true,
                    }
                }
            },
            orderBy: { eventDate: 'asc' },
            take: 30
        });

        const seenDriveIds = new Set<string>();
        const driveMilestones = upcomingDriveEvents
            .filter((item) => {
                if (seenDriveIds.has(item.opportunityId)) return false;
                seenDriveIds.add(item.opportunityId);
                return true;
            })
            .sort((a, b) => {
                const aPriority = /tcs/i.test(a.opportunity.company) && /nqt/i.test(a.opportunity.title) ? 1 : 0;
                const bPriority = /tcs/i.test(b.opportunity.company) && /nqt/i.test(b.opportunity.title) ? 1 : 0;
                if (aPriority !== bPriority) return bPriority - aPriority;
                return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
            })
            .slice(0, 4)
            .map((item) => ({
                opportunityId: item.opportunityId,
                eventId: item.id,
                eventType: item.eventType,
                eventDate: item.eventDate,
                eventTitle: item.title,
                opportunity: item.opportunity,
            }));

        res.json({
            urgent: {
                walkins: walkins.slice(0, 3),
                others: others.slice(0, 3)
            },
            newlyAdded: rankedNew.slice(0, 3),
            newSinceLastVisit: newSinceLastVisit.slice(0, 6),
            newSinceLastVisitCount: newSinceLastVisit.length,
            driveMilestones
        });
    } catch (error) {
        next(error);
    }
});

export default router;
