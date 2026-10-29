import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * End-to-end write-path verification for the full-payload listing API.
 *
 * The failure this guards against is the one an agent actually hits: the tool
 * call returns 201 and the agent reports success, while fields were dropped,
 * coerced or silently skipped. These cases assert the exact object handed to
 * `opportunity.create` / `opportunity.update`, so "it stored the listing" is a
 * verified claim rather than an inference from a status code.
 */

// ─── DB boundary ─────────────────────────────────────────────────────────────
// `$transaction(fn)` runs `fn` against a tx whose `opportunity.create` records
// the write, so assertions read the real payload the service produced.

const h = vi.hoisted(() => {
    const createSpy = vi.fn();
    const updateSpy = vi.fn();
    const findFirstSpy = vi.fn();
    const findManySpy = vi.fn();
    const rawOpportunityFindUnique = vi.fn();
    return {
        createSpy,
        updateSpy,
        findFirstSpy,
        findManySpy,
        rawOpportunityFindUnique,
        tx: {
            opportunity: {
                create: async (args: { data: Record<string, unknown> }) => {
                    createSpy(args);
                    return { id: 'generated-id', slug: 'generated-slug', ...args.data };
                },
                update: async (args: { data: Record<string, unknown> }) => {
                    updateSpy(args);
                    return { id: 'generated-id', slug: 'generated-slug', status: 'DRAFT', ...args.data };
                },
            },
            driveDetails: { deleteMany: vi.fn() },
            governmentJobDetails: { deleteMany: vi.fn() },
            eventDetails: { deleteMany: vi.fn() },
            opportunityInstitution: { deleteMany: vi.fn(), createMany: vi.fn() },
            rawOpportunity: { update: vi.fn() },
        },
    };
});

const { createSpy, updateSpy, findFirstSpy, findManySpy, rawOpportunityFindUnique, tx } = h;

vi.mock('@fresherflow/database', async () => {
    const enums = await import('./helpers/dbEnums');
    const { Prisma } = await import('@prisma/client');
    return { ...enums, Prisma, prisma: {}, default: {} };
});

