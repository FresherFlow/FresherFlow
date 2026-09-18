import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import { notificationReadSchema } from '../../utils/validation';
import {
    notificationsLimiter,
    listNotifications,
    markNotificationsRead,
} from '../../infrastructure/services/community.service';

const router = Router();

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

function requireMember(req: Request, next: NextFunction): string | null {
    if (!req.userId || req.isAnonymous) {
        next(new AppError('Sign in required to view notifications', 401));
        return null;
    }
    return req.userId;
}

router.get(
    '/',
    notificationsLimiter,
    requireAuth,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const unreadOnly = String(req.query.unread ?? '') === 'true';
        const limit = Number(req.query.limit);
        const result = await listNotifications(userId, {
            unreadOnly,
            limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
        });
        res.setHeader('Cache-Control', 'private, no-store');
        return res.json(result);
    })
);

router.post(
    '/read',
    notificationsLimiter,
    requireAuth,
    validate(notificationReadSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = requireMember(req, next);
        if (!userId) return;
        const { ids } = req.body as { ids?: string[] };
        const result = await markNotificationsRead(userId, ids);
        return res.json(result);
    })
);

export default router;
