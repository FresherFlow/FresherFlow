import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import {
    communityReadLimiter,
    commentsWriteLimiter,
    listInterviewExperiences,
    getInterviewExperienceSummary,
    createInterviewExperience,
    voteInterviewExperience,
} from '../../infrastructure/services/community.service';

const router = Router();

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

function requireMember(req: Request, next: NextFunction): string | null {
    if (!req.userId || req.isAnonymous) {
        next(new AppError('Sign in required', 401));
        return null;
    }
    return req.userId;
}

const roundSchema = z.object({
    name: z.string().min(1).max(100),
    questions: z.array(z.string().min(1).max(500)).max(20).default([]),
    notes: z.string().max(2000).optional(),
});

const createInterviewSchema = z.object({
    opportunityId: z.string().min(1).max(120),
    role: z.string().min(1).max(200),
    batch: z.number().int().min(2020).max(2030).optional(),
    rounds: z.array(roundSchema).min(1).max(10),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'VERY_HARD']).optional(),
    result: z.enum(['SELECTED', 'REJECTED', 'WAITING', 'WITHDRAWN']).optional(),
    interviewDate: z.string().optional(),
    overallNotes: z.string().max(5000).optional(),
});

const voteSchema = z.object({
    value: z.number().int().refine((v) => v === 1 || v === -1, {
        message: 'Vote value must be 1 (upvote) or -1 (downvote)',
    }),
});

// ========================================
// List interview experiences for a job
// ========================================

router.get(
    '/opportunity/:opportunityId',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const result = await listInterviewExperiences(String(req.params.opportunityId), {
            page,
            limit,
            userId: req.isAnonymous ? null : req.userId,
        });
        res.setHeader('Cache-Control', 'public, max-age=30');
        return res.json(result);
    })
);

// ========================================
// Get summary stats for a job's interviews
// ========================================

router.get(
    '/opportunity/:opportunityId/summary',
    communityReadLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const result = await getInterviewExperienceSummary(String(req.params.opportunityId));
        res.setHeader('Cache-Control', 'public, max-age=60');
        return res.json(result);
    })
);

// ========================================
// Create interview experience
// ========================================

router.post(
    '/',
    commentsWriteLimiter,
    requireAuth,
    validate(createInterviewSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await createInterviewExperience({
            authorId: userId,
            ...req.body,
        });
        return res.status(201).json(result);
    })
);

// ========================================
// Vote on interview experience
// ========================================

router.post(
    '/:id/vote',
    commentsWriteLimiter,
    requireAuth,
    validate(voteSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { value } = req.body as { value: number };
        const result = await voteInterviewExperience({
            experienceId: String(req.params.id),
            userId,
            value,
        });
        return res.json(result);
    })
);

export default router;
