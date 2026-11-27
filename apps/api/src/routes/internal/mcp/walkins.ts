import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../../middleware/errorHandler';
import { createRateLimiter } from '../../../middleware/rateLimit';
import { browseWalkins } from '../../../application/opportunity/browseWalkins';

const router = Router();

const walkinsReadLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many walk-in requests. Please slow down.',
    keyPrefix: 'mcp-walkins-read',
});

const querySchema = z.object({
    city: z.string().trim().max(80).optional(),
    q: z.string().trim().max(100).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0.5).max(500).optional(),
    withinDays: z.coerce.number().int().min(1).max(90).optional(),
    skills: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).max(50).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
}).refine(
    (value) => (value.latitude === undefined) === (value.longitude === undefined),
    { message: 'latitude and longitude must be supplied together', path: ['latitude'] },
);

/** GET /api/internal/mcp/walkins — typed, ranked walk-in drives for MCP tools. */
router.get('/walkins', walkinsReadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            throw new AppError('Invalid query parameters. latitude and longitude must be supplied together.', 400);
        }
        const result = await browseWalkins(parsed.data);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
