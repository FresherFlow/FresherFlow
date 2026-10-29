import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.REDIS_ENABLED = 'false';
process.env.INTERNAL_API_SECRET = 'test-internal-secret';

/**
 * The sweeper is the automatic removal path: it expires dead listings by the
 * hundred, with no human in the loop. Expiring a row used to update the
 * database and nothing else, so the R2 feed kept listing the job (and its
 * per-job shard kept resolving) until an operator pressed "Regenerate all".
 */

const refreshFeedsAndAnnounce = vi.fn(async () => undefined);
const invalidatePublicOpportunityCache = vi.fn(async () => undefined);

vi.mock('../infrastructure/services/opportunity/feedRefresh', () => ({
    refreshFeedsAndAnnounce,
    scheduleDiscoveryFeedRefresh: vi.fn(async () => undefined),
}));

vi.mock('../infrastructure/services/opportunity/publicOpportunityCache.service', () => ({
    invalidatePublicOpportunityCache,
}));

vi.mock('../infrastructure/cache/adminCache', () => ({
    adminCache: { invalidate: vi.fn(), invalidateLists: vi.fn() },
}));

const deadJob = {
    id: 'opp-dead',
    slug: 'dead-job-opp-dead',
    title: 'Dead Job',
    status: 'PUBLISHED',
    expiredAt: null,
    category: 'EMPLOYMENT',
    recruitmentMethod: 'DIRECT',
};

const findMany = vi.fn(async () => [deadJob]);
const update = vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
    ...deadJob,
    ...args.data,
}));

vi.mock('../infrastructure/database/prisma', () => ({
    default: {
        opportunity: {
            findMany: (args: unknown) => findMany(args as never),
            update: (args: unknown) => update(args as never),
        },
    },
}));

let app: express.Application;

beforeAll(async () => {
    const expireRoutes = await import('../routes/pipeline/expireJobs');

    app = express();
    app.use(express.json());
    app.use('/api/pipeline', expireRoutes.default);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message } });
    });
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe('pipeline expire-jobs feed wiring', () => {
    it('rebuilds the R2 feed and announces it after an automatic sweep', async () => {
        const res = await request(app)
            .post('/api/pipeline/expire-jobs')
            .set('x-api-key', 'test-internal-secret')
            .send({ sweepExpired: true });

        expect(res.status).toBe(200);
        expect(res.body.expired).toBe(1);
        expect(update).toHaveBeenCalled();
        expect(refreshFeedsAndAnnounce).toHaveBeenCalledWith('pipeline-expire');
    });

    it('leaves the feed alone when nothing was expired', async () => {
        findMany.mockResolvedValueOnce([]);

        const res = await request(app)
            .post('/api/pipeline/expire-jobs')
            .set('x-api-key', 'test-internal-secret')
            .send({ sweepExpired: true });

        expect(res.status).toBe(200);
        expect(res.body.expired).toBe(0);
        expect(refreshFeedsAndAnnounce).not.toHaveBeenCalled();
    });
});
