import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Secrets/env for token + redis-free rate limiting
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.REDIS_ENABLED = 'false';

const prismaMock = {
    savedSearch: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    referralRequest: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
    },
    referralResponse: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
    },
    salaryReport: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
    },
    salaryReportHelpful: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
    opportunity: {
        count: vi.fn(),
        findMany: vi.fn(),
    },
    interviewExperience: {
        findMany: vi.fn(),
    },
    report: {
        count: vi.fn(),
    },
    notification: {
        create: vi.fn(),
    },
};

// Supports both transaction forms the services use: the interactive callback
// form and the array/batch form.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prismaMock as any).$transaction = vi.fn(async (arg: unknown) =>
    typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prismaMock)
        : Promise.all(arg as Array<unknown>)
);

vi.mock('@fresherflow/database', () => ({
    prisma: prismaMock,
    redis: {},
    OpportunityStatus: { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', ARCHIVED: 'ARCHIVED' },
    OpportunityType: { JOB: 'JOB', INTERNSHIP: 'INTERNSHIP', WALKIN: 'WALKIN', GOVERNMENT: 'GOVERNMENT' },
    ReferralRequestStatus: { OPEN: 'OPEN', FULFILLED: 'FULFILLED', CLOSED: 'CLOSED' },
    CommunityPostStatus: { ACTIVE: 'ACTIVE', ARCHIVED: 'ARCHIVED', DELETED: 'DELETED' },
}));

// Test auth: caller injects identity via headers so we can exercise 401 paths.
vi.mock('../middleware/auth', () => ({
    optionalAuth: (req: Request, _res: Response, next: NextFunction) => {
        const user = req.headers['x-test-user'];
        if (typeof user === 'string' && user) {
            req.userId = user;
        }
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

let app: express.Application;

const AUTH = { 'x-test-user': 'user-1' };

function user(id: string) {
    return { id, fullName: `Name ${id}`, username: `user_${id}`, avatarUrl: null };
}

beforeAll(async () => {
    const fresherNeeds = await import('../routes/fresherNeeds');
    app = express();
    app.use(express.json());
    app.use('/api', fresherNeeds.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message, statusCode: err.statusCode || 500 } });
    });
});

beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.opportunity.count.mockResolvedValue(0);
    prismaMock.opportunity.findMany.mockResolvedValue([]);
    prismaMock.interviewExperience.findMany.mockResolvedValue([]);
    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.referralRequest.count.mockResolvedValue(0);
});

// ============================================================================
// SAVED SEARCHES
// ============================================================================

describe('GET /api/saved-searches', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app).get('/api/saved-searches');
        expect(res.status).toBe(401);
    });

    it('returns searches with new match counts', async () => {
        prismaMock.savedSearch.findMany.mockResolvedValue([
            {
                id: 'ss-1',
                userId: 'user-1',
                name: 'Bangalore walkins',
                filters: { city: 'Bangalore', feedType: 'walkins' },
                alertEnabled: true,
                lastMatchedAt: null,
                lastNotifiedAt: null,
                createdAt: new Date('2026-01-01'),
                updatedAt: new Date('2026-01-01'),
            },
        ]);
        prismaMock.opportunity.count.mockResolvedValue(7);

        const res = await request(app).get('/api/saved-searches').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.searches).toHaveLength(1);
        expect(res.body.searches[0].newMatchCount).toBe(7);
        expect(res.body.searches[0].filters.city).toBe('Bangalore');
    });
});

