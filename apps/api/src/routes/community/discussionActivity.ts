import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import {
    commentsWriteLimiter,
    notifyThreadFollowers,
} from '../../infrastructure/services/community/community.service';

const router = Router();

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

const discussionActivitySchema = z.object({
    threadKind: z.enum(['job', 'company']),
    threadId: z.string().min(1).max(200),
    commentId: z.string().min(1).max(200),
    excerpt: z.string().max(500).default(''),
});

/**
 * POST /api/discussions/comment-activity
 *
 * Called by the client right after a comment lands in Firebase, so the server
 * can fan out Postgres notifications to the thread's followers. The comment
 * itself is already stored; this endpoint only notifies, which is why it is
 * best-effort and returns a count rather than an error on partial failure.
 *
 * There is no `opportunityId` in the body on purpose. For a job thread the
 * thread id *is* the opportunity id, so the server resolves it itself; a
 * caller-supplied id would be an unvalidated foreign key.
 *
 * Body: { threadKind, threadId, commentId, excerpt }
 */
router.post(
    '/comment-activity',
    commentsWriteLimiter,
    requireAuth,
    validate(discussionActivitySchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.userId || req.isAnonymous) {
            next(new AppError('Sign in required to post in discussions', 401));
            return;
        }

        const body = req.body as {
            threadKind: 'job' | 'company';
            threadId: string;
            commentId: string;
            excerpt?: string;
        };

        const result = await notifyThreadFollowers({
            threadKind: body.threadKind,
            threadId: body.threadId,
            actorId: req.userId,
            commentId: body.commentId,
            excerpt: body.excerpt ?? '',
        });

        return res.json(result);
    })
);

export default router;
