import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.REDIS_ENABLED = 'false';

const uploadToR2 = vi.fn(async () => undefined);

// R2 and the DB are the only things replaced: the class under test is the real
// StaticFeedService, because the behaviour being pinned (which files it writes)
// lives in it.
vi.mock('../infrastructure/services/platform/storage.service', () => ({
    StorageService: {
        getPublicRoot: () => '/tmp/ff-feed-test',
        ensureDirectoryExists: vi.fn(),
        writeLocalFile: vi.fn(),
        uploadToR2,
    },
}));

vi.mock('../infrastructure/services/opportunity/feedGenerator.service', () => ({
    FeedGeneratorService: {
        loadCompanySlugMap: vi.fn(async () => undefined),
        mapFeedOpportunities: (rows: unknown[]) => rows,
        getFeedSelectFields: () => ({}),
    },
}));

vi.mock('../infrastructure/database/prisma', () => ({ default: {} }));

const uploadedKeys = () => uploadToR2.mock.calls.map((call) => call[0] as string);

describe('StaticFeedService version cache-buster', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('bumps the feed version when it uploads a single job shard', async () => {
        const { StaticFeedService } = await import('../infrastructure/services/opportunity/staticFeed.service');

        await StaticFeedService.uploadSingleJob({ id: 'opp-1', title: 'Engineer', company: 'Acme' });

        expect(uploadedKeys()).toContain('jobs/opp-1.json');
        // The web app requests jobs/<id>.json?v=<version>, and the edge answers
        // that URL from cache. Writing the shard without moving the version left
        // a published job invisible no matter how many caches were busted, which
        // is the defect this test exists to prevent from returning.
        expect(uploadedKeys()).toContain('meta/feed-version.json');
    });

    it('leaves the version to a refresh that is already scheduled', async () => {
        vi.useFakeTimers();
        const { StaticFeedService } = await import('../infrastructure/services/opportunity/staticFeed.service');
        const refreshSpy = vi.spyOn(StaticFeedService, 'refresh').mockResolvedValue(undefined);

        StaticFeedService.scheduleRefresh();
        await StaticFeedService.uploadSingleJob({ id: 'opp-2', title: 'Engineer', company: 'Acme' });

        // One bump per burst: the pending refresh bumps seconds later, and two
        // bumps in a row only churn cache keys.
        expect(uploadedKeys()).toContain('jobs/opp-2.json');
        expect(uploadedKeys()).not.toContain('meta/feed-version.json');

        // And the scheduled rebuild runs against the discovery feeds.
        await vi.advanceTimersByTimeAsync(5_100);
        expect(refreshSpy).toHaveBeenCalledWith('bootstrap');
    });
});
