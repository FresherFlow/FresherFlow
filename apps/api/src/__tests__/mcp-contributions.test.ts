import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.REDIS_ENABLED = 'false';
process.env.INTERNAL_API_SECRET = 'test-service-key';

const prismaMock = {
    user: { findUnique: vi.fn() },
    jobSubmission: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
    },
    opportunity: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prismaMock as any).$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock));

vi.mock('@fresherflow/database', async () => ({
    ...(await import('./helpers/dbEnums')),
    prisma: prismaMock,
    redis: {},
}));

vi.mock('../infrastructure/services/platform/mcpOAuth.service', () => ({
    verifyAccessToken: vi.fn(async (token: string) => (token === 'member-token' ? { userId: 'user-1' } : null)),
}));

// The gate under test resolves permissions through this one function, so
// swapping it in the existing auth module exercises the real request pipeline
// without a permission table.
const grantedPermissions: string[] = [];
vi.mock('../middleware/auth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../middleware/auth')>();
    return { ...actual, getUserPermissions: vi.fn(async () => grantedPermissions) };
});

let app: express.Application;

beforeAll(async () => {
    const { mcpSurfaceAuth } = await import('../middleware/mcpAccessToken');
    const contributions = await import('../routes/internal/mcp/contributions');

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use('/api/internal/mcp', mcpSurfaceAuth, contributions.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message } });
    });
});

beforeEach(() => {
    vi.clearAllMocks();
    grantedPermissions.length = 0;
    prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1', username: 'tarun', fullName: 'Tarun', email: 't@example.com',
        role: 'USER', trustLevel: 'NEW', status: 'ACTIVE',
    });
    prismaMock.jobSubmission.findMany.mockResolvedValue([]);
    prismaMock.jobSubmission.count.mockResolvedValue(0);
});

/** A submission owned by the signed-in user, still awaiting review. */
function pendingOwnSubmission() {
    return {
        id: 'sub-1',
        submittedById: 'user-1',
        status: 'PENDING_REVIEW',
        opportunityId: 'opp-1',
        extractedData: { source: 'mcp' },
    };
}

describe('MCP contribution routes: authentication', () => {
    it('refuses the service key, which carries no user identity', async () => {
        // The pipeline scripts hold this key. It may read and write listings, but
        // it is nobody, so it has no submission history and cannot moderate.
        const res = await request(app)
            .get('/api/internal/mcp/whoami')
            .set('x-api-key', 'test-service-key');

        expect(res.status).toBe(403);
        expect(res.body.error.message).toContain('signed-in FresherFlow account');
    });

    it('rejects a bearer token it cannot verify', async () => {
        const res = await request(app)
            .get('/api/internal/mcp/whoami')
            .set('Authorization', 'Bearer stale-token');

        expect(res.status).toBe(401);
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('reports the signed-in account and its capabilities', async () => {
        grantedPermissions.push('opportunity.review');

        const res = await request(app)
            .get('/api/internal/mcp/whoami')
            .set('Authorization', 'Bearer member-token');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ signedIn: true, user: { id: 'user-1' } });
        expect(res.body.capabilities.reviewSubmissions).toBe(true);
        // Not granted, so it must not read as granted.
        expect(res.body.capabilities.approveSubmissions).toBe(false);
    });
});

