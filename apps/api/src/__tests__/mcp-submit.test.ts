import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// No Redis in tests: rate limiting falls back to the in-memory store.
process.env.REDIS_ENABLED = 'false';
process.env.MCP_PUBLIC_URL = 'http://127.0.0.1:8787';

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
    userAccessRole: {
        findFirst: vi.fn(),
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

// A real posting is never just a title and a URL. These defaults keep the
// tests focused on the behaviour each one asserts; the completeness gates
// themselves are exercised in their own block below.
const VALID_DESCRIPTION =
    'We are hiring fresher software engineers to build and maintain web applications with React, '
    + 'TypeScript and Node.js. You will work with senior engineers, review code and ship features. '
    + 'B.E/B.Tech or MCA graduates from 2024-2026 are eligible to apply.';

function submit(token: string | null, body: Record<string, unknown>) {
    const req = request(app).post('/api/opportunities/mcp-submit');
    return (token ? req.set('Authorization', `Bearer ${token}`) : req)
        .send({ location: 'Hyderabad', description: VALID_DESCRIPTION, ...body });
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
    prismaMock.userAccessRole.findFirst.mockResolvedValue(null);
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

    it('splits several cities sent in one location string', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            location: 'Hyderabad and Bangalore',
        });

        expect(res.status).toBe(201);
        // Stored as one label it could never match either city filter.
        expect(submittedOpportunityData().locations).toEqual(['Hyderabad', 'Bangalore']);
    });

    it('keeps an explicit locations array as one entry per city', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            location: '',
            locations: ['Hyderabad', 'Bangalore', 'Hyderabad'],
        });

        expect(res.status).toBe(201);
        expect(submittedOpportunityData().locations).toEqual(['Hyderabad', 'Bangalore']);
    });

    it('forwards the full education and detail field set', async () => {
        const res = await submit('member-token', {
            title: 'Graduate Engineer Trainee',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            allowedDegrees: ['DEGREE', 'PG'],
            allowedCourses: ['B.Tech', 'MCA'],
            allowedSpecializations: ['Computer Science'],
            passoutYears: [2025, 2026],
            stipend: '₹20,000/month',
            incentives: 'Health insurance, cab facility',
            selectionProcess: 'Online test → Technical interview → HR',
            notesHighlights: 'Immediate joiners preferred',
            tags: ['Fresher', 'Hybrid'],
            salaryMin: 500000,
            salaryMax: 700000,
            applicationDetails: { method: 'FORM', platform: 'Google Forms', requiredItems: ['Resume'] },
        });

        expect(res.status).toBe(201);
        const data = submittedOpportunityData();
        expect(data.allowedDegrees).toEqual(['DEGREE', 'PG']);
        expect(data.allowedCourses).toEqual(['B.Tech', 'MCA']);
        expect(data.allowedSpecializations).toEqual(['Computer Science']);
        expect(data.allowedPassoutYears).toEqual([2025, 2026]);
        expect(data.stipend).toBe('₹20,000/month');
        expect(data.incentives).toBe('Health insurance, cab facility');
        expect(data.selectionProcess).toBe('Online test → Technical interview → HR');
        expect(data.notesHighlights).toBe('Immediate joiners preferred');
        expect(data.tags).toEqual(['Fresher', 'Hybrid']);
        expect(data.salaryMin).toBe(500000);
        expect(data.salaryMax).toBe(700000);
        expect(data.applicationDetails).toEqual({
            method: 'FORM',
            platform: 'Google Forms',
            requiredItems: ['Resume'],
        });
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

describe('POST /api/opportunities/mcp-submit: minimum completeness', () => {
    it('rejects a title-and-URL stub with no description', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            description: '',
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('description');
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('rejects a description too short to be a real posting', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            description: 'See the link.',
        });

        expect(res.status).toBe(400);
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('requires a location unless the role is remote', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            location: '',
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('location');
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('accepts a remote role without a location', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            location: '',
            workMode: 'REMOTE',
        });

        expect(res.status).toBe(201);
        expect(prismaMock.opportunity.create).toHaveBeenCalledTimes(1);
    });

    it('rejects a walk-in without a real date instead of storing today', async () => {
        const res = await submit('member-token', {
            title: 'Walk-in Drive',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            category: 'walkin',
            dates: [],
            venueAddress: 'Acme Office, Hitech City, Hyderabad',
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('date');
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('rejects a walk-in without a venue instead of storing a placeholder', async () => {
        const res = await submit('member-token', {
            title: 'Walk-in Drive',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            category: 'walkin',
            dates: ['2026-12-01'],
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('venue');
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('accepts a complete walk-in with real dates and a venue', async () => {
        const res = await submit('member-token', {
            title: 'Walk-in Drive',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            category: 'walkin',
            dates: ['2026-12-01', '2026-12-02'],
            venueAddress: 'Acme Office, Hitech City, Hyderabad',
        });

        expect(res.status).toBe(201);
        expect(submittedOpportunityData().recruitmentMethod).toBe('WALK_IN');
    });
});

describe('every field rule is enforced, not only documented', () => {
    it('rejects a salary that is a phrase, not a figure', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            salary: 'Competitive',
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('salary');
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('rejects duplicated skills instead of storing the same skill twice', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            skills: ['React', 'react'],
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('skills');
    });

    it('rejects an unknown employment type instead of silently dropping it', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            employmentTypes: 'PERMANENT',
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('employment');
    });

    it('rejects a deadline that has already passed', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            expiresAt: '2020-01-01',
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('expiresAt');
    });

    it('rejects a work mode sent as a city', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'Acme',
            jobUrl: nextJobUrl(),
            location: 'Remote',
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('workMode');
    });

    it('rejects a placeholder company', async () => {
        const res = await submit('member-token', {
            title: 'Software Engineer',
            companyName: 'One of our clients',
            jobUrl: nextJobUrl(),
        });

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('company');
    });
});

describe('POST /api/opportunities/mcp-submit: 60/hour quota', () => {
    const body = () => ({
        title: 'Software Engineer',
        companyName: 'Acme',
        jobUrl: nextJobUrl(),
    });

    it('still limits a normal account to 60 submissions per hour', async () => {
        for (let i = 0; i < 60; i += 1) {
            expect((await submit('member-token', body())).status).toBe(201);
        }

        const res = await submit('member-token', body());
        expect(res.status).toBe(429);
    });

    it('does not limit a moderator, who publishes on submit', async () => {
        grantedPermissions = [...MODERATOR_GRANTS];
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-moderator', status: 'ACTIVE' });

        // More than the 60/hour quota a normal account hits.
        for (let i = 0; i < 65; i += 1) {
            const res = await submit('moderator-token', body());
            expect(res.status).toBe(201);
        }
    });
});
