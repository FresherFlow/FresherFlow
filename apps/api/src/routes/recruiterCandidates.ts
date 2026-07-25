import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../infrastructure/database/prisma';

const router = Router();

/**
 * GET /api/recruiter/candidates
 * Search candidates open to recruiters with filtering by skills, batch, degree
 */
router.get('/candidates', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { skill, batch, degree, search, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(String(page), 10) || 1;
        const limitNum = Math.min(parseInt(String(limit), 10) || 20, 50);
        const skip = (pageNum - 1) * limitNum;

        const whereClause: Record<string, unknown> = {
            openToRecruiters: true,
            user: {
                deletedAt: null
            }
        };

        if (batch) {
            whereClause.gradYear = parseInt(String(batch), 10) || undefined;
        }

        if (degree) {
            whereClause.gradCourse = String(degree);
        }

        if (skill) {
            whereClause.skills = {
                has: String(skill).trim()
            };
        }

        if (search) {
            const query = String(search).trim();
            whereClause.OR = [
                { headline: { contains: query, mode: 'insensitive' } },
                { about: { contains: query, mode: 'insensitive' } },
                { skills: { has: query } }
            ];
        }

        const [candidates, total] = await Promise.all([
            prisma.profile.findMany({
                where: whereClause,
                skip,
                take: limitNum,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            projects: true
                        }
                    }
                },
                orderBy: { id: 'desc' }
            }),
            prisma.profile.count({ where: whereClause })
        ]);

        return res.json({
            success: true,
            data: candidates,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/recruiter/candidates/:id
 * Get single candidate profile & record a ProfileView
 */
router.get('/candidates/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.userId!;
        const targetId = String(req.params.id);

        const profile = await prisma.profile.findFirst({
            where: {
                OR: [
                    { id: targetId },
                    { userId: targetId }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        projects: true
                    }
                }
            }
        });

        if (!profile) {
            return next(new AppError('Candidate profile not found', 404));
        }

        // Record profile view
        const recruiterMember = await prisma.organizationMembership.findFirst({
            where: { userId: recruiterId }
        });

        if (recruiterMember) {
            await prisma.profileView.create({
                data: {
                    candidateId: profile.userId,
                    organizationId: recruiterMember.organizationId,
                    recruiterId
                }
            }).catch(() => {});
        }

        return res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/recruiter/saved-candidates
 * Bookmark candidate for recruiter talent pool
 */
router.post('/saved-candidates', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.userId!;
        const { candidateId, collectionName } = req.body;

        if (!candidateId || typeof candidateId !== 'string') {
            return next(new AppError('Candidate ID is required', 400));
        }

        const saved = await prisma.savedCandidate.upsert({
            where: {
                recruiterId_candidateId: {
                    recruiterId,
                    candidateId
                }
            },
            create: {
                recruiterId,
                candidateId,
                collectionName: collectionName || null
            },
            update: {
                collectionName: collectionName || null
            }
        });

        return res.status(201).json({
            success: true,
            data: saved
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/recruiter/saved-candidates/:candidateId
 * Remove candidate bookmark
 */
router.delete('/saved-candidates/:candidateId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.userId!;
        const candidateId = String(req.params.candidateId);

        await prisma.savedCandidate.deleteMany({
            where: {
                recruiterId,
                candidateId
            }
        });

        return res.json({
            success: true,
            message: 'Candidate removed from bookmarks'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/recruiter/saved-candidates
 * List saved candidates for recruiter
 */
router.get('/saved-candidates', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.userId!;
        const saved = await prisma.savedCandidate.findMany({
            where: { recruiterId },
            include: {
                candidate: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        projects: true,
                        profile: true
                    }
                }
            },
            orderBy: { savedAt: 'desc' }
        });

        return res.json({
            success: true,
            data: saved
        });
    } catch (error) {
        next(error);
    }
});

export default router;
