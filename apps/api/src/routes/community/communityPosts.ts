import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { CommunityPostCategory } from '@fresherflow/database';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import {
    communityReadLimiter,
    commentsWriteLimiter,
    listCommunityPosts,
    listTrendingTags,
    getCommunityPost,
    createCommunityPost,
    voteCommunityPost,
    addCommunityPostComment,
    voteCommunityPostComment,
    deleteCommunityPostComment,
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
        const { title, body, category, tags, sourceOpportunityId } = req.body as {
            title: string; body: string; category: CommunityPostCategory; tags: string[]; sourceOpportunityId?: string;
        };
        const post = await createCommunityPost({
            authorId: userId,
            title,
            body,
            category,
            tags,
            sourceOpportunityId,
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
        const { value } = req.body as { value: number };
        const result = await voteCommunityPost({ postId: String(req.params.id), userId, value });
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
        const { body, parentId } = req.body as { body: string; parentId?: string };
        const comment = await addCommunityPostComment({
            postId: String(req.params.id),
            authorId: userId,
            body,
            parentId,
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
        const { value } = req.body as { value: number };
        const result = await voteCommunityPostComment({
            commentId: String(req.params.commentId),
            userId,
            value,
        });
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