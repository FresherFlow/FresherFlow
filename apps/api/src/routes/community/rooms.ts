import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth, requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import {
    communityReadLimiter,
    commentsWriteLimiter,
    listRooms,
    getRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    listRoomPosts,
} from '../../infrastructure/services/community.service';

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

const createRoomSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    icon: z.string().max(10).optional(),
    type: z.enum(['BATCH', 'SKILL', 'LOCATION', 'COMPANY', 'TOPIC', 'CUSTOM']).optional(),
});

// ========================================
// List rooms
// ========================================

router.get(
    '/',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const type = req.query.type as string | undefined;
        const search = req.query.search as string | undefined;
        const sort = req.query.sort as 'popular' | 'newest' | undefined;
        const result = await listRooms({
            page, limit, type, search, sort,
            userId: req.isAnonymous ? null : req.userId,
        });
        res.setHeader('Cache-Control', 'public, max-age=60');
        return res.json(result);
    })
);

// ========================================
// Get room by slug
// ========================================

router.get(
    '/:slug',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const result = await getRoom(String(req.params.slug), req.isAnonymous ? null : req.userId);
        res.setHeader('Cache-Control', 'public, max-age=30');
        return res.json(result);
    })
);

// ========================================
// Create room (admin only — rooms are curated, never user-created)
// ========================================

router.post(
    '/',
    commentsWriteLimiter,
    requireAuth,
    requireAdmin,
    validate(createRoomSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await createRoom({ createdByUserId: userId, ...req.body });
        return res.status(201).json(result);
    })
);

// ========================================
// Join room
// ========================================

router.post(
    '/:slug/join',
    commentsWriteLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await joinRoom({ slug: String(req.params.slug), userId });
        return res.json(result);
    })
);

// ========================================
// Leave room
// ========================================

router.post(
    '/:slug/leave',
    commentsWriteLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await leaveRoom({ slug: String(req.params.slug), userId });
        return res.json(result);
    })
);

// ========================================
// List posts in a room
// ========================================

router.get(
    '/:slug/posts',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const result = await listRoomPosts(String(req.params.slug), {
            page, limit,
            userId: req.isAnonymous ? null : req.userId,
        });
        res.setHeader('Cache-Control', 'public, max-age=30');
        return res.json(result);
    })
);

export default router;
