import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../infrastructure/database/prisma';

const router = Router();

/**
 * GET /api/candidate/projects
 * Get portfolio projects for candidate
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const projects = await prisma.project.findMany({
            where: { userId },
            orderBy: { order: 'asc' }
        });

        return res.json({
            success: true,
            data: projects
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/candidate/projects
 * Create a new portfolio project
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const { title, description, githubUrl, liveUrl, skills, order } = req.body;

        if (!title || typeof title !== 'string') {
            return next(new AppError('Project title is required', 400));
        }

        const project = await prisma.project.create({
            data: {
                userId,
                title: title.trim().substring(0, 60),
                description: description ? description.trim().substring(0, 200) : null,
                githubUrl: githubUrl || null,
                liveUrl: liveUrl || null,
                skills: Array.isArray(skills) ? skills : [],
                order: typeof order === 'number' ? order : 0
            }
        });

        return res.status(201).json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/candidate/projects/:id
 * Update an existing portfolio project
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const id = req.params.id as string;
        const { title, description, githubUrl, liveUrl, skills, order } = req.body;

        const updated = await prisma.project.updateMany({
            where: {
                id,
                userId
            },
            data: {
                ...(title ? { title: title.trim().substring(0, 60) } : {}),
                ...(description !== undefined ? { description: description ? description.trim().substring(0, 200) : null } : {}),
                ...(githubUrl !== undefined ? { githubUrl: githubUrl || null } : {}),
                ...(liveUrl !== undefined ? { liveUrl: liveUrl || null } : {}),
                ...(skills !== undefined ? { skills: Array.isArray(skills) ? skills : [] } : {}),
                ...(order !== undefined ? { order: typeof order === 'number' ? order : 0 } : {})
            }
        });

        if (updated.count === 0) {
            return next(new AppError('Project not found or unauthorized', 404));
        }

        return res.json({
            success: true,
            message: 'Project updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/candidate/projects/:id
 * Delete a portfolio project
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const id = req.params.id as string;

        await prisma.project.deleteMany({
            where: {
                id,
                userId
            }
        });

        return res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
