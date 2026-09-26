import { Router } from 'express';
import { FollowType, prisma } from '@fresherflow/database';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

const FollowSchema = z.object({
  type: z.enum(['TAG', 'COMPANY', 'CONTRIBUTOR']),
  value: z.string().min(1),
});

// GET /api/follows
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.userId) {
      return next(new AppError('Authentication required', 401));
    }

    const follows = await prisma.userFollow.findMany({
      where: { userId: req.userId },
    });

    res.json({
      tags: follows.filter((f) => f.type === FollowType.TAG).map((f) => f.value),
      companies: follows.filter((f) => f.type === FollowType.COMPANY).map((f) => f.value),
      contributors: follows.filter((f) => f.type === FollowType.CONTRIBUTOR).map((f) => f.value),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/follows
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { type, value } = FollowSchema.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      return next(new AppError('Authentication required', 401));
    }

    // Limit check (20 per type)
    const count = await prisma.userFollow.count({
      where: { userId, type },
    });

    if (count >= 20) {
      return next(new AppError(`You can only follow up to 20 ${type.toLowerCase()}s`, 400));
    }

    const follow = await prisma.userFollow.upsert({
      where: {
        userId_type_value: { userId, type, value },
      },
      create: { userId, type, value },
      update: {}, // Do nothing if already following
    });

    res.json(follow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return next(new AppError(messages.join(', '), 400));
    }
    next(error);
  }
});

// DELETE /api/follows
router.delete('/', requireAuth, async (req, res, next) => {
  try {
    const { type, value } = FollowSchema.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      return next(new AppError('Authentication required', 401));
    }

    await prisma.userFollow.delete({
      where: {
        userId_type_value: { userId, type, value },
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return next(new AppError(messages.join(', '), 400));
    }
    // Idempotent delete: a missing row is already the desired end state.
    // Only the Prisma "record not found" code is swallowed; anything else
    // (connection loss, constraint failure) goes to the error handler.
    if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2025') {
      return res.json({ success: true });
    }
    return next(error);
  }
});

export default router;
