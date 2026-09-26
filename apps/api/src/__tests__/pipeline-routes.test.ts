import express, { NextFunction, Request, Response, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAccessToken } from '@fresherflow/utils';
import { RecruitmentStageKind } from './helpers/dbEnums';

// HTTP tests for the Phase 12 ATS / Hiring Pipeline router, mounted at
// /api/pipeline. Mirrors require-moderator.test.ts: express app assembled in
// beforeAll, the real router mounted, Prisma faked with vi.mock.

// Secrets/env for user + admin tokens, redis-free rate limiting
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_ADMIN_SECRET = 'test-admin-secret';
process.env.REDIS_ENABLED = 'false';

type Row = Record<string, unknown>;
type Where = Record<string, unknown> | undefined;
type Args = { where?: Where; data?: Row; orderBy?: unknown };

type ModelName =
    | 'organizationMembership'
    | 'hiringPipeline'
    | 'recruitmentStage'
    | 'opportunityApplication'
    | 'opportunity'
    | 'user';

const MODELS: ModelName[] = [
    'organizationMembership',
    'hiringPipeline',
    'recruitmentStage',
    'opportunityApplication',
    'opportunity',
    'user',
];

const db: Record<ModelName, Row[]> = MODELS.reduce(
    (acc, name) => ({ ...acc, [name]: [] }),
    {} as Record<ModelName, Row[]>,
);

let seq = 0;
const nextId = (prefix: string): string => `${prefix}-${(seq += 1)}`;

function matches(row: Row, where: Where): boolean {
    if (!where) return true;
    for (const [key, expected] of Object.entries(where)) {
        const actual = row[key];
        if (expected === null) {
            if (actual !== null && actual !== undefined) return false;
            continue;
        }
        if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
            const op = expected as Record<string, unknown>;
            if ('in' in op) {
                if (!Array.isArray(op.in) || !op.in.includes(actual)) return false;
                continue;
            }
            if ('notIn' in op) {
                if (Array.isArray(op.notIn) && op.notIn.includes(actual)) return false;
                continue;
            }
            if ('not' in op) {
                if (matches(row, { [key]: op.not })) return false;
                continue;
            }
            if ('contains' in op) {
                if (!String(actual ?? '').toLowerCase().includes(String(op.contains).toLowerCase())) return false;
                continue;
            }
            return false;
        }
        if (actual !== expected) return false;
    }
    return true;
}

interface MockModel {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
}

function buildModel(name: ModelName): MockModel {
    const rows = db[name];
    return {
        findMany: vi.fn(async (args: Args = {}) => rows.filter((r) => matches(r, args.where))),
        findFirst: vi.fn(async (args: Args = {}) => rows.find((r) => matches(r, args.where)) ?? null),
        findUnique: vi.fn(async (args: Args = {}) => rows.find((r) => matches(r, args.where)) ?? null),
        count: vi.fn(async (args: Args = {}) => rows.filter((r) => matches(r, args.where)).length),
        create: vi.fn(async (args: Args) => {
            const row: Row = { id: nextId(name), ...(args.data ?? {}) };
            rows.push(row);
            return row;
        }),
        createMany: vi.fn(async (args: { data: Row[] }) => {
            for (const data of args.data) rows.push({ id: nextId(name), ...data });
            return { count: args.data.length };
        }),
        update: vi.fn(async (args: Args) => {
            const row = rows.find((r) => matches(r, args.where));
            if (!row) return null;
            Object.assign(row, args.data ?? {});
            return row;
        }),
        updateMany: vi.fn(async (args: Args) => {
            let n = 0;
            for (const row of rows) {
                if (!matches(row, args.where)) continue;
                Object.assign(row, args.data ?? {});
                n += 1;
            }
            return { count: n };
        }),
        delete: vi.fn(async (args: Args) => {
            const idx = rows.findIndex((r) => matches(r, args.where));
            return idx === -1 ? null : rows.splice(idx, 1)[0];
        }),
        deleteMany: vi.fn(async (args: Args = {}) => {
            const before = rows.length;
            for (let i = rows.length - 1; i >= 0; i -= 1) {
                if (matches(rows[i], args.where)) rows.splice(i, 1);
            }
            return { count: before - rows.length };
        }),
        // Upsert on the composite unique ([userId, opportunityId]).
        upsert: vi.fn(async (args: { where: Row; create: Row; update?: Row }) => {
            const existing = rows.find((r) => matches(r, args.where));
            if (existing) {
                Object.assign(existing, args.update ?? {});
                return existing;
            }
            const row: Row = { id: nextId(name), ...args.create };
            rows.push(row);
            return row;
        }),
    };
}

