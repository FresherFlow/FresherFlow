/**
 * Phase 8 gate: the user-side journey from discovery through funnel tracking.
 *
 * - POST /api/applications/:opportunityId applies (funnel record created).
 * - GET /api/applications/me + /me/summary serve the dashboard.
 * - PATCH /api/applications/:id/withdraw records the outcome.
 * - GET /api/applications/:id/history returns record + APPLICATION_UPDATE trail.
 * - POST /api/actions/:id with APPLIED stays a lightweight signal: it must NOT
 *   write OpportunityApplication (the UserAction vs funnel distinction).
 */
import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.REDIS_ENABLED = 'false';

const prismaMock = {
    opportunity: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
    },
    profile: {
        findUnique: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
    },
    userAction: {
        upsert: vi.fn(),
        findMany: vi.fn(),
    },
    opportunityApplication: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
    },
    alertDelivery: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
    },
    alertDispatchLog: {
        create: vi.fn(),
        findMany: vi.fn(),
    },
    pushSubscription: {
        findUnique: vi.fn(),
    },
};

// Supports both transaction forms the services use.
(prismaMock as Record<string, unknown>).$transaction = vi.fn(async (arg: unknown) =>
    typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prismaMock)
        : Promise.all(arg as Array<unknown>)
);

vi.mock('@fresherflow/database', async () => {
    const enums = await import('./helpers/dbEnums');
    return {
        ...enums,
        prisma: prismaMock,
        redis: {},
        OpportunityStatus: { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', ARCHIVED: 'ARCHIVED' },
        ApplicationStage: (enums as Record<string, unknown>).ApplicationStage,
        AlertKind: {
            ...((enums as Record<string, unknown>).AlertKind as Record<string, string>),
            NEW_JOB: 'NEW_JOB',
            CAMPUS_DRIVE: 'CAMPUS_DRIVE',
            REGISTRATION_OPEN: 'REGISTRATION_OPEN',
            REGISTRATION_CLOSING: 'REGISTRATION_CLOSING',
            APPLICATION_UPDATE: 'APPLICATION_UPDATE',
            CLOSING_SOON: 'CLOSING_SOON',
            DAILY_DIGEST: 'DAILY_DIGEST',
        },
        AlertChannel: {
            ...((enums as Record<string, unknown>).AlertChannel as Record<string, string>),
            EMAIL: 'EMAIL',
            APP: 'APP',
            PUSH: 'PUSH',
        },
    };
});

vi.mock('../middleware/auth', () => ({
    optionalAuth: (req: Request, _res: Response, next: NextFunction) => {
        next();
    },
    requireAuth: (req: Request, _res: Response, next: NextFunction) => {
        const user = req.headers['x-test-user'];
        if (typeof user !== 'string' || !user) {
            const err: Error & { statusCode?: number } = new Error('Authentication required');
            err.statusCode = 401;
            return next(err);
        }
        req.userId = user;
        next();
    },
}));

const AUTH = { 'x-test-user': 'user-1' };

let app: express.Application;

beforeAll(async () => {
    const applications = await import('../routes/applications');
    const actions = await import('../routes/actions');
    app = express();
    app.use(express.json());
    app.use('/api/applications', applications.default as Router);
    app.use('/api/actions', actions.default as unknown as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message, statusCode: err.statusCode || 500 } });
    });
});

const liveOpportunity = {
    id: 'opp-1',
    status: 'PUBLISHED',
    expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    expiredAt: null,
};

beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.opportunity.findFirst.mockResolvedValue(liveOpportunity);
    prismaMock.opportunity.findUnique.mockResolvedValue({ title: 'SDE', company: 'Acme', slug: 'sde', category: 'EMPLOYMENT' });
    prismaMock.user.findUnique.mockResolvedValue({
        email: 'u@test.com',
        fullName: 'User One',
        alertPreference: { enabled: true, emailEnabled: false },
    });
    prismaMock.pushSubscription.findUnique.mockResolvedValue(null);
    prismaMock.alertDelivery.findUnique.mockResolvedValue(null);
    prismaMock.alertDelivery.findMany.mockResolvedValue([]);
    prismaMock.alertDelivery.create.mockResolvedValue({ id: 'ad-1' });
    prismaMock.alertDispatchLog.create.mockResolvedValue({ id: 'log-1' });
    prismaMock.alertDispatchLog.findMany.mockResolvedValue([]);
});

