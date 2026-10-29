import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The promote gate.
 *
 * The failure this guards against is publishing the legacy backlog as-is: 210
 * of the 215 DRAFT rows in the legacy ingestion database are `WALKIN` rows
 * whose venue, reporting time, document checklist and dates were synthesised
 * by the walk-in extractor. Every one of them claims "Hyderabad, 10:00 AM -
 * 1:00 PM" for what is really a Chandigarh internship.
 *
 * The rules under test:
 *   - only a first-party ATS host may go live without a human,
 *   - a drive additionally needs a real date, a real venue and a real
 *     contact,
 *   - a second run must not publish anything twice.
 */

// ─── Legacy ingestion database ───────────────────────────────────────────────
// The promote step reads candidates from the legacy ingestion pool. The rows
// below are the shapes the gate has to judge.

const h = vi.hoisted(() => {
    const createSpy = vi.fn();
    const findFirstSpy = vi.fn();
    const poolQuerySpy = vi.fn();
    const published: Array<Record<string, unknown>> = [];

    return {
        createSpy,
        findFirstSpy,
        poolQuerySpy,
        published,
        tx: {
            opportunity: {
                create: async (args: { data: Record<string, unknown> }) => {
                    createSpy(args);
                    const row = { id: `op-${published.length + 1}`, status: 'PUBLISHED', ...args.data };
                    published.push(row);
                    return row;
                },
                update: async (args: { data: Record<string, unknown> }) => ({
                    id: 'generated-id',
                    slug: 'generated-slug',
                    status: 'DRAFT',
                    ...args.data,
                }),
            },
            driveDetails: { deleteMany: vi.fn() },
            governmentJobDetails: { deleteMany: vi.fn() },
            eventDetails: { deleteMany: vi.fn() },
            opportunityInstitution: { deleteMany: vi.fn(), createMany: vi.fn() },
            rawOpportunity: { update: vi.fn() },
        },
    };
});

const { createSpy, findFirstSpy, poolQuerySpy, published, tx } = h;

vi.mock('@fresherflow/pipeline/db/pool', () => ({
    pool: { query: (sql: string, params?: unknown[]) => poolQuerySpy(sql, params) },
    hasDb: true,
}));

vi.mock('@fresherflow/database', async () => {
    const enums = await import('./helpers/dbEnums');
    const { Prisma } = await import('@prisma/client');
    return { ...enums, Prisma, prisma: {}, default: {} };
});

vi.mock('../infrastructure/database/prisma', () => ({
    default: {
        $transaction: async (fn: (t: typeof h.tx) => unknown) => fn(h.tx),
        opportunity: {
            // Both the promote step's own duplicate lookup and the write
            // path's duplicate lookup go through here, so the two agree.
            findFirst: (args: unknown) => findFirstSpy(args),
            findMany: async () => [],
        },
        rawOpportunity: { findUnique: async () => null },
    },
    OpportunityStatus: { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', ARCHIVED: 'ARCHIVED' },
}));

vi.mock('../infrastructure/services/alerts/notification.service', () => ({
    sendNewJobAlerts: async () => ({}),
}));

vi.mock('../infrastructure/services/opportunity/publish.service', () => ({
    handleOpportunityPublished: vi.fn(async () => undefined),
    getGranularTagsForOpportunity: () => [],
}));

vi.mock('../infrastructure/services/opportunity/feedRefresh', () => ({
    scheduleDiscoveryFeedRefresh: vi.fn(async () => undefined),
    refreshFeedsAndAnnounce: vi.fn(async () => undefined),
}));

vi.mock('../infrastructure/services/opportunity/staticFeed.service', () => ({
    StaticFeedService: { uploadSingleJob: vi.fn(async () => undefined) },
}));

vi.mock('../infrastructure/services/opportunity/webRevalidation.service', () => ({
    notifyWebFeedChanged: vi.fn(async () => undefined),
}));

vi.mock('../infrastructure/services/opportunity/publicOpportunityCache.service', () => ({
    invalidatePublicOpportunityCache: vi.fn(async () => undefined),
}));

vi.mock('../infrastructure/cache/adminCache', () => ({
    adminCache: { invalidate: vi.fn(), invalidateLists: vi.fn() },
}));

import { runPromote } from '../application/ingestion/promote';

const RECENT = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
const OLD = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

function processedRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'p-1',
        title: 'Backend Engineer',
        company: 'Acme Corp',
        description: 'Build and maintain the Acme platform used by fresher teams.',
        type: 'JOB',
        apply_link: 'https://boards.greenhouse.io/acme/jobs/1',
        source_url: 'https://acme.test/careers',
        company_website: 'https://acme.test',
        company_logo_url: null,
        locations: ['Bengaluru'],
        structured_locations: null,
        required_skills: ['node'],
        allowed_degrees: ['DEGREE'],
        allowed_courses: [],
        allowed_specializations: [],
        allowed_passout_years: [2026],
        work_mode: 'HYBRID',
        experience_min: 0,
        experience_max: 2,
        salary_range: '6-8 LPA',
        salary_period: 'YEARLY',
        employment_type: 'Full Time',
        job_function: 'Engineering',
        incentives: null,
        selection_process: null,
        notes_highlights: null,
        application_details: null,
        walk_in_details: null,
        updated_at: RECENT,
        created_at: RECENT,
        ...overrides,
    };
}

