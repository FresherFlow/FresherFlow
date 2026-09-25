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
    isAnonymous: boolean;
    perms: string[];
    isModerator: boolean;
};

const MODERATOR_PERMS = [
    'opportunity.review',
    'opportunity.edit',
    'opportunity.publish',
    'opportunity.archive',
    'opportunity.restore',
    'report.resolve',
    'community.moderate',
    'resource.moderate',
    'user.manage',
];

const accounts = new Map<string, AccountState>();

function account(id: string, patch?: Partial<AccountState>): AccountState {
    const base: AccountState = {
        id,
        role: 'USER',
        status: 'ACTIVE',
        trustLevel: 'VERIFIED',
        isAnonymous: false,
        perms: [],
        isModerator: false,
    };
    const next = { ...base, ...patch };
    accounts.set(id, next);
    return next;
}

const txMock = {
    user: { findUnique: vi.fn() },
    accessRole: { findUnique: vi.fn() },
    userAccessRole: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
};

const prismaMock = {
    user: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    accessRole: { findUnique: vi.fn() },
    userAccessRole: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    report: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    communityPost: { findUnique: vi.fn(), update: vi.fn() },
    interviewExperience: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
    },
    jobSubmission: { findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    opportunity: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    rawOpportunity: { count: vi.fn() },
    adminAudit: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    resourceCollection: { findUnique: vi.fn() },
    $transaction: vi.fn(),
    // requirePermission/getUserPermissions resolve grants through a raw join
    // over Permission <- AccessRolePermission <- UserAccessRole.
    $queryRaw: vi.fn(),
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
    return { id: a.id, role: a.role, status: a.status, trustLevel: a.trustLevel, isAnonymous: a.isAnonymous };
}

let app: express.Application;
let userAuth: Record<string, string>;
let moderatorAuth: Record<string, string>;
let suspendedAuth: Record<string, string>;
let adminAuth: Record<string, string>;

beforeAll(async () => {
    const [reports, community, moderators, users, audit, opportunities] =
        await Promise.all([
            import('../routes/admin/reports'),
            import('../routes/admin/community'),
            import('../routes/admin/moderators'),
            import('../routes/admin/users'),
            import('../routes/admin/audit'),
            import('../routes/admin/opportunities/index'),
        ]);

    app = express();
    app.use(express.json());
    app.use('/api/admin/reports', reports.default as Router);
    app.use('/api/admin/community', community.default as Router);
    app.use('/api/admin/moderators', moderators.default as Router);
    app.use('/api/admin/users', users.default as Router);
    app.use('/api/admin/audit', audit.default as Router);
    app.use('/api/admin/opportunities', opportunities.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message, statusCode: err.statusCode || 500 } });
    });

    account('user-1');
    account('moderator-1', { perms: [...MODERATOR_PERMS], isModerator: true });
    account('suspended-mod', { status: 'SUSPENDED', trustLevel: 'BANNED', perms: [...MODERATOR_PERMS], isModerator: true });
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
    prismaMock.$queryRaw.mockImplementation(async (_query: unknown, ...params: unknown[]) => {
        const id = String(params[0] ?? '');
        const a = accounts.get(id);
        if (!a) return [];
        if (a.role === 'ADMIN') {
            // SUPER_ADMIN holds every permission used in these suites.
            return [
                ...MODERATOR_PERMS,
                'opportunity.create',
                'opportunity.delete',
                'resource.manage',
                'moderator.manage',
                'settings.manage',
                'audit.view',
                'source.manage',
                'ingestion.manage',
            ].map((key) => ({ key }));
        }
        return a.perms.map((key) => ({ key }));
    });
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock));
    txMock.user.findUnique.mockImplementation(async (args: { where: { id: string } }) => userRecord(args.where.id));
    txMock.accessRole.findUnique.mockResolvedValue({ id: 'role-mod' });
    prismaMock.accessRole.findUnique.mockResolvedValue({ id: 'role-mod' });
    prismaMock.adminAudit.create.mockResolvedValue({});
    prismaMock.adminAudit.findMany.mockResolvedValue([]);
    prismaMock.adminAudit.count.mockResolvedValue(0);
    prismaMock.report.findMany.mockResolvedValue([]);
    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.interviewExperience.findMany.mockResolvedValue([]);
    prismaMock.interviewExperience.count.mockResolvedValue(0);
    prismaMock.opportunity.findMany.mockResolvedValue([]);
    prismaMock.opportunity.count.mockResolvedValue(0);
    prismaMock.rawOpportunity.count.mockResolvedValue(0);
    prismaMock.jobSubmission.findMany.mockResolvedValue([]);
    prismaMock.jobSubmission.count.mockResolvedValue(0);
});

