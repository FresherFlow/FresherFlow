import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.REDIS_ENABLED = 'false';
// The sitemap step refuses to run against an empty or local origin. Set it so
// `refresh()` reaches the upload steps this test is about.
process.env.PUBLIC_FRONTEND_URL = 'https://fresherflow.in';

const uploadToR2 = vi.fn(async () => undefined);
const deleteFromR2 = vi.fn(async () => undefined);
const listR2Keys = vi.fn(async (prefix: string) => {
    if (prefix === 'jobs/') {
        return { keys: ['jobs/opp-1.json', 'jobs/stale.json'], truncated: false };
    }
    return { keys: [], truncated: false };
});

vi.mock('../infrastructure/services/platform/storage.service', () => ({
    StorageService: {
        getPublicRoot: () => '/tmp/ff-feed-refresh-test',
        ensureDirectoryExists: vi.fn(),
        writeLocalFile: vi.fn(),
        readLocalFile: vi.fn(() => null),
        fetchFromR2: vi.fn(async () => null),
        uploadToR2,
        deleteFromR2,
        listR2Keys,
    },
}));

vi.mock('../infrastructure/services/opportunity/webRevalidation.service', () => ({
    notifyWebFeedChanged: vi.fn(async () => undefined),
}));

vi.mock('../infrastructure/services/opportunity/feedGenerator.service', () => ({
    FeedGeneratorService: {
        loadCompanySlugMap: vi.fn(async () => undefined),
        // Run the operation the service passes in, like the real retry wrapper.
        withDbRetry: <T>(operation: () => Promise<T>) => operation(),
        getFeedSelectFields: () => ({}),
        mapFeedOpportunities: (rows: Record<string, unknown>[]) => rows,
        projectFeedIndex: (rows: Record<string, unknown>[]) => rows,
        slugify: (value: string) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        getCompanySlug: (name: string) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        generateStats: vi.fn(async () => ({ total: 1 })),
        generateTakenUsernames: vi.fn(async () => []),
        generateResourcesFeed: vi.fn(async () => ({ resources: [] })),
    },
}));

const governmentJob = {
    id: 'opp-1',
    slug: 'staff-nurse-opp-1',
    title: 'Staff Nurse',
    company: 'State Health Dept',
    companyWebsite: 'https://health.example.gov.in',
    sector: 'GOVERNMENT',
    status: 'PUBLISHED',
    deletedAt: null,
    expiredAt: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    postedAt: new Date(),
    updatedAt: new Date(),
    locations: ['Hyderabad'],
    requiredSkills: [],
    allowedPassoutYears: [],
};

vi.mock('../infrastructure/database/prisma', () => ({
    default: {
        opportunity: {
            findMany: vi.fn(async () => [governmentJob]),
        },
    },
}));

const uploadedKeys = () => uploadToR2.mock.calls.map((call) => call[0] as string);

describe('StaticFeedService.refresh — automatic publication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rebuilds the government feed on the default bootstrap target', async () => {
        const { StaticFeedService } = await import(
            '../infrastructure/services/opportunity/staticFeed.service'
        );

        // `bootstrap` is what every add/edit/remove schedules. A government
        // listing used to be missing from that target, so /govt kept serving
        // the previous snapshot until an operator pressed "Regenerate all".
        await StaticFeedService.refresh('bootstrap');

        expect(uploadedKeys()).toContain('feeds/government-feed.json');
        expect(uploadedKeys()).toContain('feeds/bootstrap-feed.min.json');
    });

    it('bumps the feed version only after every artifact has been uploaded', async () => {
        const { StaticFeedService } = await import(
            '../infrastructure/services/opportunity/staticFeed.service'
        );

        await StaticFeedService.refresh('bootstrap');

        const keys = uploadedKeys();
        // The version is the cache key for every `?v=` URL, so publishing it
        // before the objects it names makes clients request a new URL that
        // still holds the previous content, cached for an hour at the edge.
        expect(keys[keys.length - 1]).toBe('meta/feed-version.json');
        expect(keys.filter((key) => key === 'meta/feed-version.json')).toHaveLength(1);
    });

    it('collects the per-job shard of a listing that is no longer live', async () => {
        const { StaticFeedService } = await import(
            '../infrastructure/services/opportunity/staticFeed.service'
        );

        await StaticFeedService.refresh('bootstrap');

        // `jobs/stale.json` was on the bucket but is not in the live set, so a
        // deleted or archived job must stop resolving from the CDN.
        expect(deleteFromR2).toHaveBeenCalledWith('jobs/stale.json');
        expect(deleteFromR2).not.toHaveBeenCalledWith('jobs/opp-1.json');
    });
});
