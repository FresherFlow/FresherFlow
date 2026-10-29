import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.REDIS_ENABLED = 'false';

// Stubbed so these tests are about the caller's contract with the feed service
// (which target, and never throwing) rather than about R2 itself. The version
// bump the service performs is covered in static-feed-version.test.ts, against
// the real class.
vi.mock('../infrastructure/services/opportunity/staticFeed.service', () => ({
    StaticFeedService: { scheduleRefresh: vi.fn() },
}));

describe('discovery feed refresh wiring', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('schedules the discovery feeds by default', async () => {
        const { StaticFeedService } = await import('../infrastructure/services/opportunity/staticFeed.service');
        const { scheduleDiscoveryFeedRefresh } = await import('../infrastructure/services/opportunity/feedRefresh');

        scheduleDiscoveryFeedRefresh();
        await vi.waitFor(() => {
            expect(StaticFeedService.scheduleRefresh).toHaveBeenCalledWith('bootstrap');
        });
    });

    it('forwards an explicit target for feeds the default does not rebuild', async () => {
        const { StaticFeedService } = await import('../infrastructure/services/opportunity/staticFeed.service');
        const { scheduleDiscoveryFeedRefresh } = await import('../infrastructure/services/opportunity/feedRefresh');

        scheduleDiscoveryFeedRefresh('resources');
        await vi.waitFor(() => {
            expect(StaticFeedService.scheduleRefresh).toHaveBeenCalledWith('resources');
        });
    });

    it('never throws when the rebuild cannot even be scheduled', async () => {
        // A publish must still succeed when the feed service fails: the listing
        // is already written and audited by this point, so a rebuild problem is
        // logged rather than surfaced as a failed publish.
        const { StaticFeedService } = await import('../infrastructure/services/opportunity/staticFeed.service');
        const { scheduleDiscoveryFeedRefresh } = await import('../infrastructure/services/opportunity/feedRefresh');

        vi.mocked(StaticFeedService.scheduleRefresh).mockImplementationOnce(() => {
            throw new Error('storage unavailable');
        });

        expect(() => scheduleDiscoveryFeedRefresh()).not.toThrow();
        // The rejection is handled, so it must not surface as an unhandled one.
        await new Promise((resolve) => setTimeout(resolve, 5));

        // The next call is unaffected by the previous failure.
        scheduleDiscoveryFeedRefresh();
        await vi.waitFor(() => {
            expect(StaticFeedService.scheduleRefresh).toHaveBeenCalledTimes(2);
        });
    });
});


