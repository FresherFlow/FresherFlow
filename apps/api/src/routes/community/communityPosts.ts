import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { CommunityPostCategory } from '@fresherflow/database';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import {
    communityReadLimiter,
    commentsWriteLimiter,
    reportsLimiter,
    listCommunityPosts,
    listTrendingTags,
    getCommunityPost,
    createCommunityPost,
    voteCommunityPost,
    addCommunityPostComment,
    voteCommunityPostComment,
    deleteCommunityPostComment,
    listMyContributions,
    createCommunityReport,
} from '../../infrastructure/services/community.service';
import { z } from 'zod';
import { communityPostVoteSchema, communityPostCommentCreateSchema, communityPostCommentVoteSchema } from '../../utils/validation';

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

const createCommunityPostSchema = z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(10000),
    category: z.nativeEnum(CommunityPostCategory).optional().default(CommunityPostCategory.DISCUSSION),
    tags: z.array(z.string().min(1).max(60)).max(10).optional().default([]),
    sourceOpportunityId: z.string().optional(),
    roomId: z.string().min(1).max(64).optional(),
    // Signed-in members may post anonymously; identity is masked in reads but
    // retained for moderation. anonId is minted server-side.
    isAnonymous: z.boolean().optional().default(false),
});

const communityReportSchema = z.object({
    reason: z.enum(['SPAM', 'INACCURATE', 'EXPIRED', 'OFFENSIVE', 'OTHER']),
    message: z.string().trim().max(1000).optional(),
});

// ========================================
// Community Feed
// ========================================

router.get(
    '/feed',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const category = req.query.category as CommunityPostCategory | undefined;
        const tag = req.query.tag as string | undefined;
        const tagsRaw = req.query.tags as string | undefined;
        const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
        const search = req.query.search as string | undefined;
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const result = await listCommunityPosts({
            page, limit, category, tag, tags, search,
            userId: req.isAnonymous ? null : req.userId,
        });
        res.setHeader('Cache-Control', 'public, max-age=30');
        return res.json(result);
    })
);

// ========================================
// Trending Tags
// ========================================

router.get(
    '/tags/trending',
    communityReadLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const limit = Number(req.query.limit) || 20;
        const result = await listTrendingTags({ limit });
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.json(result);
    })
);

// ========================================
// My contributions (Contribute hub history)
// Registered before /:id so "mine" is not treated as a post id.
// ========================================

router.get(
    '/mine',
    communityReadLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await listMyContributions(userId);
        return res.json(result);
    })
);

// ========================================
// Single Community Post
// ========================================

router.get(
    '/:id',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const post = await getCommunityPost(String(req.params.id), req.isAnonymous ? null : req.userId);
            res.setHeader('Cache-Control', 'public, max-age=30');
            return res.json(post);
        } catch (err) {
            next(err);
        }
    })
);

// ========================================
// Create Community Post
// ========================================

router.post(
    '/',
    commentsWriteLimiter,
    requireAuth,
    validate(createCommunityPostSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { title, body, category, tags, sourceOpportunityId, roomId, isAnonymous } = req.body as {
            title: string; body: string; category: CommunityPostCategory; tags: string[]; sourceOpportunityId?: string; roomId?: string; isAnonymous?: boolean;
        };
        const post = await createCommunityPost({
            authorId: userId,
            title,
            body,
            category,
            tags,
            sourceOpportunityId,
            roomId,
            isAnonymous: isAnonymous ?? false,
        });
        return res.status(201).json(post);
    })
);

// ========================================
// Vote on Community Post
// ========================================

router.post(
    '/:id/vote',
    commentsWriteLimiter,
    requireAuth,
    validate(communityPostVoteSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await voteCommunityPost({ postId: String(req.params.id), userId });
        return res.json(result);
    })
);

// ========================================
// Add Comment to Community Post
// ========================================

router.post(
    '/:id/comments',
    commentsWriteLimiter,
    requireAuth,
    validate(communityPostCommentCreateSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { body, parentId, isAnonymous } = req.body as { body: string; parentId?: string; isAnonymous?: boolean };
        const comment = await addCommunityPostComment({
            postId: String(req.params.id),
            authorId: userId,
            body,
            parentId,
            isAnonymous: isAnonymous ?? false,
        });
        return res.status(201).json(comment);
    })
);

// ========================================
// Vote on Community Post Comment
// ========================================

router.post(
    '/:id/comments/:commentId/vote',
    commentsWriteLimiter,
    requireAuth,
    validate(communityPostCommentVoteSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await voteCommunityPostComment({
            commentId: String(req.params.commentId),
            userId,
        });
        return res.json(result);
    })
);

// ========================================
// Report Community Post / Comment (dedupe: one OPEN per reporter+target+reason)
// ========================================

router.post(
    '/:id/reports',
    reportsLimiter,
    requireAuth,
    validate(communityReportSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { reason, message } = req.body as { reason: 'SPAM' | 'INACCURATE' | 'EXPIRED' | 'OFFENSIVE' | 'OTHER'; message?: string };
        const result = await createCommunityReport({ reporterId: userId, postId: String(req.params.id), reason, message });
        return res.json(result);
    })
);

router.post(
    '/:id/comments/:commentId/reports',
    reportsLimiter,
    requireAuth,
    validate(communityReportSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { reason, message } = req.body as { reason: 'SPAM' | 'INACCURATE' | 'EXPIRED' | 'OFFENSIVE' | 'OTHER'; message?: string };
        const result = await createCommunityReport({ reporterId: userId, communityCommentId: String(req.params.commentId), reason, message });
        return res.json(result);
    })
);

// ========================================
// Delete Community Post Comment
// ========================================

router.delete(
    '/:id/comments/:commentId',
    commentsWriteLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        await deleteCommunityPostComment({
            commentId: String(req.params.commentId),
            userId,
            postId: String(req.params.id),
        });
        return res.status(204).send();
    })
);

export default router;