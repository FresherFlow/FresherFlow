import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecruitmentStageKind } from './helpers/dbEnums';
import { ApplicationStage } from '@fresherflow/types';

// Unit tests for the Phase 12 ATS / Hiring Pipeline service layer. No HTTP here —
// the route suite owns the HTTP surface.
//
// The service reads Prisma through `src/infrastructure/database/prisma`, which
// itself re-exports `@fresherflow/database`. Mocking the database package covers
// BOTH import shapes, so the test does not depend on which one the service picks.
// The local barrel is mocked too, for the same reason.

type Row = Record<string, unknown>;
type Where = Record<string, unknown> | undefined;
type Args = { where?: Where; data?: Row; orderBy?: unknown; select?: unknown; include?: unknown };

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

/** Row bag per model; wiped in beforeEach so no fixture leaks between blocks. */
const db: Record<ModelName, Row[]> = MODELS.reduce(
    (acc, name) => ({ ...acc, [name]: [] }),
    {} as Record<ModelName, Row[]>,
);

let seq = 0;
const nextId = (prefix: string): string => `${prefix}-${(seq += 1)}`;

/**
 * Minimal Prisma `where` matcher: equality plus the operators the service
 * realistically uses. Enough to assert behaviour without pinning the exact
 * query object the implementation builds. An unrecognised operator shape
 * returns false on purpose, so a surprising query surfaces as a real failure
 * instead of a silent pass.
 */