interface PrismaMock extends Record<ModelName, MockModel> {
    $transaction: ReturnType<typeof vi.fn>;
    $queryRaw: ReturnType<typeof vi.fn>;
}

const prismaMock: PrismaMock = {
    organizationMembership: buildModel('organizationMembership'),
    hiringPipeline: buildModel('hiringPipeline'),
    recruitmentStage: buildModel('recruitmentStage'),
    opportunityApplication: buildModel('opportunityApplication'),
    opportunity: buildModel('opportunity'),
    user: buildModel('user'),
    // Both Prisma transaction shapes, so either implementation style works.
    $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: PrismaMock) => unknown)(prismaMock) : arg,
    ),
    $queryRaw: vi.fn(async () => []),
};

vi.mock('@fresherflow/database', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@fresherflow/database')>();
    return { ...actual, prisma: prismaMock, redis: {} };
});

vi.mock('../infrastructure/database/prisma', () => ({
    default: prismaMock,
    prisma: prismaMock,
}));

// ---------------------------------------------------------------------------
// App wiring + identity fixtures
// ---------------------------------------------------------------------------

let app: express.Application;

const ORG_A = 'org-a';
const ORG_B = 'org-b';
const TEMPLATE_ID = 'pipeline-template';

const MEMBER_A = 'user-member-a'; // ADMIN in ORG_A, so ownership is the only thing under test
const OUTSIDER = 'user-outsider'; // no membership anywhere
const CANDIDATE = 'user-candidate';
const OTHER_CANDIDATE = 'user-other-candidate';
const ADMIN = 'admin-1';

/**
 * Every protected route. The 401 sweep drives off this table, so a new
 * protected route only has to be added here to be covered.
 */
const PROTECTED_ROUTES: Array<{ method: 'get' | 'post' | 'patch' | 'put' | 'delete'; path: string }> = [
    { method: 'get', path: `/api/pipeline/organizations/${ORG_A}/pipelines` },
    { method: 'post', path: `/api/pipeline/organizations/${ORG_A}/pipelines` },
    { method: 'get', path: `/api/pipeline/organizations/${ORG_A}/pipelines/pipe-a` },
    { method: 'patch', path: `/api/pipeline/organizations/${ORG_A}/pipelines/pipe-a` },
    { method: 'delete', path: `/api/pipeline/organizations/${ORG_A}/pipelines/pipe-a` },
    { method: 'post', path: `/api/pipeline/organizations/${ORG_A}/pipelines/pipe-a/stages` },
    { method: 'patch', path: `/api/pipeline/organizations/${ORG_A}/pipelines/pipe-a/stages/stage-2` },
    { method: 'delete', path: `/api/pipeline/organizations/${ORG_A}/pipelines/pipe-a/stages/stage-2` },
    { method: 'put', path: `/api/pipeline/organizations/${ORG_A}/pipelines/pipe-a/stages/order` },
    { method: 'post', path: '/api/pipeline/opportunities/opp-1/applications' },
    { method: 'get', path: '/api/pipeline/opportunities/opp-1/applications' },
    { method: 'get', path: '/api/pipeline/opportunities/opp-1/board' },
    { method: 'patch', path: '/api/pipeline/applications/app-1' },
    { method: 'delete', path: '/api/pipeline/applications/app-1' },
];

