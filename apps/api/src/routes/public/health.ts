import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../../infrastructure/database/prisma';
import { redis } from '@fresherflow/database';

const router = express.Router();

const healthLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit to 30 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
});

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
router.get('/health/deep', healthLimiter, async (req: Request, res: Response) => {
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
 * @desc    Landing page stats. Counters derive from the same query as the
 *          public feed so the homepage number can never drift from what
 *          /jobs actually returns. Served live; no static cache file.
 */
router.get('/stats', healthLimiter, async (req: Request, res: Response) => {
    try {
        const count = await prisma.opportunity.count({
            where: { status: 'PUBLISHED', deletedAt: null },
        });
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
        res.json({ opportunities: count });
    } catch {
        res.json({ opportunities: 0 });
    }
});

export default router;
