import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../../infrastructure/database/prisma';
import { redis } from '@fresherflow/database';
import { sendError, ErrorCode } from '../../middleware/errorHandler';

const router = express.Router();

// `message` must be the standard envelope, not a bare string: a string
// `error` field is unreadable by `packages/api-client`, which showed users a
// generic "Request failed (429)" instead of the limit message.
const healthLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit to 30 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: ErrorCode.RATE_LIMITED, message: 'Too many requests', requestId: 'rate-limit' } },
});

/**
 * @route   GET /api/health
 * @desc    Lightweight health check (Gate-able)
 */
router.get('/health', (req: Request, res: Response) => {
    // Kill switch to stop Render/Monitoring hits entirely
    if (process.env.ENABLE_HEALTH_CHECK === 'false') {
        sendError(res, 503, ErrorCode.SERVICE_UNAVAILABLE, 'Health checks disabled in this environment', req.requestId);
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
        sendError(res, 503, ErrorCode.SERVICE_UNAVAILABLE, 'Health checks disabled', req.requestId);
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
