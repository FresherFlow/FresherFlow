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

    it('announces the detail slug and the affected hub instead of only writing Redis', async () => {
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

        // ...and the paths now go to the web app, coalesced with the tag bust.
        expect(notifyWebPathsChanged).toHaveBeenCalledWith(
            expect.arrayContaining(['/jobs/engineer-at-acme-1a2b3c', '/jobs']),
            'cache-invalidation',
        );
    });
});
