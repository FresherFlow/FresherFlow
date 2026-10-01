import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Secrets/env for token + redis-free rate limiting (mirrors community.test.ts)
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.REDIS_ENABLED = 'false';

// Firebase is the live comment plane; the fanout reads the follower set with the
// admin SDK. Only `.ref(path).get() -> snapshot.val()` is exercised, so that is
// all we fake.
const { firebaseRefGet } = vi.hoisted(() => ({ firebaseRefGet: vi.fn() }));

vi.mock('firebase-admin/database', () => ({
    getDatabase: () => ({
        ref: () => ({ get: firebaseRefGet }),
    }),
}));

vi.mock('../lib/firebase', () => ({
    getFirebaseApp: () => ({}),
}));

const prismaMock = {
    user: {
        findMany: vi.fn(),
    },
    opportunity: {
        findUnique: vi.fn(),
    },
    notification: {
        createMany: vi.fn(),
    },
};

vi.mock('@fresherflow/database', async () => ({
    // Full enum set mirrored from the schema so an enum split cannot break
    // test collection with `No "X" export is defined on the mock`.
    ...(await import('./helpers/dbEnums')),
    prisma: prismaMock,
    redis: {},
}));

// Test auth: identity is injected via headers so we can exercise 401 paths.
// The route additionally rejects anonymous identities itself.
vi.mock('../middleware/auth', () => ({
    requireAuth: (req: Request, _res: Response, next: NextFunction) => {
        const user = req.headers['x-test-user'];
        if (typeof user !== 'string' || !user) {
            const err: Error & { statusCode?: number } = new Error('Authentication required');
            err.statusCode = 401;
            return next(err);
        }
        req.userId = user;
        req.isAnonymous = req.headers['x-test-anon'] === 'true';
        next();
    },
}));

let app: express.Application;
let resetRateLimitStoreForTests: () => void;

const AUTH = { 'x-test-user': 'user-1' };
const ANON = { 'x-test-user': 'anon-1', 'x-test-anon': 'true' };

const BODY = {
    threadKind: 'job' as const,
    threadId: 'opp-1',
    commentId: 'fb-comment-1',
    excerpt: 'Has anyone cleared the OA?',
};

function followers(ids: string[]): { val: () => Record<string, boolean> } {
    return { val: () => Object.fromEntries(ids.map((id) => [id, true])) };
}

beforeAll(async () => {
    ({ resetRateLimitStoreForTests } = await import('../middleware/rateLimit'));

    const discussions = await import('../routes/community/discussionActivity');

    app = express();
    app.use(express.json());
    app.use('/api/discussions', discussions.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message, statusCode: err.statusCode || 500 } });
    });
});

beforeEach(() => {
    vi.clearAllMocks();
    // Rate-limit counters share one in-memory bucket per IP; reset between cases.
    resetRateLimitStoreForTests();
    firebaseRefGet.mockResolvedValue(followers([]));
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.opportunity.findUnique.mockResolvedValue({ id: 'opp-1' });
    prismaMock.notification.createMany.mockResolvedValue({ count: 0 });
});