describe('POST /api/saved-searches', () => {
    it('creates a saved search', async () => {
        prismaMock.savedSearch.create.mockResolvedValue({
            id: 'ss-2',
            userId: 'user-1',
            name: '2026 batch remote',
            filters: { batch: 2026, feedType: 'remote' },
            alertEnabled: true,
            lastMatchedAt: null,
            lastNotifiedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
            .post('/api/saved-searches')
            .set(AUTH)
            .send({ name: '2026 batch remote', filters: { batch: 2026, feedType: 'remote' } });

        expect(res.status).toBe(201);
        expect(res.body.search.name).toBe('2026 batch remote');
    });

    it('rejects empty filters', async () => {
        const res = await request(app)
            .post('/api/saved-searches')
            .set(AUTH)
            .send({ name: 'empty', filters: {} });
        expect(res.status).toBe(400);
    });

    it('rejects invalid batch year', async () => {
        const res = await request(app)
            .post('/api/saved-searches')
            .set(AUTH)
            .send({ name: 'bad batch', filters: { batch: 1990 } });
        expect(res.status).toBe(400);
    });
});

describe('DELETE /api/saved-searches/:id', () => {
    it('returns 404 for another user\'s search', async () => {
        prismaMock.savedSearch.findFirst.mockResolvedValue(null);
        const res = await request(app).delete('/api/saved-searches/ss-1').set(AUTH);
        expect(res.status).toBe(404);
    });

    it('deletes own search', async () => {
        prismaMock.savedSearch.findFirst.mockResolvedValue({ id: 'ss-1', userId: 'user-1' });
        prismaMock.savedSearch.delete.mockResolvedValue({ id: 'ss-1' });
        const res = await request(app).delete('/api/saved-searches/ss-1').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ============================================================================
// REFERRAL REQUESTS
// ============================================================================

describe('GET /api/referral-requests', () => {
    it('lists requests with authors and responses', async () => {
        prismaMock.referralRequest.count.mockResolvedValue(1);
        prismaMock.referralRequest.findMany.mockResolvedValue([
            {
                id: 'rr-1',
                authorId: 'user-2',
                company: 'Zoho',
                role: 'SDE',
                batch: 2026,
                city: 'Chennai',
                note: 'Anyone willing?',
                status: 'OPEN',
                responseCount: 1,
                createdAt: new Date(),
                author: user('user-2'),
                responses: [
                    { id: 'resp-1', message: 'DM me', contactHandle: 't/@someone', createdAt: new Date(), responder: user('user-3') },
                ],
            },
        ]);

        const res = await request(app).get('/api/referral-requests');

        expect(res.status).toBe(200);
        expect(res.body.requests).toHaveLength(1);
        expect(res.body.requests[0].responses).toHaveLength(1);
        expect(res.body.requests[0].author.username).toBe('user_user-2');
    });
});

describe('POST /api/referral-requests', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app).post('/api/referral-requests').send({ company: 'Zoho' });
        expect(res.status).toBe(401);
    });

    it('blocks more than 5 open requests', async () => {
        prismaMock.referralRequest.count.mockResolvedValue(5);

        const res = await request(app)
            .post('/api/referral-requests')
            .set(AUTH)
            .send({ company: 'Zoho' });

        expect(res.status).toBe(429);
    });

    it('creates a request', async () => {
        prismaMock.referralRequest.count.mockResolvedValue(0);
        prismaMock.referralRequest.create.mockResolvedValue({
            id: 'rr-2',
            authorId: 'user-1',
            company: 'Zoho',
            role: null,
            batch: null,
            city: null,
            note: null,
            status: 'OPEN',
            responseCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            author: user('user-1'),
        });

        const res = await request(app).post('/api/referral-requests').set(AUTH).send({ company: 'Zoho' });

        expect(res.status).toBe(201);
        expect(res.body.request.company).toBe('Zoho');
    });
});

describe('POST /api/referral-requests/:id/respond', () => {
    const openRequest = {
        id: 'rr-1',
        authorId: 'user-2',
        company: 'Zoho',
        status: 'OPEN',
    };

    it('responds to an open request and notifies the author', async () => {
        prismaMock.referralRequest.findUnique.mockResolvedValue(openRequest);
        prismaMock.referralResponse.upsert.mockResolvedValue({
            id: 'resp-9',
            requestId: 'rr-1',
            responderId: 'user-1',
            message: 'happy to refer',
            contactHandle: null,
            createdAt: new Date(),
        });

        const res = await request(app)
            .post('/api/referral-requests/rr-1/respond')
            .set(AUTH)
            .send({ message: 'happy to refer' });

        expect(res.status).toBe(201);
        expect(prismaMock.notification.create).toHaveBeenCalledTimes(1);
    });

    it('blocks responding to your own request', async () => {
        prismaMock.referralRequest.findUnique.mockResolvedValue({ ...openRequest, authorId: 'user-1' });
        const res = await request(app)
            .post('/api/referral-requests/rr-1/respond')
            .set(AUTH)
            .send({ message: 'self' });
        expect(res.status).toBe(400);
    });

    it('blocks responding to a closed request', async () => {
        prismaMock.referralRequest.findUnique.mockResolvedValue({ ...openRequest, status: 'CLOSED' });
        const res = await request(app)
            .post('/api/referral-requests/rr-1/respond')
            .set(AUTH)
            .send({ message: 'late' });
        expect(res.status).toBe(400);
    });

    it('requires a message or contact handle', async () => {
        const res = await request(app)
            .post('/api/referral-requests/rr-1/respond')
            .set(AUTH)
            .send({});
        expect(res.status).toBe(400);
    });
});

// ============================================================================
// SALARY REPORTS
// ============================================================================

describe('GET /api/salary-reports', () => {
    it('returns reports with aggregate stats', async () => {
        prismaMock.salaryReport.count.mockResolvedValue(2);
        prismaMock.salaryReport.findMany.mockResolvedValue([
            {
                id: 'sr-1',
                opportunityId: null,
                company: 'TCS',
                role: 'Ninja',
                batch: 2026,
                city: 'Chennai',
                reportType: 'OFFER',
                ctcFixed: 350,
                ctcVariable: 50,
                ctcTotal: 400,
                inHandMonthly: 25000,
                joinBonus: null,
                bondMonths: 12,
                notes: null,
                helpfulCount: 3,
                createdAt: new Date(),
                author: user('user-2'),
                opportunity: null,
            },
            {
                id: 'sr-2',
                opportunityId: null,
                company: 'TCS',
                role: 'Prime',
                batch: 2026,
                city: 'Chennai',
                reportType: 'OFFER',
                ctcFixed: 700,
                ctcVariable: 0,
                ctcTotal: 700,
                inHandMonthly: 45000,
                joinBonus: null,
                bondMonths: null,
                notes: null,
                helpfulCount: 1,
                createdAt: new Date(),
                author: user('user-3'),
                opportunity: null,
            },
        ]);

        const res = await request(app).get('/api/salary-reports?company=TCS');

        expect(res.status).toBe(200);
        expect(res.body.reports).toHaveLength(2);
        expect(res.body.stats.count).toBe(2);
        expect(res.body.stats.avgTotal).toBe(550);
        expect(res.body.stats.minTotal).toBe(400);
        expect(res.body.stats.maxTotal).toBe(700);
        expect(res.body.stats.avgInHand).toBe(35000);
    });
});

describe('POST /api/salary-reports', () => {
    it('creates a report', async () => {
        prismaMock.salaryReport.create.mockResolvedValue({
            id: 'sr-3',
            opportunityId: null,
            company: 'Infosys',
            role: 'Systems Engineer',
            batch: 2026,
            city: 'Mysore',
            reportType: 'OFFER',
            ctcFixed: 400,
            ctcVariable: null,
            ctcTotal: 400,
            inHandMonthly: 28000,
            joinBonus: null,
            bondMonths: 12,
            notes: null,
            helpfulCount: 0,
            createdAt: new Date(),
            author: user('user-1'),
            opportunity: null,
        });

        const res = await request(app)
            .post('/api/salary-reports')
            .set(AUTH)
            .send({ company: 'Infosys', role: 'Systems Engineer', ctcTotal: 400 });

        expect(res.status).toBe(201);
        expect(res.body.report.company).toBe('Infosys');
    });

    it('rejects missing role', async () => {
        const res = await request(app)
            .post('/api/salary-reports')
            .set(AUTH)
            .send({ company: 'Infosys' });
        expect(res.status).toBe(400);
    });
});

describe('POST /api/salary-reports/:id/helpful', () => {
    it('marks helpful and increments count', async () => {
        prismaMock.salaryReport.findUnique.mockResolvedValue({ id: 'sr-1', helpfulCount: 3 });
        prismaMock.salaryReportHelpful.findUnique.mockResolvedValue(null);

        const res = await request(app).post('/api/salary-reports/sr-1/helpful').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.marked).toBe(true);
        expect(res.body.helpfulCount).toBe(4);
    });

    it('toggles off when already marked', async () => {
        prismaMock.salaryReport.findUnique.mockResolvedValue({ id: 'sr-1', helpfulCount: 4 });
        prismaMock.salaryReportHelpful.findUnique.mockResolvedValue({ id: 'h-1' });

        const res = await request(app).post('/api/salary-reports/sr-1/helpful').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.marked).toBe(false);
        expect(res.body.helpfulCount).toBe(3);
    });
});