const auth = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });
const memberAuth = (): Record<string, string> => auth(generateAccessToken(MEMBER_A));
const outsiderAuth = (): Record<string, string> => auth(generateAccessToken(OUTSIDER));
const candidateAuth = (): Record<string, string> => auth(generateAccessToken(CANDIDATE));
const otherCandidateAuth = (): Record<string, string> => auth(generateAccessToken(OTHER_CANDIDATE));

/** Seed the accounts, membership and pipeline rows every block starts from. */
function seedWorld(): void {
    for (const id of [MEMBER_A, OUTSIDER, CANDIDATE, OTHER_CANDIDATE, ADMIN]) {
        db.user.push({ id, role: id === ADMIN ? 'ADMIN' : 'USER', status: 'ACTIVE', trustLevel: 'VERIFIED' });
    }
    db.organizationMembership.push({
        id: 'mem-1',
        userId: MEMBER_A,
        organizationId: ORG_A,
        // ADMIN rather than RECRUITER: the IDOR cases below must clear the role
        // gate and fail on ownership alone, otherwise they assert a 403 that
        // proves nothing about tenant isolation.
        role: 'ADMIN',
        status: 'APPROVED',
    });

    db.hiringPipeline.push(
        {
            id: 'pipe-a',
            organizationId: ORG_A,
            name: 'Org A Hiring',
            isDefault: true,
            isTemplate: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
            id: 'pipe-b',
            organizationId: ORG_B,
            name: 'Org B Confidential',
            isDefault: true,
            isTemplate: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
            id: TEMPLATE_ID,
            organizationId: null,
            name: 'Standard Hiring Process',
            isDefault: false,
            isTemplate: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
    );

    db.recruitmentStage.push(
        {
            id: 'stage-1',
            pipelineId: 'pipe-a',
            kind: RecruitmentStageKind.SCREENING,
            name: 'Applied',
            order: 1,
            expectedDays: null,
        },
        {
            id: 'stage-2',
            pipelineId: 'pipe-a',
            kind: RecruitmentStageKind.INTERVIEW,
            name: 'Interview',
            order: 2,
            expectedDays: 3,
        },
        {
            id: 'stage-b1',
            pipelineId: 'pipe-b',
            kind: RecruitmentStageKind.SCREENING,
            name: 'Applied',
            order: 1,
            expectedDays: null,
        },
    );

    db.opportunity.push({ id: 'opp-1', pipelineId: 'pipe-a', organizationId: ORG_A, title: 'Engineer' });

    db.opportunityApplication.push(
        {
            id: 'app-1',
            userId: CANDIDATE,
            opportunityId: 'opp-1',
            currentStageId: 'stage-1',
            currentStageKind: RecruitmentStageKind.SCREENING,
            stage: 'IN_REVIEW',
            appliedAt: new Date('2026-02-01T00:00:00.000Z'),
        },
        {
            id: 'app-2',
            userId: OTHER_CANDIDATE,
            opportunityId: 'opp-1',
            currentStageId: 'stage-1',
            currentStageKind: RecruitmentStageKind.SCREENING,
            stage: 'IN_REVIEW',
            appliedAt: new Date('2026-02-02T00:00:00.000Z'),
        },
    );
}

beforeAll(async () => {
    const pipelineRoutes = await import('../routes/pipeline');

    app = express();
    app.use(express.json());
    app.use('/api/pipeline', pipelineRoutes.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message, statusCode: err.statusCode || 500 } });
    });
});

beforeEach(() => {
    for (const name of MODELS) db[name].length = 0;
    seq = 0;
    for (const name of MODELS) {
        for (const fn of Object.values(prismaMock[name])) fn.mockClear();
    }
    prismaMock.$transaction.mockClear();
    prismaMock.$queryRaw.mockClear();
    seedWorld();
});

