import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import type { CommentType, CommentVoteValue, JobSignalType, ReportReason } from '@fresherflow/database';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import {
    commentCreateSchema,
    commentVoteSchema,
    signalToggleSchema,
    submitJobSchema,
    reportCreateSchema,
} from '../../utils/validation';
import {
    commentsWriteLimiter,
    signalsLimiter,
    submitLimiter,
    guestSubmitLimiter,
    reportsLimiter,
    communityReadLimiter,
    resolveOpportunity,
    listComments,
    getCommentCounts,
    postComment,
    voteComment,
    deleteComment,
    getSignals,
    toggleSignal,
    submitJob,
    listMySubmissions,
    createReport,
} from '../../infrastructure/services/community.service';

const router = Router();

/** requireAuth accepts anonymous identities too; community writes require a real account. */
function requireMember(req: Request, next: NextFunction): string | null {
    if (!req.userId) {
        next(new AppError('Authentication required', 401));
        return null;
    }
    if (req.isAnonymous) {
        next(new AppError('Sign in required to take this action', 401));
        return null;
    }
    return req.userId;
}

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

// ========================================
// Comments
// ========================================

/**
 * GET /api/jobs/comment-counts?ids=a,b,c
 * Batched comment totals for feed cards. Public, cacheable 60s.
 * Must be declared BEFORE /:id/comments so 'comment-counts' is not parsed as :id.
 */
router.get(
    '/comment-counts',
    communityReadLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const raw = String(req.query.ids || '');
        if (raw.length > 10000) {
            throw new AppError('ids query too long', 400);
        }
        const ids = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
        const counts = await getCommentCounts(ids);
        res.setHeader('Cache-Control', 'public, max-age=60');
        return res.json({ counts });
    })
);

router.get(
    '/:id/comments',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const opportunity = await resolveOpportunity(String(req.params.id));
        const result = await listComments(opportunity.id, { userId: req.userId });
        if (req.userId && !req.isAnonymous) {
            res.setHeader('Cache-Control', 'private, no-store');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=30');
        }
        return res.json(result);
    })
);

router.post(
    '/:id/comments',
    commentsWriteLimiter,
    requireAuth,
    validate(commentCreateSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const opportunity = await resolveOpportunity(String(req.params.id));
        const body = req.body as { text: string; commentType?: CommentType; parentCommentId?: string };
        const comment = await postComment({
            opportunityId: opportunity.id,
            userId,
            text: body.text,
            commentType: body.commentType,
            parentCommentId: body.parentCommentId,
        });
        return res.status(201).json(comment);
    })
);

router.post(
    '/:id/comments/:commentId/vote',
    commentsWriteLimiter,
    requireAuth,
    validate(commentVoteSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const opportunity = await resolveOpportunity(String(req.params.id));
        const { value } = req.body as { value: CommentVoteValue };
        const result = await voteComment({
            commentId: String(req.params.commentId),
            userId,
            value,
            opportunityId: opportunity.id,
        });
        return res.json(result);
    })
);

router.delete(
    '/:id/comments/:commentId',
    commentsWriteLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const opportunity = await resolveOpportunity(String(req.params.id));
        await deleteComment({
            commentId: String(req.params.commentId),
            userId,
            opportunityId: opportunity.id,
        });
        return res.status(204).send();
    })
);

// ========================================
// Signals
// ========================================

router.get(
    '/:id/signals',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const viewerId = req.isAnonymous ? null : req.userId;
        const result = await getSignals(String(req.params.id), { userId: viewerId });
        if (viewerId) {
            res.setHeader('Cache-Control', 'private, no-store');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=30');
        }
        return res.json(result);
    })
);

router.post(
    '/:id/signals',
    signalsLimiter,
    requireAuth,
    validate(signalToggleSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { signalType } = req.body as { signalType: JobSignalType };
        const result = await toggleSignal({ slugOrId: String(req.params.id), userId, signalType });
        return res.json(result);
    })
);

// ========================================
// Submission
// ========================================

router.post(
    '/submit',
    submitLimiter,
    optionalAuth,
    validate(submitJobSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const memberId = !req.isAnonymous ? req.userId ?? null : null;
        if (!memberId) {
            await new Promise<void>((resolve, reject) => {
                void guestSubmitLimiter(req, res, (err?: unknown) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        if (typeof req.body?.website === 'string' && req.body.website.length > 0) {
            return res.status(201).json({ existing: false, id: 'ok', slug: '' });
        }
        const {
            website: _honeypot,
            ...body
        } = req.body as Record<string, unknown>;
        void _honeypot;
        // Public web shares are queued for moderation, never auto-published:
        // the contribute/submit UI promises a review step before a listing goes
        // live. `published: false` creates a DRAFT opportunity + PENDING_REVIEW
        // submission that an admin approves via the community moderation queue.
        const result = await submitJob({
            userId: memberId,
            ...(body as object),
            published: false,
        } as Parameters<typeof submitJob>[0]);
        return res.status(result.existing ? 200 : 201).json(result);
    })
);

// ========================================
// Submission history
// ========================================

router.get(
    '/submissions/mine',
    communityReadLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await listMySubmissions(userId);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.json(result);
    })
);

// ========================================
// Reports
// ========================================

router.post(
    '/:id/reports',
    reportsLimiter,
    requireAuth,
    validate(reportCreateSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { reason, message } = req.body as { reason: ReportReason; message?: string };
        const result = await createReport({
            reporterId: userId,
            opportunityId: String(req.params.id),
            reason,
            message,
        });
        return res.json(result);
    })
);

router.post(
    '/:id/comments/:commentId/reports',
    reportsLimiter,
    requireAuth,
    validate(reportCreateSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { reason, message } = req.body as { reason: ReportReason; message?: string };
        const result = await createReport({
            reporterId: userId,
            commentId: String(req.params.commentId),
            reason,
            message,
        });
        return res.json(result);
    })
);

export default router;