/** A row shaped exactly like the 210 fabricated legacy walk-in drafts. */
function syntheticWalkinRow(overrides: Record<string, unknown> = {}) {
    return processedRow({
        id: 'p-walkin',
        title: 'Business Development - B2B Sales (Chandigarh) Internship in Chandigarh',
        company: 'Zopper',
        description: 'An ordinary internship posting that was filed as a walk-in drive.',
        type: 'WALKIN',
        apply_link: 'https://jobs.lever.co/zopper/bd-sales',
        source_url: 'https://www.internshala.com/internships/bd-sales',
        locations: ['Hyderabad'],
        walk_in_details: {
            dates: [],
            dateRange: 'Active Walk-in',
            timeRange: '10:00 AM - 1:00 PM',
            reportingTime: '9:30 AM',
            venueAddress: 'Hyderabad',
            contactPerson: '',
            contactPhone: '',
            requiredDocuments: [
                'Updated Resume (2 Copies)',
                'Government Photo ID (Aadhaar / PAN / Passport)',
                'Passport Size Photographs (2)',
                'Academic Marksheets / Degree Certificates',
            ],
        },
        ...overrides,
    });
}

/** A genuine drive: a stated date, a real address, a real contact. */
function realWalkinRow(overrides: Record<string, unknown> = {}) {
    return processedRow({
        id: 'p-drive',
        title: 'Walk-in Interview - Software Engineer',
        company: 'Acme Corp',
        description: 'Acme Corp is conducting a walk-in interview for freshers on 2nd November.',
        type: 'WALKIN',
        apply_link: 'https://jobs.lever.co/acme/walkin-swe',
        source_url: 'https://acme.test/careers/walkin',
        locations: ['Hyderabad'],
        walk_in_details: {
            dates: [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
            dateRange: '2nd Nov - 6th Nov',
            timeRange: '10:00 AM - 1:00 PM',
            reportingTime: '10:00 AM',
            venueAddress: 'Building 4, Gachibowli, Hyderabad',
            contactPerson: 'Anitha Rao',
            contactPhone: '+91 98765 43210',
            requiredDocuments: ['Updated Resume'],
        },
        ...overrides,
    });
}

/** Feed the legacy pool with the given processed_jobs rows. */
function withProcessedRows(rows: Array<Record<string, unknown>>) {
    poolQuerySpy.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM processed_jobs')) {
            return { rows, rowCount: rows.length };
        }
        return { rows: [], rowCount: 0 };
    });
}

/** The duplicate lookup: find a published row whose link matches. */
function findFirstSpyImpl(args: unknown) {
    const where = (args as { where?: { OR?: Array<Record<string, string>> } }).where;
    const filters = where?.OR ?? [];
    for (const row of published) {
        const applyLink = row.applyLink as string | undefined;
        const sourceLink = row.sourceLink as string | undefined;
        for (const filter of filters) {
            if (filter.applyLink && (applyLink === filter.applyLink || sourceLink === filter.applyLink)) {
                return { id: row.id as string, slug: 'slug', status: 'PUBLISHED' };
            }
            if (filter.sourceLink && (sourceLink === filter.sourceLink || applyLink === filter.sourceLink)) {
                return { id: row.id as string, slug: 'slug', status: 'PUBLISHED' };
            }
        }
    }
    return null;
}

beforeEach(() => {
    vi.clearAllMocks();
    published.length = 0;
    findFirstSpy.mockImplementation(findFirstSpyImpl);
    withProcessedRows([]);
});

