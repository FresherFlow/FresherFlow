import { Router } from 'express';
import { FollowType, prisma } from '@fresherflow/database';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const FollowSchema = z.object({
  type: z.enum(['TAG', 'COMPANY', 'CONTRIBUTOR']),
  value: z.string().min(1),
});

// GET /api/follows
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const follows = await prisma.userFollow.findMany({
      where: { userId: req.userId },
    });

    res.json({
      tags: follows.filter((f) => f.type === FollowType.TAG).map((f) => f.value),
      companies: follows.filter((f) => f.type === FollowType.COMPANY).map((f) => f.value),
      contributors: follows.filter((f) => f.type === FollowType.CONTRIBUTOR).map((f) => f.value),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch follows' });
  }
});

// POST /api/follows
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, value } = FollowSchema.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Limit check (20 per type)
    const count = await prisma.userFollow.count({
      where: { userId, type },
    });

    if (count >= 20) {
      return res.status(400).json({ error: `You can only follow up to 20 ${type.toLowerCase()}s` });
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
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to follow' });
  }
});

// DELETE /api/follows
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { type, value } = FollowSchema.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await prisma.userFollow.delete({
      where: {
        userId_type_value: { userId, type, value },
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    // Record not found is fine, treat as success
    res.json({ success: true });
  }
});

export default router;
