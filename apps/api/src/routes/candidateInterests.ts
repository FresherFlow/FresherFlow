import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../infrastructure/database/prisma';
import { CandidateInterestStatus } from '@fresherflow/types';

const router = Router();

/**
 * POST /api/recruiter/interests
 * Send interest to a candidate
 */
router.post('/recruiter/interests', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.userId!;
        const { organizationId, candidateId, opportunityId, message } = req.body;

        if (!organizationId || !candidateId) {
            return next(new AppError('organizationId and candidateId are required', 400));
        }

        const interest = await prisma.candidateInterest.create({
            data: {
                organizationId,
                recruiterId,
                candidateId,
                opportunityId: opportunityId || null,
                message: message || null,
                status: CandidateInterestStatus.PENDING
            }
        });

        return res.status(201).json({
            success: true,
            data: interest
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/recruiter/interests
 * Get interests sent by recruiter's organization
 */
router.get('/recruiter/interests', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.userId!;
        const { organizationId } = req.query;

        const interests = await prisma.candidateInterest.findMany({
            where: organizationId ? { organizationId: organizationId as string } : { recruiterId },
            include: {
                candidate: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        profile: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({
            success: true,
            data: interests
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/candidate/interests
 * Get interests received by the authenticated candidate
 */
router.get('/candidate/interests', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const candidateId = req.userId!;
        const interests = await prisma.candidateInterest.findMany({
            where: { candidateId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        website: true
                    }
                },
                recruiter: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({
            success: true,
            data: interests
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/candidate/interests/:id
 * Accept or decline interest received by candidate
 */
router.patch('/candidate/interests/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const candidateId = req.userId!;
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !Object.values(CandidateInterestStatus).includes(status)) {
            return next(new AppError('Valid status is required', 400));
        }

        const updated = await prisma.candidateInterest.updateMany({
            where: {
                id: id as string,
                candidateId
            },
            data: {
                status
            }
        });

        if (updated.count === 0) {
            return next(new AppError('Candidate interest not found or unauthorized', 404));
        }

        return res.json({
            success: true,
            message: 'Candidate interest updated'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
