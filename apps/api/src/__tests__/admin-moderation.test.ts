import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAdminToken } from '@fresherflow/utils';

// Secrets/env for admin tokens + redis-free rate limiting
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.REDIS_ENABLED = 'false';

const prismaMock = {
    report: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
    },
    communityPost: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
    },
    communityPostComment: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    opportunityComment: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
    },
    interviewExperience: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
    },
    applicationUpdate: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
    },
    opportunity: {
        findFirst: vi.fn(),
        delete: vi.fn(),
    },
    commentVote: { deleteMany: vi.fn() },
    jobSignal: { deleteMany: vi.fn() },
    savedOpportunity: { deleteMany: vi.fn() },
    userAction: { deleteMany: vi.fn() },
    listingFeedback: { deleteMany: vi.fn() },
    platformEvent: { deleteMany: vi.fn() },
    opportunityEvent: { deleteMany: vi.fn() },
    telegramBroadcast: { deleteMany: vi.fn() },
    socialPost: { deleteMany: vi.fn() },
    interviewExperienceVote: { deleteMany: vi.fn() },
    alertDelivery: { updateMany: vi.fn() },
    alertDispatchLog: { updateMany: vi.fn() },
    jobSubmission: { updateMany: vi.fn() },
    salaryReport: { updateMany: vi.fn() },
    rawOpportunity: { updateMany: vi.fn() },
    driveDetails: { deleteMany: vi.fn() },
    governmentJobDetails: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn(), updateMany: vi.fn() },
    user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    adminAudit: {
        create: vi.fn(),
    },
    // requirePermission resolves grants through a raw join over
    // Permission <- AccessRolePermission <- UserAccessRole.
    $queryRaw: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: vi.fn(async (cb: (tx: any) => unknown) => cb(prismaMock)),
};

// lifecycle.ts pulls in cache/publish side-effect modules that are irrelevant
// to the hard-delete SQL; stub them so the test exercises DB calls only.
vi.mock('../infrastructure/cache/adminCache', () => ({
    adminCache: { invalidate: vi.fn(), invalidateLists: vi.fn() },
}));
vi.mock('../infrastructure/services/publicOpportunityCache.service', () => ({
    invalidatePublicOpportunityCache: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../infrastructure/services/publish.service', () => ({
    getGranularTagsForOpportunity: vi.fn(() => []),
}));
vi.mock('../application/opportunity/publish', () => ({ publishOpportunity: vi.fn() }));
vi.mock('../application/opportunity/moderation', () => ({ rejectOpportunity: vi.fn() }));

vi.mock('@fresherflow/database', () => ({
    prisma: prismaMock,
    redis: {},
    CommunityPostStatus: {
        ACTIVE: 'ACTIVE',
        ARCHIVED: 'ARCHIVED',
        DELETED: 'DELETED',
    },
}));

let app: express.Application;
let adminAuth: Record<string, string>;

beforeAll(async () => {
    const [reports, community, users, lifecycle, auth] = await Promise.all([
        import('../routes/admin/reports'),
        import('../routes/admin/community'),
        import('../routes/admin/users'),
        import('../routes/admin/opportunities/lifecycle'),
        import('../middleware/auth'),
    ]);

    app = express();
    app.use(express.json());
    app.use('/api/admin/reports', reports.default as Router);
    app.use('/api/admin/community', community.default as Router);
    app.use('/api/admin/users', users.default as Router);
    // Mirrors admin/opportunities/index.ts: requireStaff authenticates, then the
    // leaf route applies requirePermission.
    app.use('/api/admin/opportunities', auth.requireStaff, lifecycle.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message, statusCode: err.statusCode || 500 } });
    });

    adminAuth = { Authorization: `Bearer ${generateAdminToken('admin-1')}` };
});

beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.adminAudit.create.mockResolvedValue({});
    prismaMock.report.findMany.mockResolvedValue([]);
    prismaMock.report.count.mockResolvedValue(0);
    // Least-privilege grants for the mocked admin: covers every
    // requirePermission key used by the reports/community/users routers.
    prismaMock.$queryRaw.mockResolvedValue([
        { key: 'report.resolve' },
        { key: 'community.moderate' },
        { key: 'user.manage' },
        { key: 'opportunity.delete' },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
        trustLevel: 'VERIFIED',
    });
});

function seedHardDeleteChildren() {
    prismaMock.opportunity.findFirst.mockResolvedValue({
        id: 'opp-1',
        slug: 'acme-engineer',
        type: 'JOB',
    });
    prismaMock.opportunityComment.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
    prismaMock.interviewExperience.findMany.mockResolvedValue([{ id: 'exp-1' }]);
    prismaMock.opportunity.delete.mockResolvedValue({ id: 'opp-1' });
    for (const model of [
        prismaMock.commentVote,
        prismaMock.notification,
        prismaMock.jobSignal,
        prismaMock.savedOpportunity,
        prismaMock.userAction,
        prismaMock.listingFeedback,
        prismaMock.platformEvent,
        prismaMock.opportunityEvent,
        prismaMock.telegramBroadcast,
        prismaMock.socialPost,
        prismaMock.interviewExperienceVote,
        prismaMock.opportunityComment,
        prismaMock.applicationUpdate,
        prismaMock.driveDetails,
        prismaMock.governmentJobDetails,
    ]) {
        (model.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    }
    prismaMock.report.deleteMany.mockResolvedValue({ count: 1 });
    for (const model of [
        prismaMock.alertDelivery,
        prismaMock.alertDispatchLog,
        prismaMock.jobSubmission,
        prismaMock.salaryReport,
        prismaMock.rawOpportunity,
        prismaMock.notification,
    ]) {
        (model.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    }
}

describe('DELETE /api/admin/opportunities/:id/hard (child cleanup regression)', () => {
    it('deletes live children before the parent instead of throwing P2003', async () => {
        seedHardDeleteChildren();

        const res = await request(app)
            .delete('/api/admin/opportunities/opp-1/hard')
            .set(adminAuth)
            .send({ reason: 'Duplicate listing cleanup' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Opportunity permanently deleted');
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(prismaMock.opportunity.delete).toHaveBeenCalledWith({ where: { id: 'opp-1' } });
    });

    it('removes comment leaves (votes, notifications, comment reports) for every comment', async () => {
        seedHardDeleteChildren();

        await request(app)
            .delete('/api/admin/opportunities/opp-1/hard')
            .set(adminAuth)
            .send({ reason: 'Cleanup' });

        expect(prismaMock.commentVote.deleteMany).toHaveBeenCalledWith({
            where: { commentId: { in: ['c-1', 'c-2'] } },
        });
        expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
            where: { commentId: { in: ['c-1', 'c-2'] } },
        });
        expect(prismaMock.interviewExperienceVote.deleteMany).toHaveBeenCalledWith({
            where: { interviewExperienceId: { in: ['exp-1'] } },
        });
    });

    it('removes every opportunity-scoped child table', async () => {
        seedHardDeleteChildren();

        await request(app)
            .delete('/api/admin/opportunities/opp-1/hard')
            .set(adminAuth)
            .send({ reason: 'Cleanup' });

        const scoped = [
            prismaMock.jobSignal,
            prismaMock.savedOpportunity,
            prismaMock.userAction,
            prismaMock.listingFeedback,
            prismaMock.platformEvent,
            prismaMock.opportunityEvent,
            prismaMock.telegramBroadcast,
            prismaMock.socialPost,
            prismaMock.opportunityComment,
            prismaMock.interviewExperience,
            prismaMock.applicationUpdate,
        ];
        for (const model of scoped) {
            expect(model.deleteMany).toHaveBeenCalledWith({ where: { opportunityId: 'opp-1' } });
        }
    });

    it('nulls SetNull relations and clears 1:1 detail rows', async () => {
        seedHardDeleteChildren();

        await request(app)
            .delete('/api/admin/opportunities/opp-1/hard')
            .set(adminAuth)
            .send({ reason: 'Cleanup' });

        expect(prismaMock.alertDelivery.updateMany).toHaveBeenCalledWith({
            where: { opportunityId: 'opp-1' },
            data: { opportunityId: null },
        });
        expect(prismaMock.alertDispatchLog.updateMany).toHaveBeenCalledWith({
            where: { opportunityId: 'opp-1' },
            data: { opportunityId: null },
        });
        expect(prismaMock.jobSubmission.updateMany).toHaveBeenCalledWith({
            where: { opportunityId: 'opp-1' },
            data: { opportunityId: null },
        });
        expect(prismaMock.salaryReport.updateMany).toHaveBeenCalledWith({
            where: { opportunityId: 'opp-1' },
            data: { opportunityId: null },
        });
        expect(prismaMock.rawOpportunity.updateMany).toHaveBeenCalledWith({
            where: { mappedOpportunityId: 'opp-1' },
            data: { mappedOpportunityId: null },
        });
        expect(prismaMock.driveDetails.deleteMany).toHaveBeenCalledWith({ where: { opportunityId: 'opp-1' } });
        expect(prismaMock.governmentJobDetails.deleteMany).toHaveBeenCalledWith({ where: { opportunityId: 'opp-1' } });
    });

    it('performs every child delete before the parent delete', async () => {
        seedHardDeleteChildren();

        await request(app)
            .delete('/api/admin/opportunities/opp-1/hard')
            .set(adminAuth)
            .send({ reason: 'Cleanup' });

        const parentOrder = prismaMock.opportunity.delete.mock.invocationCallOrder[0];
        expect(parentOrder).toBeGreaterThan(prismaMock.commentVote.deleteMany.mock.invocationCallOrder[0]);
        expect(parentOrder).toBeGreaterThan(prismaMock.opportunityComment.deleteMany.mock.invocationCallOrder[0]);
        expect(parentOrder).toBeGreaterThan(prismaMock.interviewExperience.deleteMany.mock.invocationCallOrder[0]);
        expect(parentOrder).toBeGreaterThan(prismaMock.applicationUpdate.deleteMany.mock.invocationCallOrder[0]);
        expect(parentOrder).toBeGreaterThan(prismaMock.driveDetails.deleteMany.mock.invocationCallOrder[0]);
    });

    it('returns 404 without touching children when the opportunity is missing', async () => {
        prismaMock.opportunity.findFirst.mockResolvedValue(null);

        const res = await request(app)
            .delete('/api/admin/opportunities/ghost/hard')
            .set(adminAuth)
            .send({ reason: 'Cleanup' });

        expect(res.status).toBe(404);
        expect(prismaMock.opportunity.delete).not.toHaveBeenCalled();
    });
});

describe('admin report queue (V1 checklist F: process user reports)', () => {
    it('returns 401 without an admin token', async () => {
        const res = await request(app).get('/api/admin/reports');
        expect(res.status).toBe(401);
    });

    it('returns 401 for an invalid token (staff auth: unauthenticated, refreshable)', async () => {
        const res = await request(app)
            .get('/api/admin/reports')
            .set('Authorization', 'Bearer not-a-valid-token');
        expect(res.status).toBe(401);
    });

    it('returns 403 for an authenticated admin without report.resolve', async () => {
        prismaMock.$queryRaw.mockResolvedValueOnce([]);

        const res = await request(app).get('/api/admin/reports').set(adminAuth);
        expect(res.status).toBe(403);
    });

    it('lists OPEN reports by default with pagination + openCount', async () => {
        prismaMock.report.findMany.mockResolvedValue([{ id: 'rep-1', status: 'OPEN' }]);
        prismaMock.report.count.mockResolvedValueOnce(1).mockResolvedValueOnce(5);

        const res = await request(app).get('/api/admin/reports').set(adminAuth);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OPEN');
        expect(res.body.reports).toHaveLength(1);
        expect(res.body.openCount).toBe(5);
        expect(res.body.pagination).toMatchObject({ total: 1, page: 1 });
    });

    it('resolves a report and records the resolving admin', async () => {
        prismaMock.report.findUnique.mockResolvedValue({ id: 'rep-1', status: 'OPEN' });
        prismaMock.report.update.mockResolvedValue({ id: 'rep-1', status: 'RESOLVED' });

        const res = await request(app).post('/api/admin/reports/rep-1/resolve').set(adminAuth).send({});

        expect(res.status).toBe(200);
        expect(prismaMock.report.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'rep-1' },
                data: expect.objectContaining({ status: 'RESOLVED', resolvedById: 'admin-1' }),
            }),
        );
    });

    it('returns 409 when resolving an already-triaged report', async () => {
        prismaMock.report.findUnique.mockResolvedValue({ id: 'rep-1', status: 'RESOLVED' });

        const res = await request(app).post('/api/admin/reports/rep-1/resolve').set(adminAuth).send({});

        expect(res.status).toBe(409);
    });

    it('returns 404 for an unknown report', async () => {
        prismaMock.report.findUnique.mockResolvedValue(null);

        const res = await request(app).post('/api/admin/reports/missing/dismiss').set(adminAuth).send({});

        expect(res.status).toBe(404);
    });

    it('rejects a malformed triage body with 400', async () => {
        const res = await request(app)
            .post('/api/admin/reports/rep-1/resolve')
            .set(adminAuth)
            .send({ note: 123 });

        expect(res.status).toBe(400);
    });
});

