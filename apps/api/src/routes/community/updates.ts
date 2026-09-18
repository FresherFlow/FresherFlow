import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import {
    communityReadLimiter,
    commentsWriteLimiter,
    listApplicationUpdates,
    getApplicationUpdateSummary,
    createApplicationUpdate,
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

const createUpdateSchema = z.object({
    opportunityId: z.string().min(1).max(120),
    status: z.enum([
        'APPLIED', 'ASSESSMENT_RECEIVED', 'ASSESSMENT_COMPLETED',
        'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED',
        'SELECTED', 'REJECTED', 'WAITING', 'NO_RESPONSE',
    ]),
    description: z.string().max(2000).optional(),
    evidenceUrl: z.string().url().max(2000).optional(),
});

// ========================================
// List application updates for a job
// ========================================

router.get(
    '/opportunity/:opportunityId',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const result = await listApplicationUpdates(String(req.params.opportunityId), {
            page,
            limit,
        });
        res.setHeader('Cache-Control', 'public, max-age=30');
        return res.json(result);
    })
);

// ========================================
// Get summary stats for a job's updates
// ========================================

router.get(
    '/opportunity/:opportunityId/summary',
    communityReadLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const result = await getApplicationUpdateSummary(String(req.params.opportunityId));
        res.setHeader('Cache-Control', 'public, max-age=60');
        return res.json(result);
    })
);

// ========================================
// Create application update
// ========================================

router.post(
    '/',
    commentsWriteLimiter,
    requireAuth,
    validate(createUpdateSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await createApplicationUpdate({
            authorId: userId,
            ...req.body,
        });
        return res.status(201).json(result);
    })
);

export default router;
