import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.REDIS_ENABLED = 'false';
process.env.INTERNAL_API_SECRET = 'test-service-key';
process.env.FRONTEND_URL = 'https://fresherflow.in';

const prismaMock = {
    user: { findUnique: vi.fn() },
    opportunity: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
};

vi.mock('@fresherflow/database', async () => ({
    ...(await import('./helpers/dbEnums')),
    prisma: prismaMock,
    redis: {},
}));

vi.mock('../infrastructure/services/platform/mcpOAuth.service', () => ({
    verifyAccessToken: vi.fn(async (token: string) => {
        if (token === 'member-token') return { userId: 'user-member' };
        if (token === 'moderator-token') return { userId: 'user-moderator' };
        return null;
    }),
}));

// Publish side effects reach queues; the write path itself is covered elsewhere.
vi.mock('../infrastructure/services/opportunity/publish.service', () => ({
    handleOpportunityPublished: vi.fn(async () => undefined),
}));

let grantedPermissions: string[] = [];
vi.mock('../middleware/auth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../middleware/auth')>();
    return { ...actual, getUserPermissions: vi.fn(async () => grantedPermissions) };
});

let app: express.Application;

beforeAll(async () => {
    const { mcpSurfaceAuth } = await import('../middleware/mcpAccessToken');
    const listings = await import('../routes/internal/mcp/listings');

    app = express();
    app.use(express.json());
    app.use('/api/internal/mcp', mcpSurfaceAuth, listings.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message } });
    });
});

beforeEach(() => {
    vi.clearAllMocks();
    grantedPermissions = [];
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-member', status: 'ACTIVE' });
    prismaMock.opportunity.count.mockResolvedValue(1);
    prismaMock.opportunity.findMany.mockResolvedValue([
        {
            id: 'opp-1',
            slug: 'software-engineer-at-acme',
            title: 'Software Engineer',
            company: 'Acme',
            locations: ['Hyderabad'],
            employmentTypes: ['FULL_TIME'],
            workMode: 'ONSITE',
            category: 'EMPLOYMENT',
            recruitmentMethod: 'REGULAR',
            salaryRange: '₹6-8 LPA',
            salaryPeriod: 'YEARLY',
            experienceMin: 0,
            experienceMax: 1,
            postedAt: new Date('2026-10-20T00:00:00Z'),
            expiresAt: null,
        },
    ]);
});

describe('GET /api/internal/mcp/jobs', () => {
    it('refuses an unauthenticated caller', async () => {
        const res = await request(app).get('/api/internal/mcp/jobs');
        expect(res.status).toBe(401);
        expect(prismaMock.opportunity.findMany).not.toHaveBeenCalled();
    });

    it('returns live listings with a canonical FresherFlow URL', async () => {
        const res = await request(app)
            .get('/api/internal/mcp/jobs?q=engineer&city=Hyderabad')
            .set('Authorization', 'Bearer member-token');

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
        expect(res.body.jobs[0]).toMatchObject({
            title: 'Software Engineer',
            company: 'Acme',
            url: 'https://fresherflow.in/jobs/software-engineer-at-acme',
        });
    });

    it('queries only live rows — the same rule the public feed uses', async () => {
        await request(app)
            .get('/api/internal/mcp/jobs')
            .set('Authorization', 'Bearer member-token');

        const where = prismaMock.opportunity.findMany.mock.calls[0]?.[0]?.where as {
            AND: Array<Record<string, unknown>>;
        };
        // Membership comes from liveOpportunityWhere: PUBLISHED, not deleted, not
        // expired. A browse tool that returned drafts would contradict the site.
        expect(where.AND[0]).toMatchObject({ status: 'PUBLISHED', deletedAt: null, expiredAt: null });
    });

    it('needs no moderator permission, because these listings are public', async () => {
        const res = await request(app)
            .get('/api/internal/mcp/jobs')
            .set('Authorization', 'Bearer member-token');

        expect(res.status).toBe(200);
    });
});

describe('POST /api/internal/mcp/listings: moderator gate', () => {
    it('refuses a plain account with an explanation that names the alternative', async () => {
        const res = await request(app)
            .post('/api/internal/mcp/listings')
            .set('Authorization', 'Bearer member-token')
            .send({ payload: {} });

        expect(res.status).toBe(403);
        expect(res.body.error.message).toContain('moderator');
        expect(res.body.error.message).toContain('submit_opportunity');
    });

    it('lets a moderator through the gate (the payload is validated next)', async () => {
        grantedPermissions = ['opportunity.review', 'opportunity.publish', 'opportunity.edit'];
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-moderator', status: 'ACTIVE' });

        const res = await request(app)
            .post('/api/internal/mcp/listings')
            .set('Authorization', 'Bearer moderator-token')
            .send({ payload: {} });

        // 400 from validation, not 403 from the gate: the role check passed.
        expect(res.status).toBe(400);
    });
});