describe('admin community moderation (remove spam / bad content)', () => {
    it('returns 401 without an admin token', async () => {
        const res = await request(app).delete('/api/admin/community/posts/post-1').send({});
        expect(res.status).toBe(401);
    });

    it('rejects a bad moderation-queue kind with 400', async () => {
        const res = await request(app).get('/api/admin/community/moderation-queue?kind=bogus').set(adminAuth);
        expect(res.status).toBe(400);
    });

    it('returns 403 for an authenticated admin without community.moderate', async () => {
        prismaMock.$queryRaw.mockResolvedValueOnce([{ key: 'report.resolve' }]);

        const res = await request(app).get('/api/admin/community/moderation-queue?kind=interview').set(adminAuth);
        expect(res.status).toBe(403);
    });

    it('lists the interview moderation queue newest-first', async () => {
        prismaMock.interviewExperience.findMany.mockResolvedValue([{ id: 'exp-1' }]);
        prismaMock.interviewExperience.count.mockResolvedValue(1);

        const res = await request(app).get('/api/admin/community/moderation-queue?kind=interview').set(adminAuth);

        expect(res.status).toBe(200);
        expect(res.body.kind).toBe('interview');
        expect(res.body.total).toBe(1);
    });

    it('soft-deletes a community post', async () => {
        prismaMock.communityPost.findUnique.mockResolvedValue({ id: 'post-1' });
        prismaMock.communityPost.update.mockResolvedValue({ id: 'post-1', status: 'DELETED' });

        const res = await request(app).delete('/api/admin/community/posts/post-1').set(adminAuth).send({ reason: 'Off-topic promo' });

        expect(res.status).toBe(200);
        expect(prismaMock.communityPost.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'DELETED' } }),
        );
    });

    it('flags a community post as spam (ARCHIVED)', async () => {
        prismaMock.communityPost.findUnique.mockResolvedValue({ id: 'post-1', status: 'ACTIVE' });
        prismaMock.communityPost.update.mockResolvedValue({ id: 'post-1', status: 'ARCHIVED' });

        const res = await request(app).post('/api/admin/community/posts/post-1/spam').set(adminAuth).send({ reason: 'Spam link farm' });

        expect(res.status).toBe(200);
        expect(prismaMock.communityPost.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'ARCHIVED' } }),
        );
    });

    it('removes a community comment as admin override', async () => {
        prismaMock.communityPostComment.findUnique.mockResolvedValue({ id: 'c-1' });
        prismaMock.communityPostComment.update.mockResolvedValue({ id: 'c-1' });

        const res = await request(app).delete('/api/admin/community/posts/comments/c-1').set(adminAuth).send({});

        expect(res.status).toBe(200);
        expect(res.body.commentId).toBe('c-1');
    });

    it('removes a job-discussion comment as admin override', async () => {
        prismaMock.opportunityComment.findUnique.mockResolvedValue({ id: 'jc-1' });
        prismaMock.opportunityComment.update.mockResolvedValue({ id: 'jc-1' });

        const res = await request(app).delete('/api/admin/community/comments/jc-1').set(adminAuth).send({});

        expect(res.status).toBe(200);
    });

    it('returns 404 when the job comment does not exist', async () => {
        prismaMock.opportunityComment.findUnique.mockResolvedValue(null);

        const res = await request(app).delete('/api/admin/community/comments/missing').set(adminAuth).send({});

        expect(res.status).toBe(404);
    });

    it('removes and spam-flags interview experiences', async () => {
        prismaMock.interviewExperience.findUnique.mockResolvedValue({ id: 'exp-1', status: 'ACTIVE' });
        prismaMock.interviewExperience.update
            .mockResolvedValueOnce({ id: 'exp-1', status: 'DELETED' })
            .mockResolvedValueOnce({ id: 'exp-1', status: 'ARCHIVED' });

        const removed = await request(app).delete('/api/admin/community/interviews/exp-1').set(adminAuth).send({});
        expect(removed.status).toBe(200);

        const spam = await request(app).post('/api/admin/community/interviews/exp-1/spam').set(adminAuth).send({});
        expect(spam.status).toBe(200);
        expect(prismaMock.interviewExperience.update).toHaveBeenLastCalledWith(
            expect.objectContaining({ data: { status: 'ARCHIVED' } }),
        );
    });

    it('hard-deletes a hiring update (no status column by design)', async () => {
        prismaMock.applicationUpdate.findUnique.mockResolvedValue({ id: 'upd-1' });
        prismaMock.applicationUpdate.delete.mockResolvedValue({ id: 'upd-1' });

        const res = await request(app).delete('/api/admin/community/updates/upd-1').set(adminAuth).send({});

        expect(res.status).toBe(200);
        expect(prismaMock.applicationUpdate.delete).toHaveBeenCalledWith({ where: { id: 'upd-1' } });
    });
});