describe('staff authentication (moderators via normal login)', () => {
    it('returns 401 on moderation queues without any token', async () => {
        const res = await request(app).get('/api/admin/reports');
        expect(res.status).toBe(401);
    });

    it('rejects a suspended moderator with 403 even with valid grants', async () => {
        const res = await request(app).get('/api/admin/reports').set(suspendedAuth);
        expect(res.status).toBe(403);
    });

    it('lets a moderator reach the report queue with a normal user token', async () => {
        const res = await request(app).get('/api/admin/reports').set(moderatorAuth);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('openCount');
    });

    it('lets a moderator reach the community moderation queue with a normal user token', async () => {
        prismaMock.interviewExperience.findMany.mockResolvedValue([{ id: 'exp-1' }]);
        prismaMock.interviewExperience.count.mockResolvedValue(1);

        const res = await request(app)
            .get('/api/admin/community/moderation-queue?kind=interview')
            .set(moderatorAuth);

        expect(res.status).toBe(200);
        expect(res.body.kind).toBe('interview');
    });

    it('lets a moderator list the job-submission queue with a normal user token', async () => {
        const res = await request(app).get('/api/admin/opportunities/community-submissions').set(moderatorAuth);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('pendingCount');
    });

    it('lets a moderator list opportunities with a normal user token', async () => {
        const res = await request(app).get('/api/admin/opportunities').set(moderatorAuth);
        expect(res.status).toBe(200);
    });
});

describe('plain users cannot moderate', () => {
    it('returns 403 on the report queue', async () => {
        const res = await request(app).get('/api/admin/reports').set(userAuth);
        expect(res.status).toBe(403);
    });

    it('returns 403 on community moderation actions', async () => {
        const res = await request(app).delete('/api/admin/community/posts/post-1').set(userAuth).send({});
        expect(res.status).toBe(403);
    });

    it('returns 403 on the opportunities list', async () => {
        const res = await request(app).get('/api/admin/opportunities').set(userAuth);
        expect(res.status).toBe(403);
    });

    it('returns 403 on report resolve', async () => {
        const res = await request(app).post('/api/admin/reports/rep-1/resolve').set(userAuth).send({});
        expect(res.status).toBe(403);
    });

    it('returns 403 on the audit trail', async () => {
        const res = await request(app).get('/api/admin/audit').set(userAuth);
        expect(res.status).toBe(403);
    });
});

describe('moderator least-privilege boundary', () => {
    it('cannot grant the moderator role (moderator.manage)', async () => {
        txMock.userAccessRole.findUnique.mockResolvedValue(null);

        const res = await request(app).post('/api/admin/moderators/user-1').set(moderatorAuth).send({});
        expect(res.status).toBe(403);
    });

    it('cannot revoke the moderator role', async () => {
        const res = await request(app).delete('/api/admin/moderators/moderator-1').set(moderatorAuth);
        expect(res.status).toBe(403);
    });

    it('cannot list moderators', async () => {
        const res = await request(app).get('/api/admin/moderators').set(moderatorAuth);
        expect(res.status).toBe(403);
    });

    it('cannot hard-delete opportunities (opportunity.delete)', async () => {
        const res = await request(app)
            .delete('/api/admin/opportunities/opp-1/hard')
            .set(moderatorAuth)
            .send({ reason: 'Trying to hard-delete as moderator' });
        expect(res.status).toBe(403);
    });

    it('cannot read the audit trail (audit.view)', async () => {
        const res = await request(app).get('/api/admin/audit').set(moderatorAuth);
        expect(res.status).toBe(403);
    });

    it('cannot suspend privileged (ADMIN) targets', async () => {
        account('admin-target', { role: 'ADMIN' });

        const res = await request(app)
            .post('/api/admin/users/admin-target/status')
            .set(moderatorAuth)
            .send({ status: 'SUSPENDED', reason: 'Attempting to suspend an admin' });
        expect(res.status).toBe(403);
    });

    it('cannot suspend its own account', async () => {
        const res = await request(app)
            .post('/api/admin/users/moderator-1/status')
            .set(moderatorAuth)
            .send({ status: 'SUSPENDED', reason: 'Self suspend attempt' });
        expect(res.status).toBe(403);
    });

    it('CAN suspend a plain abusive user (explicitly-required account action)', async () => {
        account('abuser-1');
        prismaMock.user.update.mockResolvedValue({ id: 'abuser-1', status: 'SUSPENDED', trustLevel: 'BANNED' });

        const res = await request(app)
            .post('/api/admin/users/abuser-1/status')
            .set(moderatorAuth)
            .send({ status: 'SUSPENDED', reason: 'Spamming job discussions' });
        expect(res.status).toBe(200);
    });
});

