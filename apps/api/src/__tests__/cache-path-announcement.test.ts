import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.REDIS_ENABLED = 'false';

/**
 * The cache purge has to reach the web app without a human pressing a button.
 *
 * `invalidatePublicOpportunityCache` used to append the paths it wanted
 * revalidated to a Redis set (`pending_cache_paths`) whose only reader was the
 * admin "Regenerate all" handler. So an edit cleared Redis keys nothing on the
 * web reads and then left the detail page cached indefinitely.
 */

const notifyWebPathsChanged = vi.fn(async () => undefined);

vi.mock('../infrastructure/services/opportunity/webRevalidation.service', () => ({
    notifyWebPathsChanged,
    notifyWebFeedChanged: vi.fn(async () => undefined),
}));

const scan = vi.fn(async () => ['0', []] as [string, string[]]);
const del = vi.fn(async () => 0);

vi.mock('@fresherflow/database', () => ({
    redis: { scan, del },
}));

describe('listing cache invalidation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('announces only the detail slug instead of writing Redis and every hub', async () => {
        const { invalidatePublicOpportunityCache } = await import(
            '../infrastructure/services/opportunity/publicOpportunityCache.service'
        );

        await invalidatePublicOpportunityCache({
            idsOrSlugs: ['engineer-at-acme-1a2b3c'],
            purgeFeed: true,
            tags: ['hub-jobs'],
        });

        // The purge still clears the guest cache...
        expect(scan).toHaveBeenCalled();

        // ...and exactly one eager path reaches the web: the listing itself.
        // A hub path must never be sent — revalidatePath() on it is an
        // immediate ISR write, and the hub is refreshed by the tag bust that
        // travels with this same announcement.
        expect(notifyWebPathsChanged).toHaveBeenCalledWith(
            ['/jobs/engineer-at-acme-1a2b3c'],
            'cache-invalidation',
        );
    });

    it('does not turn company, batch or location tags into eager paths', async () => {
        const { invalidatePublicOpportunityCache } = await import(
            '../infrastructure/services/opportunity/publicOpportunityCache.service'
        );

        await invalidatePublicOpportunityCache({
            idsOrSlugs: ['engineer-at-acme-1a2b3c'],
            purgeFeed: true,
            tags: ['company-acme', 'batch-2026', 'location-pune'],
        });

        // Those tags are invalidated lazily by FEED_REVALIDATE_TAGS. Mapping
        // them to /companies/*, /batch/* and /locations/* paths is what fanned
        // a bulk publish out into thousands of ISR writes.
        expect(notifyWebPathsChanged).toHaveBeenCalledWith(
            ['/jobs/engineer-at-acme-1a2b3c'],
            'cache-invalidation',
        );
    });
});
