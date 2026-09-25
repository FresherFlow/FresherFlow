import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAccessToken, generateAdminToken } from '@fresherflow/utils';

// Secrets/env for user + admin tokens, redis-free rate limiting
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_ADMIN_SECRET = 'test-admin-secret';
process.env.REDIS_ENABLED = 'false';

type AccountState = {
    id: string;
    role: 'USER' | 'ADMIN';
    status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
    trustLevel: string;
    isModerator: boolean;
};

const accounts = new Map<string, AccountState>();

function account(id: string, patch?: Partial<AccountState>): AccountState {
    const base: AccountState = {
        id,
        role: 'USER',
        status: 'ACTIVE',
        trustLevel: 'VERIFIED',
        isModerator: false,
    };
    const next = { ...base, ...patch };
    accounts.set(id, next);
    return next;
}

const prismaMock = {
    user: { findUnique: vi.fn() },
    userAccessRole: { findFirst: vi.fn() },
    jobSubmission: { count: vi.fn() },
    interviewExperience: { count: vi.fn() },
    applicationUpdate: { count: vi.fn() },
    communityPost: { count: vi.fn() },
    resourceCollection: { count: vi.fn() },
    report: { count: vi.fn() },
};

vi.mock('@fresherflow/database', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@fresherflow/database')>();
    return {
        ...actual,
        prisma: prismaMock,
        redis: {},
    };
});

function userRecord(id: string) {
    const a = accounts.get(id);
    if (!a) return null;
    return { id: a.id, role: a.role, status: a.status, trustLevel: a.trustLevel };
}

let app: express.Application;
let userAuth: Record<string, string>;
let moderatorAuth: Record<string, string>;
let suspendedAuth: Record<string, string>;
let adminAuth: Record<string, string>;

beforeAll(async () => {
    const moderation = await import('../routes/admin/moderation');

    app = express();
    app.use(express.json());
    app.use('/api/admin/moderation', moderation.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message, statusCode: err.statusCode || 500 } });
    });

    account('user-1');
    account('moderator-1', { isModerator: true });
    account('suspended-mod', { status: 'SUSPENDED', trustLevel: 'BANNED', isModerator: true });
    account('admin-1', { role: 'ADMIN' });

    userAuth = { Authorization: `Bearer ${generateAccessToken('user-1')}` };
    moderatorAuth = { Authorization: `Bearer ${generateAccessToken('moderator-1')}` };
    suspendedAuth = { Authorization: `Bearer ${generateAccessToken('suspended-mod')}` };
    adminAuth = { Authorization: `Bearer ${generateAdminToken('admin-1')}` };
});

beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockImplementation(async (args: { where: { id: string } }) =>
        userRecord(args.where.id),
    );
    prismaMock.userAccessRole.findFirst.mockImplementation(async (args: { where: { userId: string } }) => {
        const a = accounts.get(args.where.userId);
        return a?.isModerator ? { userId: a.id } : null;
    });
    prismaMock.jobSubmission.count.mockResolvedValue(3);
    prismaMock.interviewExperience.count.mockResolvedValue(5);
    prismaMock.applicationUpdate.count.mockResolvedValue(7);
    prismaMock.communityPost.count.mockResolvedValue(2);
    prismaMock.resourceCollection.count.mockResolvedValue(4);
    prismaMock.report.count.mockResolvedValue(6);
});

describe('requireModerator (moderators AND admins pass)', () => {
    it('returns 401 without any token', async () => {
        const res = await request(app).get('/api/admin/moderation/overview');
        expect(res.status).toBe(401);
    });

    it('returns 403 for a plain user', async () => {
        const res = await request(app).get('/api/admin/moderation/overview').set(userAuth);
        expect(res.status).toBe(403);
    });

    it('returns 403 for a suspended moderator even with a valid grant', async () => {
        const res = await request(app).get('/api/admin/moderation/overview').set(suspendedAuth);
        expect(res.status).toBe(403);
    });

    it('lets a moderator through with a normal user token and returns queue counts', async () => {
        const res = await request(app).get('/api/admin/moderation/overview').set(moderatorAuth);
        expect(res.status).toBe(200);
        expect(res.body.queues).toEqual({
            jobs: 3,
            interviews: 5,
            updates: 7,
            hiringPosts: 2,
            resources: 4,
            reports: 6,
        });
    });

    it('lets an admin through with an admin token', async () => {
        const res = await request(app).get('/api/admin/moderation/overview').set(adminAuth);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('marks the overview response no-store', async () => {
        const res = await request(app).get('/api/admin/moderation/overview').set(moderatorAuth);
        expect(res.headers['cache-control']).toContain('no-store');
    });
});