// ---------------------------------------------------------------------------
// 14. Unauthenticated access is rejected everywhere
// ---------------------------------------------------------------------------

describe('pipeline routes: authentication', () => {
    it.each(PROTECTED_ROUTES)('returns 401 without a token for $method $path', async ({ method, path }) => {
        const res = await request(app)[method](path).send({});
        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// 15. Organization membership is enforced
// ---------------------------------------------------------------------------

describe('pipeline routes: organization authorization', () => {
    it('returns 403 for a user who is not a member of the organization', async () => {
        const res = await request(app).get(`/api/pipeline/organizations/${ORG_A}/pipelines`).set(outsiderAuth());

        expect(res.status).toBe(403);
        expect(JSON.stringify(res.body)).not.toContain('Org A Hiring');
    });

    it('returns 403 for a non-member attempting a mutation on the org', async () => {
        const res = await request(app)
            .post(`/api/pipeline/organizations/${ORG_A}/pipelines`)
            .set(outsiderAuth())
            .send({ name: 'Sneaky', stages: [{ kind: RecruitmentStageKind.SCREENING, name: 'Applied' }] });

        expect(res.status).toBe(403);
    });
});

// ---------------------------------------------------------------------------
// 16. Cross-organization IDOR
// ---------------------------------------------------------------------------

describe('pipeline routes: cross-organization IDOR', () => {
    it('returns 404, not org B data, when a member of org A asks for org B pipelineId under org A', async () => {
        const res = await request(app).get(`/api/pipeline/organizations/${ORG_A}/pipelines/pipe-b`).set(memberAuth());

        expect(res.status).toBe(404);
        expect(JSON.stringify(res.body)).not.toContain('Org B Confidential');
    });

    it('refuses to delete another org pipeline through the member own org URL', async () => {
        const res = await request(app)
            .delete(`/api/pipeline/organizations/${ORG_A}/pipelines/pipe-b`)
            .set(memberAuth())
            .send({});

        expect(res.status).toBe(404);
        expect(db.hiringPipeline.find((p) => p.id === 'pipe-b')).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// 17. The platform template is readable but immutable
// ---------------------------------------------------------------------------

describe('pipeline routes: platform template', () => {
    it('allows reading the platform template', async () => {
        const res = await request(app)
            .get(`/api/pipeline/organizations/${ORG_A}/pipelines/${TEMPLATE_ID}`)
            .set(memberAuth());

        expect(res.status).toBe(200);
    });

    it('returns 403 when mutating the platform template', async () => {
        const patch = await request(app)
            .patch(`/api/pipeline/organizations/${ORG_A}/pipelines/${TEMPLATE_ID}`)
            .set(memberAuth())
            .send({ name: 'Renamed' });
        expect(patch.status).toBe(403);

        const remove = await request(app)
            .delete(`/api/pipeline/organizations/${ORG_A}/pipelines/${TEMPLATE_ID}`)
            .set(memberAuth())
            .send({});
        expect(remove.status).toBe(403);

        expect(db.hiringPipeline.find((p) => p.id === TEMPLATE_ID)?.name).toBe('Standard Hiring Process');
    });
});

// ---------------------------------------------------------------------------
// 18. A candidate owns their application; the body cannot spoof the actor
// ---------------------------------------------------------------------------

describe('pipeline routes: candidate application ownership', () => {
    it('creates the application for the authenticated user and ignores a body userId', async () => {
        const res = await request(app)
            .post('/api/pipeline/opportunities/opp-1/applications')
            .set(candidateAuth())
            // Spoof attempt: must not win over the token subject.
            .send({ userId: OTHER_CANDIDATE, note: 'please hire me' });

        expect([200, 201]).toContain(res.status);

        const mine = db.opportunityApplication.filter((a) => a.userId === CANDIDATE);
        expect(mine.length).toBeGreaterThanOrEqual(1);
        // No new application row may be attributed to the spoofed user.
        expect(db.opportunityApplication.filter((a) => a.userId === OTHER_CANDIDATE)).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// 19. A candidate may delete only their own application
// ---------------------------------------------------------------------------

describe('pipeline routes: candidate application deletion', () => {
    it('lets a candidate delete their own application', async () => {
        const res = await request(app).delete('/api/pipeline/applications/app-1').set(candidateAuth()).send({});

        expect(res.status).toBe(200);
        expect(db.opportunityApplication.find((a) => a.id === 'app-1')).toBeUndefined();
    });

    it('returns 403 when a candidate deletes another candidate application', async () => {
        const res = await request(app).delete('/api/pipeline/applications/app-2').set(candidateAuth()).send({});

        expect(res.status).toBe(403);
        expect(db.opportunityApplication.find((a) => a.id === 'app-2')).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// 20. A candidate may not move another candidate's application
// ---------------------------------------------------------------------------

describe('pipeline routes: candidate stage moves', () => {
    it('returns 403 when a candidate moves another candidate application', async () => {
        const res = await request(app)
            .patch('/api/pipeline/applications/app-2')
            .set(candidateAuth())
            .send({ stageId: 'stage-2' });

        expect(res.status).toBe(403);
        expect(db.opportunityApplication.find((a) => a.id === 'app-2')?.currentStageId).toBe('stage-1');
    });

    it('lets a candidate move their own application', async () => {
        const res = await request(app)
            .patch('/api/pipeline/applications/app-1')
            .set(candidateAuth())
            .send({ stageId: 'stage-2' });

        expect(res.status).toBe(200);
        expect(db.opportunityApplication.find((a) => a.id === 'app-1')?.currentStageId).toBe('stage-2');
    });
});

// ---------------------------------------------------------------------------
// 21. Zod rejects malformed payloads with 400
// ---------------------------------------------------------------------------

describe('pipeline routes: payload validation', () => {
    it('returns 400 when the pipeline name is missing', async () => {
        const res = await request(app)
            .post(`/api/pipeline/organizations/${ORG_A}/pipelines`)
            .set(memberAuth())
            .send({ stages: [{ kind: RecruitmentStageKind.SCREENING, name: 'Applied' }] });

        expect(res.status).toBe(400);
    });

    it('returns 400 for an unknown stage kind', async () => {
        const res = await request(app)
            .post(`/api/pipeline/organizations/${ORG_A}/pipelines/pipe-a/stages`)
            .set(memberAuth())
            .send({ kind: 'NOT_A_REAL_KIND', name: 'Bogus' });

        expect(res.status).toBe(400);
    });

    it('returns 400 for a non-numeric or out-of-range limit', async () => {
        for (const limit of ['abc', '-1', '100000']) {
            // Authenticated as an ORG_A admin: the listing belongs to ORG_A, so
            // the reader must clear the membership gate before query validation
            // is reached. A non-member here would get 403 and the assertion would
            // pass without ever testing the limit.
            // eslint-disable-next-line no-await-in-loop
            const res = await request(app)
                .get(`/api/pipeline/opportunities/opp-1/applications?limit=${limit}&page=1`)
                .set(memberAuth());

            expect(res.status).toBe(400);
        }
    });
});

// ---------------------------------------------------------------------------
// 22. Write routes are rate limited
// ---------------------------------------------------------------------------

describe('pipeline routes: rate limiting', () => {
    it('eventually returns 429 on a rate-limited write route', async () => {
        // The limiter is per-route and keyed by IP, and supertest uses a single
        // IP, so this deliberately runs last in the file: it burns the write
        // budget for that route.
        let sawRateLimit = false;
        for (let i = 0; i < 200; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const res = await request(app)
                .post('/api/pipeline/opportunities/opp-1/applications')
                .set(candidateAuth())
                .send({});
            if (res.status === 429) {
                sawRateLimit = true;
                break;
            }
        }

        expect(sawRateLimit).toBe(true);
    }, 60000);
});