describe('admin user actions (suspend / reactivate)', () => {
    it('returns 401 without an admin token', async () => {
        const res = await request(app).post('/api/admin/users/user-9/status').send({ status: 'SUSPENDED' });
        expect(res.status).toBe(401);
    });

    it('suspends an abusive user and marks them BANNED', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce({
            id: 'admin-1',
            role: 'ADMIN',
            status: 'ACTIVE',
            trustLevel: 'VERIFIED',
        });
        prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-9', status: 'ACTIVE', trustLevel: 'NEW' });
        prismaMock.user.update.mockResolvedValue({ id: 'user-9', status: 'SUSPENDED', trustLevel: 'BANNED' });

        const res = await request(app)
            .post('/api/admin/users/user-9/status')
            .set(adminAuth)
            .send({ status: 'SUSPENDED', reason: 'Spamming job discussions' });

        expect(res.status).toBe(200);
        expect(prismaMock.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'SUSPENDED', trustLevel: 'BANNED' } }),
        );
    });

    it('rejects an unknown status with 400', async () => {
        const res = await request(app)
            .post('/api/admin/users/user-9/status')
            .set(adminAuth)
            .send({ status: 'BANNED_FOREVER' });

        expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown user', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce({
            id: 'admin-1',
            role: 'ADMIN',
            status: 'ACTIVE',
            trustLevel: 'VERIFIED',
        });
        prismaMock.user.findUnique.mockResolvedValueOnce(null);

        const res = await request(app)
            .post('/api/admin/users/missing/status')
            .set(adminAuth)
            .send({ status: 'SUSPENDED' });

        expect(res.status).toBe(404);
    });
});
