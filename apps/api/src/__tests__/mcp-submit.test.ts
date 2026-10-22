import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// No Redis in tests: rate limiting falls back to the in-memory store.
process.env.REDIS_ENABLED = 'false';

const prismaMock = {
    opportunity: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
    },
    jobSubmission: {
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    // The identity resolver reads RBAC grants through this raw join.
    $queryRaw: vi.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prismaMock as any).$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock));

vi.mock('@fresherflow/database', async () => ({
    ...(await import('./helpers/dbEnums')),
    prisma: prismaMock,
    redis: {},
}));

// Two connections are exercised: a plain account and a moderator.
vi.mock('../infrastructure/services/platform/mcpOAuth.service', () => ({
    verifyAccessToken: vi.fn(async (token: string) => {
        if (token === 'member-token') return { userId: 'user-member' };
        if (token === 'moderator-token') return { userId: 'user-moderator' };
        return null;
    }),
}));

// Publish side effects reach queues and Telegram; the tests assert the call, not
// its internals.
const handleOpportunityPublished = vi.fn(async () => undefined);
vi.mock('../infrastructure/services/opportunity/publish.service', () => ({
    handleOpportunityPublished: (...args: unknown[]) => handleOpportunityPublished(...args),
}));

// RBAC grants, swapped per test. The real identity resolver reads this.
let grantedPermissions: string[] = [];
vi.mock('../middleware/auth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../middleware/auth')>();
    return { ...actual, getUserPermissions: vi.fn(async () => grantedPermissions) };
});

const MODERATOR_GRANTS = ['opportunity.review', 'opportunity.publish', 'opportunity.edit'];

let app: express.Application;
let resetRateLimitStoreForTests: () => void;

/** A fresh, unique URL per test so the dedupe lookup and the limiter stay independent. */
let urlCounter = 0;
function nextJobUrl() {
    urlCounter += 1;
    return `https://example.com/job-${urlCounter}`;
}

function submit(token: string | null, body: Record<string, unknown>) {
    const req = request(app).post('/api/opportunities/mcp-submit');
    return (token ? req.set('Authorization', `Bearer ${token}`) : req).send(body);
}

beforeAll(async () => {
    // Import after vi.mock so the mocked @fresherflow/database factory is in place.
    ({ resetRateLimitStoreForTests } = await import('../middleware/rateLimit'));

    const mcpSubmit = await import('../routes/public/opportunities/mcpSubmit');

    app = express();
    app.use(express.json());
    app.use('/api/opportunities', mcpSubmit.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message } });
    });
});

beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStoreForTests();
    grantedPermissions = [];
    // No existing listing, no existing submission, an active account, a
    // resolvable community author for the attribution fallback.
    prismaMock.opportunity.findFirst.mockResolvedValue(null);
    prismaMock.opportunity.findUnique.mockResolvedValue({ status: 'DRAFT', slug: 'acme-engineer' });
    prismaMock.opportunity.create.mockResolvedValue({ id: 'opp-mcp', slug: 'acme-engineer' });
    prismaMock.jobSubmission.findFirst.mockResolvedValue(null);
    prismaMock.jobSubmission.create.mockResolvedValue({ id: 'sub-mcp' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-member', status: 'ACTIVE' });
    prismaMock.user.findFirst.mockResolvedValue({ id: 'community-bot' });
});

function submittedOpportunityData(): Record<string, unknown> {
    const call = prismaMock.opportunity.create.mock.calls[0]?.[0] as { data?: Record<string, unknown> } | undefined;
    if (!call?.data) throw new Error('opportunity.create was not called with data');
    return call.data;
}

function submittedProvenance(): Record<string, unknown> {
    const call = prismaMock.jobSubmission.create.mock.calls[0]?.[0] as
        | { data?: { extractedData?: Record<string, unknown> } }
        | undefined;
    return call?.data?.extractedData ?? {};
}

describe('POST /api/opportunities/mcp-submit: authentication is mandatory', () => {
    it('refuses a caller with no credential', async () => {
        const res = await submit(null, {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
        });

        expect(res.status).toBe(401);
        expect(res.body.error.message).toContain('sign in');
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('rejects a token that cannot be verified instead of staging anything', async () => {
        const res = await submit('stale-or-forged-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
        });

        expect(res.status).toBe(401);
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('refuses a suspended account even with a valid token', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-member', status: 'SUSPENDED' });

        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
        });

        expect(res.status).toBe(403);
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });
});