// ============================================================================
// COMPANY HUB
// ============================================================================

describe('GET /api/companies/:name/hub', () => {
    it('aggregates drives, experiences, salary and trust signals', async () => {
        prismaMock.opportunity.findMany.mockResolvedValue([
            {
                id: 'opp-1',
                slug: 'tcs-ninja-2026',
                title: 'TCS Ninja 2026',
                type: 'JOB',
                locations: ['Chennai'],
                salaryRange: '3.6 LPA',
                salaryMin: 360,
                salaryMax: null,
                allowedPassoutYears: [2026],
                postedAt: new Date(),
                expiresAt: null,
                linkHealth: 'HEALTHY',
            },
        ]);
        prismaMock.interviewExperience.findMany.mockResolvedValue([
            {
                id: 'ie-1',
                role: 'Ninja',
                batch: 2026,
                difficulty: 'MEDIUM',
                result: 'SELECTED',
                overallNotes: '3 rounds',
                upvotes: 5,
                createdAt: new Date(),
                author: user('user-2'),
            },
        ]);
        prismaMock.salaryReport.findMany.mockResolvedValue([
            {
                id: 'sr-1',
                role: 'Ninja',
                ctcTotal: 400,
                inHandMonthly: 25000,
                bondMonths: 12,
                reportType: 'OFFER',
                createdAt: new Date(),
                author: user('user-3'),
            },
        ]);
        prismaMock.referralRequest.count.mockResolvedValue(2);
        prismaMock.opportunity.count.mockResolvedValue(9);
        prismaMock.report.count.mockResolvedValue(1);

        const res = await request(app).get('/api/companies/TCS/hub');

        expect(res.status).toBe(200);
        expect(res.body.company).toBe('TCS');
        expect(res.body.driveCount).toBe(9);
        expect(res.body.interviewExperiences).toHaveLength(1);
        expect(res.body.experienceStats.selected).toBe(1);
        expect(res.body.salaryStats.avgTotal).toBe(400);
        expect(res.body.trust.openReferralRequests).toBe(2);
        expect(res.body.trust.reportCount).toBe(1);
    });
});
