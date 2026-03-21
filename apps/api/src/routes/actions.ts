import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import { Opportunity, Profile, OpportunityType, OpportunityStatus } from '@fresherflow/types';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { userActionSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { checkEligibility } from '@fresherflow/domain';


const router: Router = express.Router();


// POST /api/opportunities/:id/action
router.post('/:id/action', requireAuth, validate(userActionSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: opportunityId } = req.params as { id: string };
        const { actionType } = req.body;
        const normalizedActionType =
            actionType === 'PLANNING' ? 'PLANNED' :
                actionType === 'ATTENDED' ? 'INTERVIEWED' :
                    actionType;

        // Fetch opportunity with walk-in details
        const opportunity = await prisma.opportunity.findUnique({
            where: { id: opportunityId },
            include: {
                walkInDetails: true
            }
        });

        if (!opportunity) {
            return next(new AppError('Opportunity not found', 404));
        }

        // STATUS CHECK - Only ACTIVE opportunities accept actions
        if (opportunity.status !== OpportunityStatus.PUBLISHED) {
            return next(new AppError('Opportunity is no longer active', 410));
        }

        // ELIGIBILITY CHECK - User must be eligible
        const profile = await prisma.profile.findUnique({
            where: { userId: req.userId }
        });

        if (!profile) {
            return next(new AppError('Profile not found', 404));
        }

        const opportunityForCheck = {
            ...opportunity,
            adminId: opportunity.postedByUserId
        };

        const eligibilityResult = checkEligibility(opportunityForCheck as unknown as Opportunity, profile as unknown as Profile, req.userId);

        if (!eligibilityResult.eligible) {
            return next(new AppError(
                eligibilityResult.reason || 'Not eligible for this opportunity',
                403
            ));
        }

        // WALK-IN ATTENDED VALIDATION (Backend Only)
        // Can only mark ATTENDED after EARLIEST date has passed
        if (opportunity.type === OpportunityType.WALKIN && (normalizedActionType === 'INTERVIEWED' || normalizedActionType === 'ATTENDED')) {
            const nowUTC = new Date();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!opportunity.walkInDetails || !opportunity.walkInDetails.dates || !(opportunity.walkInDetails.dates as any).length) {
                return next(new AppError('Walk-in dates not found', 400));
            }

            // Get EARLIEST date (event semantics)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dates = (opportunity.walkInDetails.dates as any[]).map((d: any) => new Date(d));
            const earliestDate = dates.sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

            if (nowUTC < earliestDate) {
                return next(new AppError(
                    'Cannot mark as attended before walk-in date',
                    400
                ));
            }
        }

        // UPSERT ACTION (Idempotent - replaces previous action)
        const action = await prisma.userAction.upsert({
            where: {
                userId_opportunityId: {
                    userId: req.userId!,
                    opportunityId
                }
            },
            update: {
                actionType: normalizedActionType
            },
            create: {
                userId: req.userId!,
                opportunityId,
                actionType: normalizedActionType
            }
        });

        res.json({ action, message: 'Action recorded successfully' });
    } catch (error) {
        next(error);
    }
});

// GET /api/actions - User's own actions only
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const actions = await prisma.userAction.findMany({
            where: { userId: req.userId },
            include: {
                opportunity: {
                    include: {
                        walkInDetails: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json({ actions });
    } catch (error) {
        next(error);
    }
});

// GET /api/actions/summary - Aggregated counts only
router.get('/summary', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [applied, planned, interviewed, selected] = await Promise.all([
            prisma.userAction.count({
                where: { userId: req.userId, actionType: 'APPLIED' }
            }),
            prisma.userAction.count({
                where: {
                    userId: req.userId,
                    actionType: { in: ['PLANNED', 'PLANNING'] }
                }
            }),
            prisma.userAction.count({
                where: {
                    userId: req.userId,
                    actionType: { in: ['INTERVIEWED', 'ATTENDED'] }
                }
            }),
            prisma.userAction.count({
                where: { userId: req.userId, actionType: 'SELECTED' }
            })
        ]);

        res.json({
            summary: {
                applied,
                planned,
                interviewed,
                selected
            }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/actions/:id - Remove action recording
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const opportunityId = req.params.id as string;

        await prisma.userAction.delete({
            where: {
                userId_opportunityId: {
                    userId: req.userId!,
                    opportunityId
                }
            }
        });

        res.json({ message: 'Action removed successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