describe('the promote trust gate', () => {
    it('publishes a listing whose apply link is on a first-party ATS host', async () => {
        withProcessedRows([processedRow()]);

        const report = await runPromote();

        expect(report.published).toBe(1);
        expect(report.held).toBe(0);
        expect(createSpy).toHaveBeenCalledTimes(1);
        const data = createSpy.mock.calls.at(-1)?.[0]?.data as Record<string, unknown>;
        expect(data.status).toBe('PUBLISHED');
        expect(data.title).toBe('Backend Engineer');
    });

    it('holds a listing whose apply link is on an aggregator host', async () => {
        // The aggregator is not the employer. Publishing it copies somebody
        // else's copy of somebody else's listing.
        withProcessedRows([processedRow({
            id: 'p-untrusted',
            apply_link: 'https://www.internshala.com/job/software-engineer-12345',
            source_url: 'https://www.internshala.com/job/software-engineer-12345',
        })]);

        const report = await runPromote();

        expect(report.published).toBe(0);
        expect(report.held).toBe(1);
        expect(report.holds[0].reason).toBe('untrusted-host');
        expect(report.holds[0].hostname).toBe('www.internshala.com');
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('holds a listing whose apply link only looks like a trusted host', async () => {
        // `evil.com/?x=lever.co` must not pass a substring check.
        withProcessedRows([processedRow({
            id: 'p-spoof',
            apply_link: 'https://evil.com/?x=lever.co',
            source_url: 'https://evil.com/?x=lever.co',
        })]);

        const report = await runPromote();

        expect(report.published).toBe(0);
        expect(report.holds[0].reason).toBe('untrusted-host');
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('holds a stale row instead of filling the board with archaeology', async () => {
        withProcessedRows([processedRow({ updated_at: OLD, created_at: OLD })]);

        const report = await runPromote();

        expect(report.published).toBe(0);
        expect(report.holds[0].reason).toBe('stale');
        expect(createSpy).not.toHaveBeenCalled();
    });
});

describe('the promote walk-in gate', () => {
    it('holds a synthetic walk-in row even on a trusted host', async () => {
        // The 210-row case: a real ATS link, but the drive fields were
        // invented — no date, a bare city as the venue, no contact.
        withProcessedRows([syntheticWalkinRow()]);

        const report = await runPromote();

        expect(report.published).toBe(0);
        expect(report.held).toBe(1);
        expect(report.holds[0].reason).toBe('drive-without-date');
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('holds a synthetic walk-in row whose date came from the fallback expiry', async () => {
        // `parseWalkInDetails` invents "now + 3 days" and labels the drive
        // "Active Walk-in". A row carrying only that fallback is not dated.
        withProcessedRows([syntheticWalkinRow({
            walk_in_details: {
                dates: [new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()],
                dateRange: 'Active Walk-in',
                timeRange: '10:00 AM - 1:00 PM',
                reportingTime: '9:30 AM',
                venueAddress: 'Hyderabad',
                contactPerson: '',
                contactPhone: '',
                requiredDocuments: ['Updated Resume'],
            },
        })]);

        const report = await runPromote();

        expect(report.published).toBe(0);
        expect(report.holds[0].reason).toBe('drive-without-date');
    });

    it('holds a drive whose venue is a bare city name', async () => {
        withProcessedRows([realWalkinRow({
            walk_in_details: {
                dates: [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
                dateRange: '2nd Nov - 6th Nov',
                timeRange: '10:00 AM - 1:00 PM',
                reportingTime: '10:00 AM',
                venueAddress: 'Hyderabad',
                contactPerson: 'Anitha Rao',
                contactPhone: '+91 98765 43210',
                requiredDocuments: ['Updated Resume'],
            },
        })]);

        const report = await runPromote();

        expect(report.published).toBe(0);
        expect(report.holds[0].reason).toBe('drive-without-venue');
    });

    it('holds a drive with no way to be contacted', async () => {
        withProcessedRows([realWalkinRow({
            walk_in_details: {
                dates: [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
                dateRange: '2nd Nov - 6th Nov',
                timeRange: '10:00 AM - 1:00 PM',
                reportingTime: '10:00 AM',
                venueAddress: 'Building 4, Gachibowli, Hyderabad',
                contactPerson: '',
                contactPhone: '',
                requiredDocuments: ['Updated Resume'],
            },
        })]);

        const report = await runPromote();

        expect(report.published).toBe(0);
        expect(report.holds[0].reason).toBe('drive-without-contact');
    });

    it('publishes a drive that has a real date, a real venue and a real contact', async () => {
        withProcessedRows([realWalkinRow()]);

        const report = await runPromote();

        expect(report.published).toBe(1);
        expect(report.held).toBe(0);
        expect(createSpy).toHaveBeenCalledTimes(1);
        const data = createSpy.mock.calls.at(-1)?.[0]?.data as Record<string, unknown>;
        expect(data.recruitmentMethod).toBe('WALK_IN');
        const drive = data.driveDetails as { create: Record<string, unknown> };
        expect(drive.create.venueAddress).toBe('Building 4, Gachibowli, Hyderabad');
        expect(drive.create.contactPhone).toBe('+91 98765 43210');
    });
});

describe('the promote step is idempotent', () => {
    it('publishes once and reports the second run as already published', async () => {
        withProcessedRows([processedRow()]);

        const first = await runPromote();
        expect(first.published).toBe(1);
        expect(first.alreadyPublished).toBe(0);

        const second = await runPromote();

        expect(second.published).toBe(0);
        expect(second.alreadyPublished).toBe(1);
        expect(second.held).toBe(0);
        // One listing, not two.
        expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('holds a listing a human already staged as a draft', async () => {
        withProcessedRows([processedRow()]);
        findFirstSpy.mockResolvedValue({
            id: 'human-draft',
            slug: 'human-draft',
            status: 'DRAFT',
        });

        const report = await runPromote();

        expect(report.published).toBe(0);
        expect(report.held).toBe(1);
        expect(report.holds[0].reason).toBe('existing-draft');
        expect(createSpy).not.toHaveBeenCalled();
    });
});
