/**
 * PHASE 17/18 — API contract quality gates.
 *
 * Pins the behaviours that previously drifted per route:
 *  - error envelope is always `{ error: { message } }` (never a bare string,
 *    never a raw Zod issues array, never a raw Prisma message)
 *  - unknown resources are 404 (saved toggle keeps `saved: false` for old clients)
 *  - duplicate creates are 409/idempotent-success, never 500 (P2002 mapping)
 *  - the shared graceful-shutdown contract drains in dependency order
 *
 * Prisma is faked at the module boundary, matching the existing suites.
 */

import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.REDIS_ENABLED = 'false';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const prismaMock = {
    opportunity: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
    },
    savedOpportunity: {
        deleteMany: vi.fn(),
        create: vi.fn(),
    },
    userFollow: {
        findMany: vi.fn(),
        count: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
    },
    listingFeedback: {
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
    },
};

vi.mock('../infrastructure/database/prisma', () => ({
    default: prismaMock,
}));

vi.mock('@fresherflow/database', async () => ({
    ...(await import('./helpers/dbEnums')),
    prisma: prismaMock,
}));

vi.mock('../middleware/auth', () => ({
    requireAuth: (req: Request, _res: Response, next: NextFunction) => {
        req.userId = 'user-1';
        next();
    },
    optionalAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../middleware/validate', () => ({
    // Pass through: this suite pins handler status mapping, not Zod parsing
    // (covered by search-filters / submit suites).
    validate: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../application/opportunity/engagement', () => ({
    updateOpportunityEngagement: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../infrastructure/services/alerts/telegram.service', () => ({
    default: { notifyListingFeedback: vi.fn() },
}));

function buildApp(router: express.Router | express.Application): express.Application {
    const app = express();
    app.use(express.json());
    app.use(router);
    app.use(errorHandler);
    return app;
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── Saved toggle ────────────────────────────────────────────────────────────

describe('contract: saved toggle', () => {
    it('returns 404 with the error envelope for an unknown id (keeps saved:false)', async () => {
        const router = (await import('../routes/saved')).default;
        prismaMock.opportunity.findFirst.mockResolvedValue(null);

        const res = await request(buildApp(router)).post('/no-such-id');

        expect(res.status).toBe(404);
        expect(res.body.saved).toBe(false);
        expect(typeof res.body.error?.message).toBe('string');
    });

    it('treats a P2002 unique violation on concurrent save as success, not 500', async () => {
        const router = (await import('../routes/saved')).default;
        prismaMock.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
        prismaMock.savedOpportunity.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.savedOpportunity.create.mockRejectedValue({ code: 'P2002' });

        const res = await request(buildApp(router)).post('/opp-1');

        expect(res.status).toBe(200);
        expect(res.body.saved).toBe(true);
    });
});

// ─── Follows ─────────────────────────────────────────────────────────────────

describe('contract: follows validation envelope', () => {
    it('returns 400 with { error: { message } } for an invalid body', async () => {
        const router = (await import('../routes/follows')).default;

        const res = await request(buildApp(router))
            .post('/')
            .send({ type: 'NOPE', value: '' });

        expect(res.status).toBe(400);
        expect(typeof res.body.error?.message).toBe('string');
        // The raw Zod issues array must never reach the client.
        expect(Array.isArray(res.body.error)).toBe(false);
    });

    it('returns 400 with the envelope when the per-type follow quota is hit', async () => {
        const router = (await import('../routes/follows')).default;
        prismaMock.userFollow.count.mockResolvedValue(20);

        const res = await request(buildApp(router))
            .post('/')
            .send({ type: 'TAG', value: 'react' });

        expect(res.status).toBe(400);
        expect(res.body.error?.message).toContain('20');
    });
});

// ─── Feedback conflict ───────────────────────────────────────────────────────

describe('contract: feedback duplicate is a 409', () => {
    it('maps a P2002 unique violation to 409 with the error envelope', async () => {
        const router = (await import('../routes/feedback')).default;
        prismaMock.opportunity.findUnique.mockResolvedValue({ id: 'opp-1' });
        prismaMock.listingFeedback.findUnique.mockResolvedValue(null);
        prismaMock.listingFeedback.create.mockRejectedValue({ code: 'P2002' });

        const res = await request(buildApp(router))
            .post('/opp-1/feedback')
            .send({ reason: 'SPAM' });

        expect(res.status).toBe(409);
        expect(res.body.error?.message).toContain('already submitted');
    });
});

// ─── Graceful shutdown contract ──────────────────────────────────────────────

describe('contract: graceful shutdown drains in order', () => {
    it('marks draining and releases http, redis, then database', async () => {
        const { resetReadiness, shutdown, getReadinessState } = await import('../utils/readiness');
        resetReadiness();

        const order: string[] = [];
        await shutdown(
            {
                stopHttp: async () => {
                    order.push('http');
                },
                closeRedis: async () => {
                    order.push('redis');
                },
                closeDatabase: async () => {
                    order.push('database');
                },
            },
            2000,
        );

        expect(order).toEqual(['http', 'redis', 'database']);
        expect(getReadinessState()).toBe('draining');
        resetReadiness();
    });
});