vi.mock('../infrastructure/database/prisma', () => ({
    default: {
        $transaction: async (fn: (t: typeof h.tx) => unknown) => fn(h.tx),
        opportunity: {
            findFirst: (args: unknown) => h.findFirstSpy(args),
            findMany: (args: unknown) => h.findManySpy(args),
        },
        rawOpportunity: { findUnique: (args: unknown) => h.rawOpportunityFindUnique(args) },
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

// The write path rebuilds the CDN feeds and tells the web app that its cached
// copies are stale. Those are background side effects with their own I/O, so
// they are stubbed here: this suite is about what the listing write stores.
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

import {
    createListing,
    updateListing,
    ListingWriteError,
} from '../application/opportunity/listingWrite';
import { Prisma } from '@fresherflow/database';

const FULL_JOB_PAYLOAD = {
    title: 'Software Engineer',
    company: 'Acme Corp',
    companyWebsite: 'https://acme.test',
    category: 'job',
    description: 'Build and maintain the Acme platform used by fresher teams.',
    allowedDegrees: ['DEGREE'],
    allowedCourses: ['B.Tech / B.E.'],
    allowedSpecializations: ['Computer Science'],
    allowedPassoutYears: [2025, 2026],
    requiredSkills: ['react', 'node.js'],
    locations: ['Bengaluru'],
    workMode: 'HYBRID',
    salaryRange: '6-8 LPA',
    salaryPeriod: 'YEARLY',
    employmentTypes: 'FULL_TIME, INTERNSHIP',
    jobFunction: 'Engineering',
    selectionProcess: 'Online Assessment > Technical Interview > HR',
    notesHighlights: 'Immediate joiners preferred.',
    experienceMin: 0,
    experienceMax: 2,
    applyLink: 'https://acme.test/careers/swe',
    sourceLink: 'https://boards.test/acme/swe',
    sector: 'PRIVATE',
};

/** The `data` object handed to Prisma on the last create. */
function written() {
    return createSpy.mock.calls.at(-1)?.[0]?.data as Record<string, unknown>;
}

beforeEach(() => {
    vi.clearAllMocks();
    findManySpy.mockResolvedValue([]);
    findFirstSpy.mockResolvedValue(null);
    rawOpportunityFindUnique.mockResolvedValue(null);
});

describe('createListing stores a complete job payload', () => {
    it('persists every extracted field, not just the required ones', async () => {
        await createListing(FULL_JOB_PAYLOAD, { status: 'DRAFT', onDuplicate: 'reject' });

        const data = written();
        expect(data.title).toBe('Software Engineer');
        expect(data.company).toBe('Acme Corp');
        expect(data.description).toContain('Acme platform');
        expect(data.allowedDegrees).toEqual(['DEGREE']);
        expect(data.allowedCourses).toEqual(['B.Tech / B.E.']);
        expect(data.allowedSpecializations).toEqual(['Computer Science']);
        expect(data.allowedPassoutYears).toEqual([2025, 2026]);
        expect(data.locations).toEqual(['Bengaluru']);
        expect(data.workMode).toBe('HYBRID');
        expect(data.salaryRange).toBe('6-8 LPA');
        expect(data.salaryPeriod).toBe('YEARLY');
        expect(data.jobFunction).toBe('Engineering');
        expect(data.selectionProcess).toContain('Technical Interview');
        expect(data.notesHighlights).toBe('Immediate joiners preferred.');
        expect(data.experienceMin).toBe(0);
        expect(data.experienceMax).toBe(2);
        // Mirrored: the API copies sourceLink into applyLink so search and
        // detail pages always have something to link to.
        expect(data.applyLink).toBe('https://acme.test/careers/swe');
        expect(data.sourceLink).toBe('https://boards.test/acme/swe');
    });

    it('normalises skills and splits the employmentTypes CSV into enum values', async () => {
        await createListing(FULL_JOB_PAYLOAD, { status: 'DRAFT', onDuplicate: 'reject' });

        const data = written();
        expect(data.requiredSkills).toContain('react');
        expect(data.requiredSkills).toContain('node.js');
        expect(data.employmentTypes).toEqual(['FULL_TIME', 'INTERNSHIP']);
    });

    it('derives a company logo when the payload has none', async () => {
        await createListing(FULL_JOB_PAYLOAD, { status: 'DRAFT', onDuplicate: 'reject' });
        expect(written().companyLogoUrl).toBeTruthy();
    });

    it('defaults to a draft so an unattended agent cannot publish by omission', async () => {
        await createListing(FULL_JOB_PAYLOAD, { status: 'DRAFT', onDuplicate: 'reject' });
        expect(written().status).toBe('DRAFT');
    });

    it('publishes only when asked explicitly', async () => {
        await createListing(FULL_JOB_PAYLOAD, { status: 'PUBLISHED', onDuplicate: 'reject' });
        expect(written().status).toBe('PUBLISHED');
    });

    it('sets an explicit JSON null as Prisma.DbNull rather than a bare null', async () => {
        await createListing(
            { ...FULL_JOB_PAYLOAD, applicationDetails: null },
            { status: 'DRAFT', onDuplicate: 'reject' },
        );
        // A bare `null` against a Json column throws at runtime and 500s; the
        // sentinel is what makes an explicit clear actually work.
        expect(written().applicationDetails).toBe(Prisma.DbNull);
        expect(written().applicationDetails).not.toBeNull();
    });

    it('rejects a non-walk-in listing with no application link', async () => {
        const { applyLink, sourceLink, ...noLinks } = FULL_JOB_PAYLOAD;
        await expect(
            createListing(noLinks, { status: 'DRAFT', onDuplicate: 'reject' }),
        ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
        expect(createSpy).not.toHaveBeenCalled();
    });
});

describe('walk-in drives', () => {
    const WALK_IN_PAYLOAD = {
        ...FULL_JOB_PAYLOAD,
        category: 'walk-in',
        employmentTypes: 'FULL_TIME',
        applyLink: undefined,
        sourceLink: undefined,
        driveDetails: {
            dateRange: '9 Feb - 13 Feb',
            timeRange: '9:30 AM - 12:30 PM',
            reportingTime: '9:30 AM',
            venueAddress: 'Whitefield, Bengaluru 560066',
            city: 'Bengaluru',
            clusterName: 'Whitefield',
            latitude: 12.9698,
            longitude: 77.75,
            requiredDocuments: ['Updated Resume', 'PAN card'],
        },
    };

    it('creates driveDetails and switches the recruitment method', async () => {
        await createListing(WALK_IN_PAYLOAD, { status: 'PUBLISHED', onDuplicate: 'reject' });

        const data = written();
        expect(data.recruitmentMethod).toBe('WALK_IN');
        const drive = data.driveDetails as { create: Record<string, unknown> };
        expect(drive.create.venueAddress).toBe('Whitefield, Bengaluru 560066');
        expect(drive.create.city).toBe('Bengaluru');
        expect(drive.create.dateRange).toBe('9 Feb - 13 Feb');
        expect(drive.create.requiredDocuments).toEqual(['Updated Resume', 'PAN card']);
    });

    it('does not require an apply link for a drive', async () => {
        await expect(
            createListing(WALK_IN_PAYLOAD, { status: 'PUBLISHED', onDuplicate: 'reject' }),
        ).resolves.toBeDefined();
    });
});

describe('government vacancies', () => {
    const GOVT_PAYLOAD = {
        ...FULL_JOB_PAYLOAD,
        sector: 'GOVERNMENT',
        governmentJobDetails: {
            department: 'Staff Selection Commission',
            advertisementNumber: 'CGL-2026-001',
            postName: 'Assistant Section Officer',
            vacancyCount: 12256,
            applicationStartDate: '2026-08-01',
            applicationEndDate: '2026-08-20',
            officialNotificationUrl: 'https://ssc.gov.in/notice.pdf',
        },
    };

    it('stores the government details block that creates the govt record', async () => {
        await createListing(GOVT_PAYLOAD, { status: 'PUBLISHED', onDuplicate: 'reject' });

        const data = written();
        const govt = data.governmentJobDetails as {
            create: Record<string, unknown> & { importantDates: Record<string, unknown> };
        };
        expect(govt.create.advertisementNumber).toBe('CGL-2026-001');
        expect(govt.create.vacancyCount).toBe(12256);
        // The schema nests these under importantDates, not as top-level columns.
        expect(govt.create.importantDates.applicationStartDate).toBe('2026-08-01');
        expect(govt.create.importantDates.applicationEndDate).toBe('2026-08-20');
    });
});

describe('duplicate handling', () => {
    const duplicate = {
        id: 'existing-id',
        slug: 'existing-slug',
        status: 'PUBLISHED',
        title: 'Software Engineer',
    };

    it('refuses to overwrite a live listing', async () => {
        findFirstSpy.mockResolvedValue(duplicate);

        await expect(
            createListing(FULL_JOB_PAYLOAD, { status: 'DRAFT', onDuplicate: 'update-existing' }),
        ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
        expect(createSpy).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
    });

    it('routes a repeat submit into the pending draft instead of creating a second row', async () => {
        findFirstSpy.mockResolvedValue({ ...duplicate, status: 'DRAFT' });

        const result = await createListing(FULL_JOB_PAYLOAD, {
            status: 'DRAFT',
            onDuplicate: 'update-existing',
        });

        expect(result.updatedExisting).toBe(true);
        expect(createSpy).not.toHaveBeenCalled();
        expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects any duplicate when the caller asks for strict mode', async () => {
        findFirstSpy.mockResolvedValue({ ...duplicate, status: 'DRAFT' });

        await expect(
            createListing(FULL_JOB_PAYLOAD, { status: 'DRAFT', onDuplicate: 'reject' }),
        ).rejects.toMatchObject({ status: 409 });
    });
});

describe('updateListing', () => {
    beforeEach(() => {
        findFirstSpy.mockResolvedValue({
            id: 'existing-id',
            slug: 'existing-slug',
            status: 'DRAFT',
            title: 'Old Title',
            company: 'Old Company',
            governmentJobDetails: null,
            driveDetails: null,
        });
    });

    it('applies the new payload and reports that it became published', async () => {
        const result = await updateListing('existing-slug', {
            ...FULL_JOB_PAYLOAD,
            status: 'PUBLISHED',
        });

        expect(result.becamePublished).toBe(true);
        const data = updateSpy.mock.calls.at(-1)?.[0]?.data as Record<string, unknown>;
        expect(data.title).toBe('Software Engineer');
        expect(data.status).toBe('PUBLISHED');
        expect(data.lastVerified).toBeInstanceOf(Date);
    });

    it('rejects EXPIRED with a 400 instead of letting Prisma throw a 500', async () => {
        await expect(
            updateListing('existing-id', { ...FULL_JOB_PAYLOAD, status: 'EXPIRED' }),
        ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
        expect(updateSpy).not.toHaveBeenCalled();
    });

    it('404s for an unknown listing rather than creating one', async () => {
        findFirstSpy.mockResolvedValue(null);
        await expect(
            updateListing('does-not-exist', FULL_JOB_PAYLOAD),
        ).rejects.toBeInstanceOf(ListingWriteError);
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('leaves the slug alone when the title and company did not change', async () => {
        findFirstSpy.mockResolvedValue({
            id: 'existing-id',
            slug: 'existing-slug',
            status: 'PUBLISHED',
            title: 'Software Engineer',
            company: 'Acme Corp',
            governmentJobDetails: null,
            driveDetails: null,
        });

        await updateListing('existing-slug', { ...FULL_JOB_PAYLOAD, status: 'PUBLISHED' });

        const data = updateSpy.mock.calls.at(-1)?.[0]?.data as Record<string, unknown>;
        expect(data.slug).toBeUndefined();
    });

    it('rebuilds the feed and announces the change when a live listing is edited', async () => {
        findFirstSpy.mockResolvedValue({
            id: 'existing-id',
            slug: 'existing-slug',
            status: 'PUBLISHED',
            title: 'Old Title',
            company: 'Old Company',
            governmentJobDetails: null,
            driveDetails: null,
        });

        await updateListing('existing-slug', { ...FULL_JOB_PAYLOAD, status: 'PUBLISHED' });

        // An edit of a live listing used to invalidate cached copies of a feed
        // that still described the OLD listing, and never rebuilt the feed, so
        // the edit stayed invisible on /jobs until an operator pressed
        // "Refresh cache".
        const { scheduleDiscoveryFeedRefresh } = await import(
            '../infrastructure/services/opportunity/feedRefresh'
        );
        const { notifyWebFeedChanged } = await import(
            '../infrastructure/services/opportunity/webRevalidation.service'
        );
        expect(scheduleDiscoveryFeedRefresh).toHaveBeenCalled();
        expect(notifyWebFeedChanged).toHaveBeenCalled();
    });

    it('rebuilds the feed when a live listing is edited out of the live set', async () => {
        findFirstSpy.mockResolvedValue({
            id: 'existing-id',
            slug: 'existing-slug',
            status: 'PUBLISHED',
            title: 'Old Title',
            company: 'Old Company',
            governmentJobDetails: null,
            driveDetails: null,
        });

        await updateListing('existing-slug', { ...FULL_JOB_PAYLOAD, status: 'DRAFT' });

        // A published listing moved back to DRAFT is a removal: the feed still
        // listed it and its shard stayed on the CDN, so it remained reachable
        // at /jobs/<slug> until an operator pressed "Regenerate all".
        const { refreshFeedsAndAnnounce } = await import(
            '../infrastructure/services/opportunity/feedRefresh'
        );
        expect(refreshFeedsAndAnnounce).toHaveBeenCalled();
    });
});