import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../../infrastructure/database/prisma';
import { redis } from '@fresherflow/redis';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Lightweight health check (Gate-able)
 */
router.get('/health', (req: Request, res: Response) => {
    // Kill switch to stop Render/Monitoring hits entirely
    if (process.env.ENABLE_HEALTH_CHECK === 'false') {
        res.status(503).json({ error: 'Health checks disabled in this environment' });
        return;
    }
    res.status(200).send('ok');
});

/**
 * @route   GET /api/health/deep
 * @desc    Detailed health check (DB, Redis)
 */
router.get('/health/deep', async (req: Request, res: Response) => {
    if (process.env.ENABLE_HEALTH_CHECK === 'false') {
        res.status(503).json({ error: 'Health checks disabled' });
        return;
    }

    const [dbStatus, redisStatus] = await Promise.allSettled([
        prisma.$queryRaw`SELECT 1`,
        redis.ping(),
    ]);

    const isHealthy = dbStatus.status === 'fulfilled' && redisStatus.status === 'fulfilled';

    res.status(isHealthy ? 200 : 500).json({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
            database: dbStatus.status === 'fulfilled' ? 'connected' : 'disconnected',
            redis: redisStatus.status === 'fulfilled' ? 'connected' : 'disconnected',
        }
    });
});

/**
 * @route   GET /api/stats
 * @desc    Landing page stats (Served from STATIC to save Neon compute)
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const statsPath = path.join(process.cwd(), 'public', 'stats.json');

        // Serve static if exists (Zero-DB)
        if (fs.existsSync(statsPath)) {
            const data = fs.readFileSync(statsPath, 'utf8');
            res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
            return res.json(JSON.parse(data));
        }

        // Fallback to DB only if static file is missing
        const count = await prisma.opportunity.count({
            where: { status: 'PUBLISHED', deletedAt: null },
        });
        res.json({ opportunities: count, fallback: true });
    } catch {
        res.json({ opportunities: 0 });
    }
});

export default router;
