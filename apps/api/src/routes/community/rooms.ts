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
    updateRoom,
    archiveRoom,
    restoreRoom,
    listRoomOpportunities,
    shareRoomOpportunity,
    pinRoomOpportunity,
    removeRoomOpportunity,
} from '../../infrastructure/services/community/community.service';

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

const roomTagsSchema = z.array(z.string().min(1).max(50)).max(30).optional().default([]);

const createRoomSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    icon: z.string().max(10).optional(),
    // Rooms are described by free-form community tags (#2026, #tcs, #hyderabad).
    // Tags are display metadata only and never execute matching.
    tags: roomTagsSchema,
});

const updateRoomSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(2000).nullable().optional(),
    icon: z.string().max(10).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).max(30).optional(),
});

const shareOpportunitySchema = z.object({
    opportunityId: z.string().min(1).max(200),
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
// Update room (member-moderated: admins/moderators of the room)
// NOTE: tags describe the community; they never trigger opportunity matching.
// ========================================

router.patch(
    '/:slug',
    commentsWriteLimiter,
    requireAuth,
    validate(updateRoomSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const fetched = await getRoom(String(req.params.slug), userId);
        const role = (fetched.room as { memberRole?: string }).memberRole;
        if (role !== 'ADMIN' && role !== 'MODERATOR') {
            next(new AppError('Moderator role required', 403));
            return;
        }
        const result = await updateRoom(fetched.room.id, req.body as { name?: string; description?: string | null; icon?: string | null; tags?: string[] });
        return res.json(result);
    })
);

// ========================================
// Archive / restore room (room admin/moderator)
// ========================================

router.post(
    '/:slug/archive',
    commentsWriteLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const fetched = await getRoom(String(req.params.slug), userId);
        const role = (fetched.room as { memberRole?: string }).memberRole;
        if (role !== 'ADMIN' && role !== 'MODERATOR') {
            next(new AppError('Moderator role required', 403));
            return;
        }
        const result = await archiveRoom(fetched.room.id);
        return res.json(result);
    })
);

router.post(
    '/:slug/restore',
    commentsWriteLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const fetched = await getRoom(String(req.params.slug), userId);
        const role = (fetched.room as { memberRole?: string }).memberRole;
        if (role !== 'ADMIN' && role !== 'MODERATOR') {
            next(new AppError('Moderator role required', 403));
            return;
        }
        const result = await restoreRoom(fetched.room.id);
        return res.json(result);
    })
);

// ========================================
// Deliberate opportunity sharing (SHARED / PINNED)
// Tags never surface opportunities; only these endpoints create RoomOpportunity rows.
// ========================================

router.get(
    '/:slug/opportunities',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const reason = req.query.reason as 'PINNED' | 'SHARED' | undefined;
        if (reason !== undefined && reason !== 'PINNED' && reason !== 'SHARED') {
            throw new AppError('Invalid reason (PINNED or SHARED)', 400);
        }
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const result = await listRoomOpportunities(String(req.params.slug), { page, limit, reason });
        res.setHeader('Cache-Control', 'public, max-age=30');
        return res.json(result);
    })
);

router.post(
    '/:slug/opportunities',
    commentsWriteLimiter,
    requireAuth,
    validate(shareOpportunitySchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { opportunityId } = req.body as { opportunityId: string };
        const result = await shareRoomOpportunity({ slug: String(req.params.slug), opportunityId, userId });
        return res.status(result.deduped ? 200 : 201).json(result);
    })
);

router.post(
    '/:slug/opportunities/:oppId/pin',
    commentsWriteLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await pinRoomOpportunity({
            slug: String(req.params.slug),
            opportunityId: String(req.params.oppId),
            userId,
        });
        return res.json(result);
    })
);

router.delete(
    '/:slug/opportunities/:oppId',
    commentsWriteLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const result = await removeRoomOpportunity({
            slug: String(req.params.slug),
            opportunityId: String(req.params.oppId),
            userId,
        });
        return res.json(result);
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
