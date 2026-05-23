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
    // Disabled & Commented Out - Bypassed to save API & DB free tier resources.
    // Live Comments are now handled fully in real-time on Firebase RTDB.
    res.json([]);
});

/**
 * @route   POST /api/opportunities/:id/comments
 * @desc    Post a comment on an opportunity (protected)
 */
router.post('/:id/comments', requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const { text } = req.body;
    const userId = req.userId;
    if (!userId || req.isAnonymous) {
        throw new AppError('Sign in required to post comments.', 401);
    }

    if (!text || text.trim().length === 0 || text.length > 500) {
        throw new AppError('Comment text must be between 1 and 500 characters.', 400);
    }

    // Immediately return success with mock response for backward compatibility
    res.status(201).json({
        id: `mock_${Date.now()}`,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        user: {
            id: userId,
            username: 'User',
        }
    });
});

/**
 * @route   DELETE /api/opportunities/:id/comments/:commentId
 * @desc    Soft-delete a comment (protected, own comment only)
 */
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
    // Immediately return success with 204
    res.status(204).send();
});

export default router;
