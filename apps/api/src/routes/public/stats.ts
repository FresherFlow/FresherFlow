import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../../infrastructure/database/prisma';
import { logger } from '@fresherflow/logger';

const router = Router();

/**
 * GET /api/public/stats
 * Returns global community statistics (anonymized)
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
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
