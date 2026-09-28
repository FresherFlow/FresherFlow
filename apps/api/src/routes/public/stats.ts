import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../../infrastructure/database/prisma';
import { logger } from '@fresherflow/utils';
import { createRateLimiter } from '../../middleware/rateLimit';

const router = Router();

// Served from a file when present, but the fallback runs three counts in the
// database, so the endpoint keeps its own cap.
const publicStatsLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many requests. Please slow down.',
    keyPrefix: 'public-stats',
});

/**
 * GET /api/public/stats
 * Returns global community statistics (anonymized)
 */
router.get('/', publicStatsLimiter, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const statsPath = path.join(process.cwd(), 'public', 'stats.json');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        if (fs.existsSync(statsPath)) {
            return res.json(JSON.parse(fs.readFileSync(statsPath, 'utf8')));
        }

        const userCount = await prisma.user.count();
        res.json({
            stats: {
                totalDownloads: userCount,
                totalUsers: userCount,
                displayCount: userCount >= 1000 ? `${(userCount / 1000).toFixed(1)}k+` : `${userCount}`
            }
        });
    } catch (error) {
        logger.error('Failed to fetch public stats', error);
        next(error);
    }
});

export default router;