describe('POST /api/opportunities/mcp-submit: role decides publishing', () => {
    it('saves a normal account\'s submission as a draft', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ status: 'DRAFT', published: false });
        expect(submittedOpportunityData().status).toBe('DRAFT');
        // A draft must not announce itself as a published listing.
        expect(handleOpportunityPublished).not.toHaveBeenCalled();
    });

    it('publishes a moderator\'s submission and runs the publish side effects', async () => {
        grantedPermissions = [...MODERATOR_GRANTS];
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-moderator', status: 'ACTIVE' });
        prismaMock.opportunity.findUnique
            // First read: the status of the row that was just written.
            .mockResolvedValueOnce({ status: 'PUBLISHED', slug: 'acme-engineer' })
            // Second read: the full row handed to the publish pipeline.
            .mockResolvedValueOnce({ id: 'opp-mcp', status: 'PUBLISHED', slug: 'acme-engineer' });

        const res = await submit('moderator-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ status: 'PUBLISHED', published: true });
        expect(submittedOpportunityData().status).toBe('PUBLISHED');
        // Without this call the listing is live in Postgres but absent from the
        // CDN feed — the exact "it says live but is not on the site" failure.
        expect(handleOpportunityPublished).toHaveBeenCalledTimes(1);
    });

    it('reports an already-live duplicate as published without re-announcing it', async () => {
        prismaMock.jobSubmission.findFirst.mockResolvedValue({
            opportunityId: 'opp-live',
            opportunity: { id: 'opp-live', slug: 'acme-engineer' },
        });

        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
        });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'DRAFT', published: false, duplicate: true });
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });
});

describe('POST /api/opportunities/mcp-submit: payload handling', () => {
    it('parses free-text eligibility into structured degrees and pass-out years', async () => {
        const res = await submit('member-token', {
            title: 'Trainee Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            eligibility: 'B.E/B.Tech and MCA graduates, 2024-2026 passouts only',
        });

        expect(res.status).toBe(201);
        const data = submittedOpportunityData();
        // "B.E/B.Tech" resolves through the shared qualification patterns, and the
        // range expands so batch filters can actually match the listing.
        expect(data.allowedDegrees).toContain('DEGREE');
        expect(data.allowedPassoutYears).toEqual([2024, 2025, 2026]);
        // The source wording survives on the submission for the moderator.
        expect(submittedProvenance().eligibility).toBe(
            'B.E/B.Tech and MCA graduates, 2024-2026 passouts only',
        );
    });

    it('prefers explicit structured eligibility over the free-text fallback', async () => {
        const res = await submit('member-token', {
            title: 'Frontend Intern',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            eligibility: 'Any graduate, 2019-2027 batches',
            skills: ['React', 'TypeScript'],
            passoutYears: [2026],
        });

        expect(res.status).toBe(201);
        const data = submittedOpportunityData();
        expect(data.requiredSkills).toEqual(['React', 'TypeScript']);
        expect(data.allowedPassoutYears).toEqual([2026]);
        // Explicit values win, so the free-text range must not widen the batch list.
        expect(data.allowedDegrees).toContain('DEGREE');
    });

    it('does not invent eligibility when the posting states none', async () => {
        const res = await submit('member-token', {
            title: 'Support Associate',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
        });

        expect(res.status).toBe(201);
        const data = submittedOpportunityData();
        expect(data.allowedDegrees).toEqual([]);
        expect(data.allowedPassoutYears).toEqual([]);
        expect(data.requiredSkills).toEqual([]);
        expect(submittedProvenance().eligibility).toBeUndefined();
    });

    it('attributes the submission to the signed-in account, never the community bot', async () => {
        await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
        });

        expect(submittedOpportunityData().postedByUserId).toBe('user-member');
        expect(submittedProvenance().submittedVia).toBe('mcp_user');
        expect(submittedProvenance().guest).toBe(false);
    });

    it('rejects a non-https job URL with a validation error', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: 'http://example.com/job',
        });

        expect(res.status).toBe(400);
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('rejects test-fixture shapes so they never reach the review queue', async () => {
        const res = await submit('member-token', {
            title: 'TEST-MCP Software Engineer (DELETE ME)',
            companyName: 'TestCo',
            jobUrl: nextJobUrl(),
        });

        expect(res.status).toBe(400);
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });
});