describe('admin moderator management', () => {
    it('lists moderators with assignment metadata', async () => {
        prismaMock.userAccessRole.findMany.mockResolvedValue([
            {
                assignedAt: new Date('2026-01-02T00:00:00Z'),
                assignedBy: 'admin-1',
                user: { id: 'moderator-1', status: 'ACTIVE' },
            },
        ]);

        const res = await request(app).get('/api/admin/moderators').set(adminAuth);
        expect(res.status).toBe(200);
        expect(res.body.moderators).toHaveLength(1);
        expect(res.body.moderators[0]).toMatchObject({ id: 'moderator-1', assignedBy: 'admin-1' });
    });

    it('grants the role once and rejects duplicates with 409', async () => {
        txMock.userAccessRole.findUnique.mockResolvedValue(null);
        txMock.userAccessRole.create.mockResolvedValue({ userId: 'user-1' });

        const granted = await request(app).post('/api/admin/moderators/user-1').set(adminAuth).send({});
        expect(granted.status).toBe(201);

        txMock.userAccessRole.findUnique.mockResolvedValue({ userId: 'user-1', roleId: 'role-mod' });
        const duplicate = await request(app).post('/api/admin/moderators/user-1').set(adminAuth).send({});
        expect(duplicate.status).toBe(409);
    });

    it('returns 404 when granting an unknown user', async () => {
        txMock.user.findUnique.mockResolvedValue(null);

        const res = await request(app).post('/api/admin/moderators/ghost').set(adminAuth).send({});
        expect(res.status).toBe(404);
    });

    it('revokes the role and returns 404 when absent', async () => {
        txMock.userAccessRole.findUnique.mockResolvedValue({ userId: 'moderator-1', roleId: 'role-mod' });
        txMock.userAccessRole.delete.mockResolvedValue({});

        const revoked = await request(app).delete('/api/admin/moderators/moderator-1').set(adminAuth);
        expect(revoked.status).toBe(200);

        txMock.userAccessRole.findUnique.mockResolvedValue(null);
        const missing = await request(app).delete('/api/admin/moderators/user-1').set(adminAuth);
        expect(missing.status).toBe(404);
    });

    it('reads the audit trail', async () => {
        prismaMock.adminAudit.findMany.mockResolvedValue([
            { id: 'a-1', action: 'CREATE', targetId: 'moderator-1' },
        ]);
        prismaMock.adminAudit.count.mockResolvedValue(1);

        const res = await request(app).get('/api/admin/audit').set(adminAuth);
        expect(res.status).toBe(200);
        expect(res.body.entries).toHaveLength(1);
    });
});

describe('moderator report triage records the acting moderator', () => {
    it('resolve attributes resolvedById to the moderator user id', async () => {
        prismaMock.report.findUnique.mockResolvedValue({ id: 'rep-1', status: 'OPEN' });
        prismaMock.report.update.mockResolvedValue({ id: 'rep-1', status: 'RESOLVED' });

        const res = await request(app).post('/api/admin/reports/rep-1/resolve').set(moderatorAuth).send({});

        expect(res.status).toBe(200);
        expect(prismaMock.report.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'RESOLVED', resolvedById: 'moderator-1' }),
            }),
        );
    });

    it('dismiss attributes resolvedById to the moderator user id', async () => {
        prismaMock.report.findUnique.mockResolvedValue({ id: 'rep-2', status: 'OPEN' });
        prismaMock.report.update.mockResolvedValue({ id: 'rep-2', status: 'DISMISSED' });

        const res = await request(app).post('/api/admin/reports/rep-2/dismiss').set(moderatorAuth).send({});

        expect(res.status).toBe(200);
        expect(prismaMock.report.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'DISMISSED', resolvedById: 'moderator-1' }),
            }),
        );
    });
});
