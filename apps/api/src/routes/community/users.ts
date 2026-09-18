import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { optionalAuth } from '../../middleware/auth';
import { communityReadLimiter, getUserActivity } from '../../infrastructure/services/community.service';

const router = Router();

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

router.get(
    '/:username/activity',
    communityReadLimiter,
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const limit = Number(req.query.limit);
        const result = await getUserActivity(String(req.params.username), {
            limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
        });
        res.setHeader('Cache-Control', 'public, max-age=60');
        return res.json(result);
    })
);

export default router;
