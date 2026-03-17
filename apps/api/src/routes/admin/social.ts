import { Router, Request, Response, NextFunction } from 'express';
import { SocialPlatform, SocialPostStatus } from '@prisma/client';
import { listSocialPosts, retrySocialPost } from '../../services/social/socialPost.service';

import { z } from 'zod';

const router = Router();

const listQuerySchema = z.object({
  platform: z.nativeEnum(SocialPlatform).optional(),
  status: z.nativeEnum(SocialPostStatus).optional(),
  page: z.coerce.number().min(1).default(1),
});

/**
 * GET /api/admin/social-posts
 * List social post attempts with optional filters.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = listQuerySchema.parse(req.query);
    const result = await listSocialPosts(validated);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: err.errors });
      return;
    }
    next(err);
  }
});

/**
 * POST /api/admin/social-posts/:id/retry
 * Retry a failed social post.
 */
router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await retrySocialPost(req.params['id'] as string);
    res.json({ message: 'Retry triggered' });
  } catch (err) {
    next(err);
  }
});

export default router;
