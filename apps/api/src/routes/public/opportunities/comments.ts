import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../middleware/auth';
import { AppError } from '../../../middleware/errorHandler';
import {
    resolveOpportunity,
    listComments,
    postComment,
    deleteComment,
    type CommunityCommentNode,
} from '../../../infrastructure/services/community.service';

const router = Router();

interface LegacyComment {
    id: string;
    text: string;
    createdAt: Date;
    user: {
        id: string;
        fullName: string | null;
        username: string | null;
        avatarUrl: string | null;
    };
}

function toLegacy(node: CommunityCommentNode): LegacyComment {
    return {
        id: node.id,
        text: node.text,
        createdAt: node.createdAt,
        user: {
            id: node.user.id,
            fullName: node.user.fullName,
            username: node.user.username,
            avatarUrl: node.user.avatarUrl,
        },
    };
}

/**
 * @route   GET /api/opportunities/:id/comments
 * @desc    Fetch comments for an opportunity (public, flat legacy envelope)
 */
router.get('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const opportunity = await resolveOpportunity(String(req.params.id));
        const result = await listComments(opportunity.id, { userId: req.userId });
        const flat: LegacyComment[] = [];
        for (const root of result.comments) {
            flat.push(toLegacy(root));
            for (const reply of root.replies) flat.push(toLegacy(reply));
        }
        return res.json(flat);
    } catch (e) {
        return next(e);
    }
});

/**
 * @route   POST /api/opportunities/:id/comments
 * @desc    Post a comment on an opportunity (protected)
 */
router.post('/:id/comments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId || req.isAnonymous) {
            throw new AppError('Sign in required to post comments.', 401);
        }

        const { text } = req.body as { text?: string };
        if (!text || typeof text !== 'string' || text.trim().length === 0 || text.length > 500) {
            throw new AppError('Comment text must be between 1 and 500 characters.', 400);
        }

        const opportunity = await resolveOpportunity(String(req.params.id));
        const comment = await postComment({ opportunityId: opportunity.id, userId, text });

        return res.status(201).json({
            id: comment.id,
            text: comment.text,
            createdAt: comment.createdAt,
            user: {
                id: comment.user.id,
                username: comment.user.username,
            },
        });
    } catch (e) {
        return next(e);
    }
});

/**
 * @route   DELETE /api/opportunities/:id/comments/:commentId
 * @desc    Soft-delete a comment (protected, own comment only)
 */
router.delete(
    '/:id/comments/:commentId',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.userId;
            if (!userId || req.isAnonymous) {
                throw new AppError('Sign in required to delete comments.', 401);
            }
            const opportunity = await resolveOpportunity(String(req.params.id));
            await deleteComment({
                commentId: String(req.params.commentId),
                userId,
                opportunityId: opportunity.id,
            });
            return res.status(204).send();
        } catch (e) {
            return next(e);
        }
    }
);

export default router;