describe('Phase 8: user application funnel', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app).get('/api/applications/me');
        expect(res.status).toBe(401);
    });

    it('applies to a live listing (201, idempotent funnel record)', async () => {
        prismaMock.opportunityApplication.upsert.mockResolvedValue({
            id: 'app-1',
            userId: 'user-1',
            opportunityId: 'opp-1',
            stage: 'APPLIED',
        });

        const res = await request(app).post('/api/applications/opp-1').set(AUTH).send({});

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.stage).toBe('APPLIED');
        expect(prismaMock.opportunityApplication.upsert).toHaveBeenCalledTimes(1);
    });

    it('rejects applying to a non-live listing with 410', async () => {
        prismaMock.opportunity.findFirst.mockResolvedValue({ ...liveOpportunity, status: 'ARCHIVED' });

        const res = await request(app).post('/api/applications/opp-1').set(AUTH).send({});
        expect(res.status).toBe(410);
    });

    it('lists my applications and serves the dashboard summary', async () => {
        prismaMock.opportunityApplication.count.mockResolvedValue(2);
        prismaMock.opportunityApplication.findMany.mockResolvedValue([
            { id: 'app-1', stage: 'APPLIED' },
            { id: 'app-2', stage: 'INTERVIEW' },
        ]);
        prismaMock.opportunityApplication.groupBy.mockResolvedValue([
            { stage: 'APPLIED', _count: { _all: 1 } },
            { stage: 'INTERVIEW', _count: { _all: 1 } },
        ]);

        const list = await request(app).get('/api/applications/me').set(AUTH);
        expect(list.status).toBe(200);
        expect(list.body.data).toHaveLength(2);
        expect(list.body.pagination.total).toBe(2);

        const summary = await request(app).get('/api/applications/me/summary').set(AUTH);
        expect(summary.status).toBe(200);
        expect(summary.body.data.total).toBe(2);
        expect(summary.body.data.byStage.APPLIED).toBe(1);
    });

    it('withdraws with an outcome and serves history', async () => {
        prismaMock.opportunityApplication.findUnique.mockResolvedValue({
            id: 'app-1',
            userId: 'user-1',
            opportunityId: 'opp-1',
            stage: 'APPLIED',
        });
        prismaMock.opportunityApplication.update.mockResolvedValue({
            id: 'app-1',
            userId: 'user-1',
            opportunityId: 'opp-1',
            stage: 'WITHDRAWN',
            outcome: 'Joined elsewhere',
        });
        prismaMock.alertDelivery.findMany.mockResolvedValue([
            { id: 'ad-9', kind: 'APPLICATION_UPDATE', sentAt: new Date(), metadata: null },
        ]);

        const withdraw = await request(app)
            .patch('/api/applications/app-1/withdraw')
            .set(AUTH)
            .send({ outcome: 'Joined elsewhere' });
        expect(withdraw.status).toBe(200);
        expect(withdraw.body.data.stage).toBe('WITHDRAWN');
        expect(prismaMock.opportunityApplication.update).toHaveBeenCalledTimes(1);

        const history = await request(app).get('/api/applications/app-1/history').set(AUTH);
        expect(history.status).toBe(200);
        expect(history.body.data.application.id).toBe('app-1');
        expect(history.body.data.history).toHaveLength(1);
    });

    it('keeps UserAction a lightweight signal: APPLIED writes no funnel record', async () => {
        prismaMock.opportunity.findFirst.mockResolvedValue({
            id: 'opp-1',
            deletedAt: null,
            status: 'PUBLISHED',
            recruitmentMethod: 'REGULAR',
            driveDetails: null,
            postedByUserId: 'admin-1',
        });
        prismaMock.profile.findUnique.mockResolvedValue({ userId: 'user-1' });
        prismaMock.userAction.upsert.mockResolvedValue({
            id: 'ua-1',
            userId: 'user-1',
            opportunityId: 'opp-1',
            actionType: 'APPLIED',
        });

        const res = await request(app)
            .post('/api/actions/opp-1/action')
            .set(AUTH)
            .send({ actionType: 'APPLIED' });

        expect(res.status).toBe(200);
        expect(res.body.action.actionType).toBe('APPLIED');
        expect(res.body.funnelHint).toContain('/api/applications');
        // The distinction: the signal router never touches the funnel table.
        expect(prismaMock.opportunityApplication.upsert).not.toHaveBeenCalled();
        expect(prismaMock.opportunityApplication.create).toBeUndefined();
    });
});