describe('MCP contribution routes: own submissions', () => {
    it('lists only the caller\'s submissions', async () => {
        const res = await request(app)
            .get('/api/internal/mcp/submissions')
            .set('Authorization', 'Bearer member-token');

        expect(res.status).toBe(200);
        // Scoped by the token, never by a caller-supplied user id.
        expect(prismaMock.jobSubmission.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ submittedById: 'user-1' }) }),
        );
    });

    it('will not withdraw a submission owned by someone else', async () => {
        prismaMock.jobSubmission.findUnique.mockResolvedValue({
            ...pendingOwnSubmission(),
            submittedById: 'someone-else',
        });

        const res = await request(app)
            .post('/api/internal/mcp/submissions/sub-1/withdraw')
            .set('Authorization', 'Bearer member-token');

        // Same answer as a submission that does not exist: no existence oracle.
        expect(res.status).toBe(404);
        expect(prismaMock.opportunity.update).not.toHaveBeenCalled();
    });

    it('will not withdraw a listing that is already live', async () => {
        prismaMock.jobSubmission.findUnique.mockResolvedValue(pendingOwnSubmission());
        prismaMock.opportunity.findUnique.mockResolvedValue({ status: 'PUBLISHED' });

        const res = await request(app)
            .post('/api/internal/mcp/submissions/sub-1/withdraw')
            .set('Authorization', 'Bearer member-token');

        expect(res.status).toBe(409);
        expect(prismaMock.opportunity.update).not.toHaveBeenCalled();
        expect(prismaMock.jobSubmission.update).not.toHaveBeenCalled();
    });

    it('archives the unpublished listing and closes the submission', async () => {
        prismaMock.jobSubmission.findUnique.mockResolvedValue(pendingOwnSubmission());
        prismaMock.opportunity.findUnique.mockResolvedValue({ status: 'DRAFT' });
        prismaMock.opportunity.update.mockResolvedValue({ id: 'opp-1' });
        prismaMock.jobSubmission.update.mockResolvedValue({ id: 'sub-1' });

        const res = await request(app)
            .post('/api/internal/mcp/submissions/sub-1/withdraw')
            .set('Authorization', 'Bearer member-token');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true, listingState: 'archived' });

        const opportunityUpdate = prismaMock.opportunity.update.mock.calls[0]?.[0] as
            | { data?: Record<string, unknown> }
            | undefined;
        expect(opportunityUpdate?.data?.status).toBe('ARCHIVED');
        expect(opportunityUpdate?.data?.deletionReason).toBe('Withdrawn by the contributor');

        const submissionUpdate = prismaMock.jobSubmission.update.mock.calls[0]?.[0] as
            | { data?: { status?: string; extractedData?: Record<string, unknown> } }
            | undefined;
        expect(submissionUpdate?.data?.status).toBe('REJECTED');
        // The extracted payload survives and gains the withdrawal reason.
        expect(submissionUpdate?.data?.extractedData).toMatchObject({
            source: 'mcp',
            withdrawalReason: 'Withdrawn by the contributor',
        });
    });
});

describe('MCP contribution routes: moderation', () => {
    it('refuses the review queue to an account without opportunity.review', async () => {
        const res = await request(app)
            .get('/api/internal/mcp/review-queue')
            .set('Authorization', 'Bearer member-token');

        expect(res.status).toBe(403);
        expect(res.body.error.message).toContain('opportunity.review');
        expect(prismaMock.jobSubmission.findMany).not.toHaveBeenCalled();
    });

    it('serves the queue to a reviewer', async () => {
        grantedPermissions.push('opportunity.review');

        const res = await request(app)
            .get('/api/internal/mcp/review-queue')
            .set('Authorization', 'Bearer member-token');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ pendingCount: 0, status: 'PENDING_REVIEW' });
    });

    it('refuses approval to a reviewer who cannot publish', async () => {
        grantedPermissions.push('opportunity.review');

        const res = await request(app)
            .post('/api/internal/mcp/review-queue/sub-1/approve')
            .set('Authorization', 'Bearer member-token');

        expect(res.status).toBe(403);
        expect(res.body.error.message).toContain('opportunity.publish');
        // Nothing is looked up or written: the decision is refused up front.
        expect(prismaMock.jobSubmission.findUnique).not.toHaveBeenCalled();
    });

    it('refuses rejection to the service key', async () => {
        const res = await request(app)
            .post('/api/internal/mcp/review-queue/sub-1/reject')
            .set('x-api-key', 'test-service-key')
            .send({ reason: 'wrong details' });

        expect(res.status).toBe(403);
        expect(prismaMock.jobSubmission.findUnique).not.toHaveBeenCalled();
    });
});