function matches(row: Row, where: Where): boolean {
    if (!where) return true;
    for (const [key, expected] of Object.entries(where)) {
        // `OR` is a top-level boolean combinator, not a column comparison, and
        // the board query relies on it. Handled before the generic object branch
        // so it is not mistaken for an operator object.
        if (key === 'OR' && Array.isArray(expected)) {
            if (!expected.some((clause) => matches(row, clause as Where))) return false;
            continue;
        }
        if (key === 'AND' && Array.isArray(expected)) {
            if (!expected.every((clause) => matches(row, clause as Where))) return false;
            continue;
        }
        // Compound unique keys arrive nested, e.g. an upsert on
        // `where: { userId_opportunityId: { userId, opportunityId } }`. Flatten so
        // the columns are compared individually instead of against a missing
        // `userId_opportunityId` property.
        const isOperatorObject =
            expected &&
            typeof expected === 'object' &&
            !Array.isArray(expected) &&
            ['in', 'notIn', 'not', 'contains', 'equals'].some((op) => op in (expected as object));
        if (expected && typeof expected === 'object' && !Array.isArray(expected) && !isOperatorObject) {
            if (!matches(row, expected as Where)) return false;
            continue;
        }
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

function compare(a: Row, b: Row, spec?: unknown): number {
    if (!spec) return 0;
    for (const entry of (Array.isArray(spec) ? spec : [spec]) as Array<Record<string, 'asc' | 'desc'>>) {
        for (const [key, dir] of Object.entries(entry)) {
            if (a[key] === b[key]) continue;
            const cmp = (a[key] as number) < (b[key] as number) ? -1 : 1;
            return dir === 'desc' ? -cmp : cmp;
        }
    }
    return 0;
}

interface MockModel {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
}

/**
 * Hydrates a row for an `include`/`select` request.
 *
 * WHY the mock needs this: the service reads `pipeline.stages` and
 * `application.currentStage`, which Prisma materialises from `include`. Without
 * it those properties are `undefined` and the test fails on the mock rather
 * than on the behaviour under test. Only the relations the service actually
 * traverses are resolved; anything else is returned untouched.
 */
function hydrate(row: Row | null, args: Args): Row | null {
    if (!row) return null;
    const include = args.include as Record<string, any> | undefined;
    if (!include) return row;

    const out: Row = { ...row };
    if (include.stages) {
        out.stages = db.recruitmentStage
            .filter((s) => s.pipelineId === row.id)
            .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
    }
    if (include.currentStage) {
        out.currentStage = row.currentStageId
            ? db.recruitmentStage.find((s) => s.id === row.currentStageId) ?? null
            : null;
    }
    if (include.user) {
        out.user = db.user.find((u) => u.id === row.userId) ?? null;
    }
    if (include.opportunity) {
        out.opportunity = db.opportunity.find((o) => o.id === row.opportunityId) ?? null;
    }
    return out;
}

/** Applies Prisma's `skip`/`take` window, which the service relies on for paging. */
function applyWindow<T>(rows: T[], args: Args): T[] {
    const skip = Number(args.skip ?? 0);
    const take = args.take === undefined ? undefined : Number(args.take);
    const sliced = rows.slice(skip);
    return take === undefined ? sliced : sliced.slice(0, take);
}

function buildModel(name: ModelName): MockModel {
    const rows = db[name];
    return {
        findMany: vi.fn(async (args: Args = {}) =>
            applyWindow(
                rows.filter((r) => matches(r, args.where)).sort((a, b) => compare(a, b, args.orderBy)),
                args
            ).map((r) => hydrate(r, args))
        ),
        findFirst: vi.fn(async (args: Args = {}) => {
            const found = rows
                .filter((r) => matches(r, args.where))
                .sort((a, b) => compare(a, b, args.orderBy))[0];
            return hydrate(found ?? null, args);
        }),
        findUnique: vi.fn(async (args: Args = {}) =>
            hydrate(rows.find((r) => matches(r, args.where)) ?? null, args)
        ),
        findUniqueOrThrow: vi.fn(async (args: Args = {}) => {
            const row = rows.find((r) => matches(r, args.where));
            if (!row) throw new Error(`MockModel ${name}: no row for ${JSON.stringify(args.where)}`);
            return row;
        }),
        count: vi.fn(async (args: Args = {}) => rows.filter((r) => matches(r, args.where)).length),
        create: vi.fn(async (args: Args) => {
            const data = (args.data ?? {}) as Row;
            // Nested writes. The service creates stages through
            // `hiringPipeline.create({ data: { stages: { create: [...] } } })`
            // rather than a second top-level call, so a mock that ignores the
            // nested key leaves the pipeline with no stages at all. Resolving it
            // here keeps the test asserting on real rows.
            const { stages, ...columns } = data as Row & { stages?: { create: Row[] } };
            const row: Row = { id: nextId(name), ...columns };
            rows.push(row);
            if (stages && typeof stages === 'object') {
                for (const spec of stages.create ?? []) {
                    db.recruitmentStage.push({
                        id: nextId('recruitmentStage'),
                        pipelineId: row.id,
                        ...spec,
                    });
                }
            }
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
        // Upsert keyed on the composite unique ([userId, opportunityId]) — what
        // makes candidate application creation idempotent.
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
    // Supports both Prisma transaction shapes: interactive `fn(tx)` and the
    // batched `[op, op]` form, so either implementation style still works.
    // The batched form MUST be awaited through Promise.all — returning the array
    // hands the caller an array of pending promises, so destructuring it yields
    // promises where results are expected.
    $transaction: vi.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
            return (arg as (tx: PrismaMock) => unknown)(prismaMock);
        }
        return Promise.all(arg as unknown[]);
    }),
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
// Fixtures — rebuilt from scratch in every beforeEach, never shared
// ---------------------------------------------------------------------------

interface Column {
    stage: Row;
    applications: Row[];
}

interface PipelineServiceShape {
    DEFAULT_PIPELINE_NAME: string;
    DEFAULT_STAGES: ReadonlyArray<{ kind: string; name: string; expectedDays: number | null }>;
    ensurePlatformTemplate: () => Promise<Row>;
    getPlatformTemplate: () => Promise<Row | null>;
    listForOrganization: (organizationId: string) => Promise<Row[]>;
    getById: (pipelineId: string) => Promise<Row | null>;
    getForOpportunity: (opportunityId: string) => Promise<Row | null>;
    createForOrganization: (
        organizationId: string,
        data: {
            name: string;
            isDefault?: boolean;
            stages: Array<{ kind: string; name: string; expectedDays?: number | null }>;
        },
    ) => Promise<Row>;
    updatePipeline: (pipelineId: string, data: { name?: string; isDefault?: boolean }) => Promise<Row>;
    deletePipeline: (pipelineId: string) => Promise<unknown>;
    reorderStages: (pipelineId: string, stageIds: string[]) => Promise<unknown>;
    addStage: (pipelineId: string, data: { kind: string; name: string; expectedDays?: number | null }) => Promise<Row>;
    updateStage: (stageId: string, data: { name?: string; expectedDays?: number | null }) => Promise<Row>;
    deleteStage: (stageId: string) => Promise<unknown>;
    listApplications: (
        opportunityId: string,
        options?: { page?: number; limit?: number },
    ) => Promise<{ applications: Row[]; pagination: { page: number; limit: number; total: number; pages: number } }>;
    createApplication: (
        userId: string,
        opportunityId: string,
        data?: { pipelineId?: string; stageId?: string },
    ) => Promise<Row>;
    moveApplication: (userId: string, applicationId: string, data: { stageId: string; stage?: string }) => Promise<Row>;
    removeApplication: (userId: string, applicationId: string) => Promise<unknown>;
    boardForOpportunity: (opportunityId: string) => Promise<{ columns: Column[] }>;
    boardForPipeline: (pipelineId: string) => Promise<{ columns: Column[] }>;
}

let PipelineService: PipelineServiceShape;

const TEMPLATE_ID = 'pipeline-template';
const ORG_A = 'org-a';
const ORG_B = 'org-b';

function seedTemplatePipeline(): void {
    db.hiringPipeline.push({
        id: TEMPLATE_ID,
        organizationId: null,
        name: 'Standard Hiring Process',
        isDefault: false,
        isTemplate: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const stageRows: Array<[string, string, number]> = [
        ['stage-screen', RecruitmentStageKind.SCREENING, 1],
        ['stage-assess', RecruitmentStageKind.ASSESSMENT, 2],
        ['stage-interview', RecruitmentStageKind.INTERVIEW, 3],
        ['stage-offer', RecruitmentStageKind.OFFER, 4],
        ['stage-onboard', RecruitmentStageKind.ONBOARDING, 5],
    ];
    for (const [id, kind, order] of stageRows) {
        db.recruitmentStage.push({
            id,
            pipelineId: TEMPLATE_ID,
            kind,
            name: kind,
            order,
            expectedDays: null,
        });
    }
}

function seedOrgPipeline(id: string, organizationId: string, isDefault: boolean): void {
    db.hiringPipeline.push({
        id,
        organizationId,
        name: `Pipeline ${id}`,
        isDefault,
        isTemplate: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    db.recruitmentStage.push(
        {
            id: `${id}-s1`,
            pipelineId: id,
            kind: RecruitmentStageKind.SCREENING,
            name: 'Applied',
            order: 1,
            expectedDays: null,
        },
        {
            id: `${id}-s2`,
            pipelineId: id,
            kind: RecruitmentStageKind.INTERVIEW,
            name: 'Interview',
            order: 2,
            expectedDays: 3,
        },
    );
}

/** Resolves to the thrown AppError statusCode, or 0 if the call succeeded. */
async function statusOf(p: Promise<unknown>): Promise<number> {
    try {
        await p;
        return 0;
    } catch (err) {
        return (err as { statusCode?: number }).statusCode ?? 0;
    }
}

beforeEach(async () => {
    for (const name of MODELS) db[name].length = 0;
    seq = 0;
    for (const name of MODELS) {
        for (const fn of Object.values(prismaMock[name])) fn.mockClear();
    }
    prismaMock.$transaction.mockClear();
    prismaMock.$queryRaw.mockClear();

    if (!PipelineService) {
        const mod = await import('../infrastructure/services/pipeline.service');
        PipelineService = (mod as unknown as { PipelineService: PipelineServiceShape }).PipelineService;
    }
});

// ---------------------------------------------------------------------------
// 1. Platform template
// ---------------------------------------------------------------------------

describe('PipelineService.ensurePlatformTemplate', () => {
    it('is idempotent: the second call reuses the existing template and creates no second pipeline', async () => {
        seedTemplatePipeline();

        const first = await PipelineService.ensurePlatformTemplate();
        const second = await PipelineService.ensurePlatformTemplate();

        expect(first.id).toBe(TEMPLATE_ID);
        expect(second.id).toBe(TEMPLATE_ID);
        expect(db.hiringPipeline.filter((p) => p.isTemplate === true)).toHaveLength(1);
        expect(prismaMock.hiringPipeline.create).not.toHaveBeenCalled();
    });

    it('creates the template with ordered stages when none exists yet', async () => {
        const template = await PipelineService.ensurePlatformTemplate();

        expect(db.hiringPipeline.filter((p) => p.isTemplate === true)).toHaveLength(1);
        expect(template.organizationId).toBeNull();
        const stages = db.recruitmentStage.filter((s) => s.pipelineId === template.id);
        expect(stages.length).toBeGreaterThan(0);
        expect(stages.map((s) => s.order)).toEqual(stages.map((_s, i) => i + 1));
    });
});

// ---------------------------------------------------------------------------
// 2. createForOrganization validation
// ---------------------------------------------------------------------------

describe('PipelineService.createForOrganization validation', () => {
    it('rejects a missing or empty name with 400', async () => {
        const stages = [{ kind: RecruitmentStageKind.SCREENING, name: 'Applied' }];
        expect(await statusOf(PipelineService.createForOrganization(ORG_A, { name: '', stages }))).toBe(400);
        expect(await statusOf(PipelineService.createForOrganization(ORG_A, { name: '   ', stages }))).toBe(400);
    });

    it('rejects a zero-stage pipeline with 400', async () => {
        expect(await statusOf(PipelineService.createForOrganization(ORG_A, { name: 'Empty', stages: [] }))).toBe(400);
        expect(db.hiringPipeline).toHaveLength(0);
    });

    it('trims the name and persists stages ordered 1..N', async () => {
        const created = await PipelineService.createForOrganization(ORG_A, {
            name: '  Campus Hiring  ',
            stages: [
                { kind: RecruitmentStageKind.SCREENING, name: 'Applied' },
                { kind: RecruitmentStageKind.OFFER, name: 'Offer', expectedDays: 7 },
            ],
        });

        expect(created.organizationId).toBe(ORG_A);
        expect(String(created.name).trim()).toBe('Campus Hiring');
        expect(db.recruitmentStage.filter((s) => s.pipelineId === created.id).map((s) => s.order)).toEqual([1, 2]);
    });
});

// ---------------------------------------------------------------------------
// 3. isDefault clears the other org defaults
// ---------------------------------------------------------------------------

describe('PipelineService.createForOrganization default handling', () => {
    it('clears the other org defaults inside a transaction when isDefault is true', async () => {
        seedOrgPipeline('pipe-a', ORG_A, true);
        seedOrgPipeline('pipe-b', ORG_A, false);

        await PipelineService.createForOrganization(ORG_A, {
            name: 'New Default',
            isDefault: true,
            stages: [{ kind: RecruitmentStageKind.SCREENING, name: 'Applied' }],
        });

        expect(prismaMock.$transaction).toHaveBeenCalled();
        expect(db.hiringPipeline.find((p) => p.id === 'pipe-a')?.isDefault).toBe(false);
        // Exactly one default survives for the org, and it is the new pipeline.
        const defaults = db.hiringPipeline.filter((p) => p.organizationId === ORG_A && p.isDefault === true);
        expect(defaults).toHaveLength(1);
        expect(defaults[0].name).toBe('New Default');
    });

    it('leaves other defaults untouched when isDefault is not requested', async () => {
        seedOrgPipeline('pipe-a', ORG_A, true);

        await PipelineService.createForOrganization(ORG_A, {
            name: 'Secondary',
            stages: [{ kind: RecruitmentStageKind.SCREENING, name: 'Applied' }],
        });

        expect(db.hiringPipeline.find((p) => p.id === 'pipe-a')?.isDefault).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 4. The platform template is immutable
// ---------------------------------------------------------------------------

describe('PipelineService template protection', () => {
    it('refuses to update the platform template with 403', async () => {
        seedTemplatePipeline();
        expect(await statusOf(PipelineService.updatePipeline(TEMPLATE_ID, { name: 'Hijacked' }))).toBe(403);
    });

    it('refuses to delete the platform template with 403', async () => {
        seedTemplatePipeline();
        expect(await statusOf(PipelineService.deletePipeline(TEMPLATE_ID))).toBe(403);
        expect(db.hiringPipeline.find((p) => p.id === TEMPLATE_ID)).toBeDefined();
    });

    it('still allows updating and deleting an organization pipeline', async () => {
        seedOrgPipeline('pipe-a', ORG_A, false);

        const updated = await PipelineService.updatePipeline('pipe-a', { name: 'Renamed' });
        expect(updated.name).toBe('Renamed');

        await PipelineService.deletePipeline('pipe-a');
        expect(db.hiringPipeline.find((p) => p.id === 'pipe-a')).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// 5. deleteStage is blocked while applications reference the stage
// ---------------------------------------------------------------------------

describe('PipelineService.deleteStage', () => {
    it('refuses with 409 while applications are still on the stage', async () => {
        seedOrgPipeline('pipe-a', ORG_A, false);
        db.opportunityApplication.push({
            id: 'app-1',
            userId: 'user-1',
            opportunityId: 'opp-1',
            currentStageId: 'pipe-a-s1',
        });

        expect(await statusOf(PipelineService.deleteStage('pipe-a-s1'))).toBe(409);
        expect(db.recruitmentStage.find((s) => s.id === 'pipe-a-s1')).toBeDefined();
    });

    it('succeeds when no application references the stage', async () => {
        seedOrgPipeline('pipe-a', ORG_A, false);

        await PipelineService.deleteStage('pipe-a-s1');

        expect(db.recruitmentStage.find((s) => s.id === 'pipe-a-s1')).toBeUndefined();
        expect(db.recruitmentStage.find((s) => s.id === 'pipe-a-s2')).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// 6. reorderStages validates the id set before rewriting order
// ---------------------------------------------------------------------------

describe('PipelineService.reorderStages', () => {
    it('rejects with 400 when the submitted id set does not exactly match the pipeline stages', async () => {
        seedOrgPipeline('pipe-a', ORG_A, false);

        // One id short of the two real stages.
        expect(await statusOf(PipelineService.reorderStages('pipe-a', ['pipe-a-s1']))).toBe(400);
        // A stage belonging to a different pipeline.
        expect(await statusOf(PipelineService.reorderStages('pipe-a', ['pipe-a-s1', 'pipe-b-s2']))).toBe(400);

        // Orders are untouched by the rejected calls.
        expect(db.recruitmentStage.find((s) => s.id === 'pipe-a-s1')?.order).toBe(1);
        expect(db.recruitmentStage.find((s) => s.id === 'pipe-a-s2')?.order).toBe(2);
    });

    it('rewrites order 1..N when the id set matches exactly', async () => {
        seedOrgPipeline('pipe-a', ORG_A, false);

        await PipelineService.reorderStages('pipe-a', ['pipe-a-s2', 'pipe-a-s1']);

        expect(db.recruitmentStage.find((s) => s.id === 'pipe-a-s2')?.order).toBe(1);
        expect(db.recruitmentStage.find((s) => s.id === 'pipe-a-s1')?.order).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// 7-9. moveApplication
// ---------------------------------------------------------------------------

describe('PipelineService.moveApplication', () => {
    beforeEach(() => {
        seedOrgPipeline('pipe-a', ORG_A, false);
        seedOrgPipeline('pipe-b', ORG_B, false);
        db.opportunity.push({ id: 'opp-1', pipelineId: 'pipe-a', organizationId: ORG_A });
        db.opportunityApplication.push({
            id: 'app-1',
            userId: 'user-1',
            opportunityId: 'opp-1',
            currentStageId: 'pipe-a-s1',
            currentStageKind: RecruitmentStageKind.SCREENING,
            stage: ApplicationStage.IN_REVIEW,
        });
    });

    it('rejects with 400 when the target stage belongs to a different pipeline than the application opportunity', async () => {
        expect(await statusOf(PipelineService.moveApplication('app-1', { toStageId: 'pipe-b-s2' }))).toBe(400);
        expect(db.opportunityApplication.find((a) => a.id === 'app-1')?.currentStageId).toBe('pipe-a-s1');
    });

    it('denormalises currentStageKind and resets stageEnteredAt from the target stage', async () => {
        const before = Date.now();
        const moved = await PipelineService.moveApplication('app-1', { toStageId: 'pipe-a-s2' });
        const after = Date.now();

        expect(moved.currentStageId).toBe('pipe-a-s2');
        expect(moved.currentStageKind).toBe(RecruitmentStageKind.INTERVIEW);
        const entered = new Date(moved.stageEnteredAt as string).getTime();
        expect(entered).toBeGreaterThanOrEqual(before - 1000);
        expect(entered).toBeLessThanOrEqual(after + 1000);
    });

    it('derives the coarse stage from the stage kind when the caller omits it', async () => {
        const cases: Array<[string, string]> = [
            [RecruitmentStageKind.OFFER, ApplicationStage.OFFERED],
            [RecruitmentStageKind.ASSESSMENT, ApplicationStage.ASSESSMENT],
            [RecruitmentStageKind.INTERVIEW, ApplicationStage.INTERVIEW],
            [RecruitmentStageKind.SCREENING, ApplicationStage.IN_REVIEW],
            [RecruitmentStageKind.TRAINING, ApplicationStage.IN_REVIEW],
        ];
        cases.forEach(([kind], i) => {
            db.recruitmentStage.push({
                id: `kind-${kind}`,
                pipelineId: 'pipe-a',
                kind,
                name: kind,
                order: 10 + i,
                expectedDays: null,
            });
        });

        for (const [kind, expected] of cases) {
            const moved = await PipelineService.moveApplication('app-1', { toStageId: `kind-${kind}` });
            expect(moved.stage).toBe(expected);
            expect(moved.currentStageKind).toBe(kind);
        }
    });
});

// ---------------------------------------------------------------------------
// 10. createApplication is idempotent
// ---------------------------------------------------------------------------

describe('PipelineService.createApplication', () => {
    beforeEach(() => {
        seedOrgPipeline('pipe-a', ORG_A, false);
        db.opportunity.push({ id: 'opp-1', pipelineId: 'pipe-a', organizationId: ORG_A });
    });

    it('is idempotent via the [userId, opportunityId] upsert: a second call updates rather than creating', async () => {
        const first = await PipelineService.createApplication({ userId: 'user-1', opportunityId: 'opp-1' });
        const second = await PipelineService.createApplication({ userId: 'user-1', opportunityId: 'opp-1' });

        expect(first.id).toBe(second.id);
        expect(db.opportunityApplication).toHaveLength(1);
        expect(prismaMock.opportunityApplication.create).not.toHaveBeenCalled();
        expect(prismaMock.opportunityApplication.upsert).toHaveBeenCalledTimes(2);
    });

    it('keeps applications for different candidates separate', async () => {
        const a = await PipelineService.createApplication({ userId: 'user-1', opportunityId: 'opp-1' });
        const b = await PipelineService.createApplication({ userId: 'user-2', opportunityId: 'opp-1' });

        expect(a.id).not.toBe(b.id);
        expect(db.opportunityApplication).toHaveLength(2);
    });
});

// ---------------------------------------------------------------------------
// 11. listApplications clamps limit and reports pagination
// ---------------------------------------------------------------------------

describe('PipelineService.listApplications', () => {
    beforeEach(() => {
        seedOrgPipeline('pipe-a', ORG_A, false);
        db.opportunity.push({ id: 'opp-1', pipelineId: 'pipe-a', organizationId: ORG_A });
        for (let i = 0; i < 150; i += 1) {
            db.opportunityApplication.push({
                id: `app-${i}`,
                userId: `user-${i}`,
                opportunityId: 'opp-1',
                currentStageId: 'pipe-a-s1',
            });
        }
    });

    it('clamps limit into 1..100 and reports a consistent pagination block', async () => {
        const over = await PipelineService.listApplications('opp-1', { page: 1, limit: 5000 });
        expect(over.limit).toBe(100);
        expect(over.total).toBe(150);
        expect(over.pages).toBe(2);
        expect(over.items.length).toBeLessThanOrEqual(100);

        const zero = await PipelineService.listApplications('opp-1', { page: 1, limit: 0 });
        expect(zero.limit).toBe(1);

        const negative = await PipelineService.listApplications('opp-1', { page: 1, limit: -25 });
        expect(negative.limit).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// 12. getForOpportunity falls back to the platform template
// ---------------------------------------------------------------------------

describe('PipelineService.getForOpportunity', () => {
    it('falls back to the platform template when the opportunity has no pipelineId', async () => {
        seedTemplatePipeline();
        db.opportunity.push({ id: 'opp-bare', pipelineId: null });

        const resolved = await PipelineService.getForOpportunity('opp-bare');

        expect(resolved?.id).toBe(TEMPLATE_ID);
    });

    it('returns the opportunity pipeline when one is set', async () => {
        seedOrgPipeline('pipe-a', ORG_A, false);
        db.opportunity.push({ id: 'opp-1', pipelineId: 'pipe-a' });

        const resolved = await PipelineService.getForOpportunity('opp-1');

        expect(resolved?.id).toBe('pipe-a');
    });
});

// ---------------------------------------------------------------------------
// 13. boardForOpportunity groups applications into stage columns
// ---------------------------------------------------------------------------

describe('PipelineService.boardForOpportunity', () => {
    it('groups applications into per-stage columns', async () => {
        seedOrgPipeline('pipe-a', ORG_A, false);
        db.opportunity.push({ id: 'opp-1', pipelineId: 'pipe-a', organizationId: ORG_A });
        db.opportunityApplication.push(
            { id: 'app-1', userId: 'u1', opportunityId: 'opp-1', currentStageId: 'pipe-a-s1' },
            { id: 'app-2', userId: 'u2', opportunityId: 'opp-1', currentStageId: 'pipe-a-s1' },
            { id: 'app-3', userId: 'u3', opportunityId: 'opp-1', currentStageId: 'pipe-a-s2' },
        );

        const board = await PipelineService.boardForOpportunity('opp-1');

        const byStage = new Map(board.columns.map((c) => [String(c.stage.id), c.applications.map((a) => a.id)]));
        expect(byStage.get('pipe-a-s1')).toEqual(['app-1', 'app-2']);
        expect(byStage.get('pipe-a-s2')).toEqual(['app-3']);
    });
});
