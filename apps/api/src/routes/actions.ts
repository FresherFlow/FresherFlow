import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import { Opportunity, Profile, OpportunityStatus } from '@fresherflow/types';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { userActionSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { checkEligibility } from '@fresherflow/utils';
import { logger } from '@fresherflow/utils';
import { createRateLimiter } from '../middleware/rateLimit';


const router: Router = express.Router();

// Reads stay lenient (120/min, like communityReadLimiter); the signal write
// is stricter (30/min, like signalsLimiter). IP-keyed, limiter before auth.
const actionsReadLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many requests. Please try again in a minute.',
    keyPrefix: 'actions_read',
});

const actionsWriteLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many action updates. Please slow down.',
    keyPrefix: 'actions_write',
});

/**
 * Phase 8 boundary — UserAction is the LIGHTWEIGHT SIGNAL only.
 *
 * One row per (user, opportunity), overwritten on each tap: VIEWED / SHARED /
 * PLANNED / OA and similar ephemeral marks. It is NOT the application funnel.
 *
 * The funnel record is OpportunityApplication (routes/applications.ts for the
 * candidate's own journey, routes/pipeline/applications.ts for recruiters):
 * stage, currentStage, outcome, history, dashboard queries. This router never
 * writes OpportunityApplication, and the application routers never write
 * UserAction, so the two concepts cannot blur.
 */


// POST /api/opportunities/:id/action
router.post('/:id/action', actionsWriteLimiter, requireAuth, validate(userActionSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: opportunityId } = req.params as { id: string };
        const { actionType } = req.body;
        const normalizedActionType =
            actionType === 'PLANNING' ? 'PLANNED' :
                actionType === 'ATTENDED' ? 'INTERVIEWED' :
                    actionType;

        // Fetch opportunity with walk-in details
        const opportunity = await prisma.opportunity.findFirst({
            where: { id: opportunityId, deletedAt: null },
            include: {
                driveDetails: true
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
            // Personal pipeline/actions tracking is allowed for all jobs regardless of eligibility matching.
            // We just log this warning for debugging purposes.
            logger.warn(`[Actions] User ${req.userId} tracking ineligible opportunity ${opportunityId}: ${eligibilityResult.reason}`);
        }

        // WALK-IN ATTENDED VALIDATION (Backend Only)
        // Can only mark ATTENDED after EARLIEST date has passed
        if (opportunity.recruitmentMethod === 'WALK_IN' && (normalizedActionType === 'INTERVIEWED' || normalizedActionType === 'ATTENDED')) {
            const nowUTC = new Date();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!opportunity.driveDetails || !opportunity.driveDetails.dates || !(opportunity.driveDetails.dates as any).length) {
                return next(new AppError('Walk-in dates not found', 400));
            }

            // Get EARLIEST date (event semantics)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dates = (opportunity.driveDetails.dates as any[]).map((d: any) => new Date(d));
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

        res.json({
            action,
            message: 'Action recorded successfully',
            // Signal-only hint: an APPLIED tap here does NOT create a funnel
            // record. Candidates track applications via
            // POST /api/applications/:opportunityId.
            ...(normalizedActionType === 'APPLIED'
                ? { funnelHint: 'POST /api/applications/:opportunityId tracks the application funnel' }
                : {}),
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/actions - User's own actions only
router.get('/', actionsReadLimiter, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const actions = await prisma.userAction.findMany({
            where: { userId: req.userId },
            include: {
                opportunity: {
                    include: {
                        driveDetails: true
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
router.get('/summary', actionsReadLimiter, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [applied, planned, interviewed, selected, oa, rejected] = await Promise.all([
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
            }),
            prisma.userAction.count({
                where: { userId: req.userId, actionType: 'OA' }
            }),
            prisma.userAction.count({
                where: { userId: req.userId, actionType: 'REJECTED' }
            })
        ]);

        res.json({
            summary: {
                applied,
                planned,
                interviewed,
                selected,
                oa,
                rejected
            }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/actions/:id - Remove action recording
router.delete('/:id', actionsWriteLimiter, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
