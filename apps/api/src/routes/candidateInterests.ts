/**
 * Recruiter <-> candidate interest signals.
 *
 * Every route here is scoped to an organization the caller actually belongs to.
 * That check is the whole point of this file: `CandidateInterest` is created
 * with both an `organizationId` and a `recruiterId`, so without an explicit
 * membership check a signed-in user could post an interest under any company
 * name and have it appear in that company's recruiter inbox. A recruiter is
 * also scoped to organizations they belong to when listing, so one tenant's
 * candidate list cannot be read through another tenant's id.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../infrastructure/database/prisma';
import { requireOrgMembership } from '../infrastructure/services/orgAccess';
import { OrgRole } from '@fresherflow/database';
import type { Prisma } from '@fresherflow/database';
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

        // The organization id arrives in the body, so it is untrusted until this
        // resolves. Without it any authenticated user could send mail that looks
        // like it came from a company they do not work for.
        await requireOrgMembership(recruiterId, String(organizationId), {
            minRole: OrgRole.RECRUITER,
        });

        // A recruiter cannot express interest in their own account.
        if (String(candidateId) === recruiterId) {
            return next(new AppError('You cannot send an interest to yourself', 400));
        }

        const candidate = await prisma.user.findUnique({
            where: { id: String(candidateId) },
            select: { id: true },
        });
        if (!candidate) {
            return next(new AppError('Candidate not found', 404));
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

        // Only approved memberships qualify, so a pending invite cannot be used
        // to read a company's candidate pipeline.
        const memberships = await prisma.organizationMembership.findMany({
            where: { userId: recruiterId, status: 'APPROVED' },
            select: { organizationId: true },
        });
        const orgIds = memberships.map((m) => m.organizationId);

        if (orgIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // A requested organization outside the caller's own set is refused rather
        // than silently ignored, so a wrong id is visible to the caller.
        if (organizationId && !orgIds.includes(String(organizationId))) {
            return next(new AppError('Not an active member of this organization', 403));
        }

        // Prisma's inferred `where` for a ternary of two object literals widens
        // to a union that is not assignable to the generated filter type, so the
        // filter is built once and typed explicitly instead.
        const filter: Prisma.CandidateInterestWhereInput = organizationId
            ? { organizationId: String(organizationId) }
            : { organizationId: { in: orgIds } };

        const interests = await prisma.candidateInterest.findMany({
            where: filter,
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
