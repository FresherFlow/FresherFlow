import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getReadinessReport, getReadinessState } from '../../utils/readiness';

/**
 * Readiness probe — NOT a liveness probe.
 *
 * Contract with the platform (Render / Kubernetes):
 *   200 -> the instance can serve traffic; keep it in rotation
 *   503 -> take it out of rotation NOW (starting, draining, or a dependency is down)
 *
 * This is a separate router from `src/routes/public/health.ts` on purpose.
 * `/health` is liveness: it answers "the process is alive" and must never touch
 * a dependency, otherwise a database blip restarts every healthy instance.
 * `/health/deep` is diagnostic: it reports per-dependency status for humans.
 * This route is the machine-facing one, and it is additive — the existing two
 * responses are untouched.
 */

const router = express.Router();

// A readiness probe runs every few seconds from every replica. The limit is
// generous for a probe but still bounds the blast radius of a scripted caller
// against an unauthenticated endpoint that touches the database.
const readinessLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
});

/**
 * @route   GET /api/ready
 * @desc    Readiness probe. 200 when ready, 503 otherwise.
 */
router.get('/ready', readinessLimiter, async (_req: Request, res: Response) => {
    let report;
    try {
        report = await getReadinessReport();
    } catch {
        // getReadinessReport swallows probe errors by design, so reaching here
        // means something structural failed. Still answer with the right status
        // code and a generic body rather than letting a 500 leak through.
        res.status(503).json({
            state: getReadinessState(),
            ready: false,
            reason: 'dependency_unavailable',
        });
        return;
    }

    res.status(report.ready ? 200 : 503).json(report);
});

export default router;
