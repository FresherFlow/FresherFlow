import { Router } from 'express';
import { prisma } from '@fresherflow/database';
import { requireAuth } from '../../../middleware/auth';
import { AppError } from '../../../middleware/errorHandler';

const router = Router();

/**
 * @route   GET /api/opportunities/:id/comments
 * @desc    Fetch comments for an opportunity (public)
 */
router.get('/:id/comments', async (req, res) => {
    const id = req.params.id as string;
    const comments = await prisma.opportunityComment.findMany({
        where: {
            opportunityId: id,
            deletedAt: null,
        },
        select: {
            id: true,
            text: true,
            createdAt: true,
            user: {
                select: {
                    id: true,
                    fullName: true,
                }
            }
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 50,
    });
    res.json(comments);
});

/**
 * @route   POST /api/opportunities/:id/comments
 * @desc    Post a comment on an opportunity (protected)
 */
router.post('/:id/comments', requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const { text } = req.body;
    const userId = req.userId;
    if (!userId) {
        throw new AppError('Authentication required.', 401);
    }

    if (!text || text.trim().length === 0 || text.length > 500) {
        throw new AppError('Comment text must be between 1 and 500 characters.', 400);
    }

    // Rate limiting: 3 comments per user per opportunity
    const existingCount = await prisma.opportunityComment.count({
        where: {
            opportunityId: id,
            userId,
            deletedAt: null,
        }
    });

    if (existingCount >= 3) {
        throw new AppError('You can only post up to 3 comments per opportunity.', 429);
    }

    const comment = await prisma.$transaction(async (tx) => {
        const c = await tx.opportunityComment.create({
            data: {
                text: text.trim(),
                opportunityId: id,
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    }
                }
            }
        });

        await tx.opportunity.update({
            where: { id: id },
            data: { commentsCount: { increment: 1 } }
        });

        return c;
    });

    res.status(201).json(comment);
});

/**
 * @route   DELETE /api/opportunities/:id/comments/:commentId
 * @desc    Soft-delete a comment (protected, own comment only)
 */
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const commentId = req.params.commentId as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).userId;

    const comment = await prisma.opportunityComment.findUnique({
        where: { id: commentId as string }
    });

    if (!comment || comment.deletedAt) {
        throw new AppError('Comment not found.', 404);
    }

    if (comment.userId !== userId) {
        throw new AppError('Not authorized to delete this comment.', 403);
    }

    await prisma.$transaction(async (tx) => {
        await tx.opportunityComment.update({
            where: { id: commentId },
            data: { deletedAt: new Date() }
        });

        await tx.opportunity.update({
            where: { id: id },
            data: { commentsCount: { decrement: 1 } }
        });
    });

    res.status(204).send();
});

export default router;
