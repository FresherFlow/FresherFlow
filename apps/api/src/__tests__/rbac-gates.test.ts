import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-long-enough';
process.env.JWT_ADMIN_SECRET = 'test-admin-secret-min-32-chars-long-enough';
process.env.REDIS_ENABLED = 'false';

const userMock = { findUnique: vi.fn() };
const membershipMock = { findFirst: vi.fn() };
const auditMock = { create: vi.fn() };
const queryRawMock = vi.fn();

const prismaMock = {
    user: userMock,
    organizationMembership: membershipMock,
    adminAudit: auditMock,
    $queryRaw: queryRawMock,
};

vi.mock('../infrastructure/database/prisma', () => ({
    default: prismaMock,
}));

async function staffApp() {
    const { requireStaff, requirePermission } = await import('../middleware/auth');
    const { withAdminAudit } = await import('../middleware/adminAudit');
    const { generateAccessToken, generateAdminToken } = await import('@fresherflow/utils');

    const app = express();
    app.use(express.json());

    // Owner-only action: granting the moderator role.
    app.post(
        '/owner-only',
        requireStaff,
        requirePermission('moderator.manage'),
        (_req, res) => res.json({ ok: true })
    );

    // Audit-shape probes: response envelopes the old extractor missed. The
    // test-only actor middleware stands in for requireStaff/requireAdmin,
    // which already set req.userId/req.adminId in production.
    app.use('/c', (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        req.userId = 'moderator-1';
        next();
    });
    app.use('/rooms', (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        req.userId = 'moderator-1';
        next();
    });
    app.use('/bulk', (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        req.userId = 'moderator-1';
        next();
    });
    app.delete('/c/:commentId', withAdminAudit('DELETE'), (req, res) =>
        res.json({ success: true, commentId: String(req.params.commentId) })
    );
    app.post('/rooms', withAdminAudit('CREATE'), (_req, res) =>
        res.status(201).json({ room: { id: 'room-1' } })
    );
    app.post('/bulk', withAdminAudit('BULK_ACTION'), (req, res) =>
        res.json({ message: 'Bulk publish completed', requestedCount: (req.body.ids as unknown[]).length })
    );

    app.use((err: Error & { statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message } });
    });

    return {
        app,
        userAuth: (id: string) => ({ Authorization: `Bearer ${generateAccessToken(id)}` }),
        adminAuth: (id: string) => ({ Authorization: `Bearer ${generateAdminToken(id)}` }),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    userMock.findUnique.mockResolvedValue({ status: 'ACTIVE', trustLevel: 'VERIFIED', isAnonymous: false });
    auditMock.create.mockResolvedValue({});
    queryRawMock.mockResolvedValue([]);
});

describe('PHASE 4 gates', () => {
    it('rejects unauthenticated callers with 401', async () => {
        const { app } = await staffApp();
        expect((await request(app).post('/owner-only')).status).toBe(401);
    });

    it('user cannot call an owner-only endpoint (403)', async () => {
        const { app, userAuth } = await staffApp();
        const res = await request(app).post('/owner-only').set(userAuth('user-1'));
        expect(res.status).toBe(403);
    });

    it('moderator cannot perform an owner-only action (403)', async () => {
        const { app, userAuth } = await staffApp();
        // Moderator holds moderation grants but NOT moderator.manage.
        queryRawMock.mockResolvedValue([
            { key: 'opportunity.review' },
            { key: 'report.resolve' },
            { key: 'community.moderate' },
            { key: 'user.manage' },
        ]);
        const res = await request(app).post('/owner-only').set(userAuth('moderator-1'));
        expect(res.status).toBe(403);
    });

    it('admin session with the grant passes', async () => {
        const { app, adminAuth } = await staffApp();
        queryRawMock.mockResolvedValue([{ key: 'moderator.manage' }]);
        const res = await request(app).post('/owner-only').set(adminAuth('admin-1'));
        expect(res.status).toBe(200);
    });

    it('organization member cannot access another organization', async () => {
        const { requireOrgMembership } = await import('../infrastructure/services/orgAccess');

        // Member of org-A only: the org-B lookup finds nothing.
        membershipMock.findFirst.mockImplementation(async (args: { where: { organizationId: string } }) =>
            args.where.organizationId === 'org-A'
                ? { organizationId: 'org-A', userId: 'u1', role: 'ADMIN', status: 'APPROVED' }
                : null
        );

        await expect(requireOrgMembership('u1', 'org-B')).rejects.toMatchObject({ statusCode: 403 });
        // Same-org access still works.
        await expect(requireOrgMembership('u1', 'org-A')).resolves.toMatchObject({ organizationId: 'org-A' });
    });

    it('pending membership and under-ranked roles are denied', async () => {
        const { requireOrgMembership } = await import('../infrastructure/services/orgAccess');

        membershipMock.findFirst.mockResolvedValue({
            organizationId: 'org-A',
            userId: 'u1',
            role: 'VIEWER',
            status: 'PENDING',
        });
        await expect(requireOrgMembership('u1', 'org-A')).rejects.toMatchObject({ statusCode: 403 });

        membershipMock.findFirst.mockResolvedValue({
            organizationId: 'org-A',
            userId: 'u1',
            role: 'VIEWER',
            status: 'APPROVED',
        });
        // Default floor is RECRUITER: a viewer cannot write.
        await expect(requireOrgMembership('u1', 'org-A')).rejects.toMatchObject({ statusCode: 403 });
        // Explicit reader floor passes.
        await expect(
            requireOrgMembership('u1', 'org-A', { minRole: 'VIEWER' })
        ).resolves.toMatchObject({ role: 'VIEWER' });
    });

    it('admin mutations are audit-logged across param and envelope shapes', async () => {
        const { app, userAuth } = await staffApp();

        // Moderator-style staff session acts; actor attribution uses the user id.
        userMock.findUnique.mockResolvedValue({ status: 'ACTIVE', trustLevel: 'VERIFIED', isAnonymous: false });

        const del = await request(app).delete('/c/c1').set(userAuth('moderator-1'));
        expect(del.status).toBe(200);

        const room = await request(app).post('/rooms').set(userAuth('moderator-1')).send({ name: 'Test Room' });
        expect(room.status).toBe(201);

        const bulk = await request(app)
            .post('/bulk')
            .set(userAuth('moderator-1'))
            .send({ ids: ['a', 'b'], action: 'PUBLISH' });
        expect(bulk.status).toBe(200);

        const targets = auditMock.create.mock.calls.map(
            (call) => (call[0] as { data: { targetId: string; action: string; userId: string } }).data
        );
        expect(targets).toContainEqual(
            expect.objectContaining({ targetId: 'c1', action: 'DELETE', userId: 'moderator-1' })
        );
        expect(targets).toContainEqual(
            expect.objectContaining({ targetId: 'room-1', action: 'CREATE', userId: 'moderator-1' })
        );
        expect(targets).toContainEqual(
            expect.objectContaining({ targetId: 'bulk:PUBLISH:2', action: 'BULK_ACTION', userId: 'moderator-1' })
        );
    });
});