describe('POST /api/discussions/comment-activity', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app).post('/api/discussions/comment-activity').send(BODY);
        expect(res.status).toBe(401);
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it('returns 401 for anonymous identities', async () => {
        const res = await request(app).post('/api/discussions/comment-activity').set(ANON).send(BODY);
        expect(res.status).toBe(401);
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid thread kind', async () => {
        const res = await request(app)
            .post('/api/discussions/comment-activity')
            .set(AUTH)
            .send({ ...BODY, threadKind: 'room' });
        expect(res.status).toBe(400);
    });

    it('returns 400 for a missing thread id', async () => {
        const res = await request(app)
            .post('/api/discussions/comment-activity')
            .set(AUTH)
            .send({ ...BODY, threadId: '' });
        expect(res.status).toBe(400);
    });

    it('returns notified 0 when nobody follows the thread', async () => {
        firebaseRefGet.mockResolvedValue(followers([]));

        const res = await request(app).post('/api/discussions/comment-activity').set(AUTH).send(BODY);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ notified: 0 });
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it('never notifies the author about their own comment', async () => {
        firebaseRefGet.mockResolvedValue(followers(['user-1']));

        const res = await request(app).post('/api/discussions/comment-activity').set(AUTH).send(BODY);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ notified: 0 });
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it('drops follower ids that no longer exist in Postgres', async () => {
        firebaseRefGet.mockResolvedValue(followers(['ghost-1', 'ghost-2']));
        prismaMock.user.findMany.mockResolvedValue([]);

        const res = await request(app).post('/api/discussions/comment-activity').set(AUTH).send(BODY);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ notified: 0 });
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it('fans out one COMMENT_REPLY row per real follower', async () => {
        firebaseRefGet.mockResolvedValue(followers(['user-1', 'user-2', 'user-3']));
        prismaMock.user.findMany.mockResolvedValue([{ id: 'user-2' }, { id: 'user-3' }]);
        prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

        const res = await request(app).post('/api/discussions/comment-activity').set(AUTH).send(BODY);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ notified: 2 });
        expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
            data: [
                expect.objectContaining({
                    userId: 'user-2',
                    type: 'COMMENT_REPLY',
                    actorId: 'user-1',
                    opportunityId: 'opp-1',
                    commentId: null,
                    payload: expect.objectContaining({
                        threadKind: 'job',
                        threadId: 'opp-1',
                        firebaseCommentId: 'fb-comment-1',
                    }),
                }),
                expect.objectContaining({ userId: 'user-3', actorId: 'user-1' }),
            ],
        });
    });

    it('resolves the opportunity server-side and ignores any client-supplied id', async () => {
        firebaseRefGet.mockResolvedValue(followers(['user-2']));
        prismaMock.user.findMany.mockResolvedValue([{ id: 'user-2' }]);
        prismaMock.notification.createMany.mockResolvedValue({ count: 1 });

        const res = await request(app)
            .post('/api/discussions/comment-activity')
            .set(AUTH)
            .send({ ...BODY, opportunityId: 'attacker-chosen-id' });

        expect(res.status).toBe(200);
        expect(prismaMock.opportunity.findUnique).toHaveBeenCalledWith({
            where: { id: 'opp-1' },
            select: { id: true },
        });
        expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
            data: [expect.objectContaining({ opportunityId: 'opp-1' })],
        });
    });

    it('leaves opportunityId null for a company thread', async () => {
        firebaseRefGet.mockResolvedValue(followers(['user-2']));
        prismaMock.user.findMany.mockResolvedValue([{ id: 'user-2' }]);
        prismaMock.notification.createMany.mockResolvedValue({ count: 1 });

        const res = await request(app)
            .post('/api/discussions/comment-activity')
            .set(AUTH)
            .send({ ...BODY, threadKind: 'company', threadId: 'acme' });

        expect(res.status).toBe(200);
        expect(prismaMock.opportunity.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
            data: [
                expect.objectContaining({
                    opportunityId: null,
                    payload: expect.objectContaining({ threadKind: 'company', threadId: 'acme' }),
                }),
            ],
        });
    });

    it('caps the fanout at 500 recipients', async () => {
        const ids = Array.from({ length: 600 }, (_, i) => `user-${i + 1}`);
        firebaseRefGet.mockResolvedValue(followers(ids));
        prismaMock.user.findMany.mockResolvedValue(ids.slice(0, 500).map((id) => ({ id })));
        prismaMock.notification.createMany.mockResolvedValue({ count: 500 });

        const res = await request(app).post('/api/discussions/comment-activity').set(AUTH).send(BODY);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ notified: 500 });
        const call = prismaMock.user.findMany.mock.calls[0][0] as { where: { id: { in: string[] } } };
        expect(call.where.id.in).toHaveLength(500);
        expect(call.where.id.in).not.toContain('user-600');
    });

    it('degrades to notified 0 when the fanout itself fails', async () => {
        firebaseRefGet.mockResolvedValue(followers(['user-2']));
        prismaMock.user.findMany.mockResolvedValue([{ id: 'user-2' }]);
        prismaMock.notification.createMany.mockRejectedValue(new Error('db down'));

        const res = await request(app).post('/api/discussions/comment-activity').set(AUTH).send(BODY);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ notified: 0 });
    });
});
