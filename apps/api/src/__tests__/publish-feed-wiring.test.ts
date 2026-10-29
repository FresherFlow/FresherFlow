import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.REDIS_ENABLED = 'false';

// Everything around the publish side-effects is stubbed; the two things under
// test are which of them run. Before this, the feed rebuild call was commented
// out of publish.service.ts, which is why a published job never appeared on the
// hub pages no matter how many times the admin cache buttons were pressed.
const scheduleDiscoveryFeedRefresh = vi.fn();
const uploadSingleJob = vi.fn(async () => undefined);
const invalidatePublicOpportunityCache = vi.fn(async () => undefined);
const sendNewJobAlerts = vi.fn(async () => undefined);
const notifySavedSearchMatches = vi.fn(async () => undefined);
const appendOpportunityMetadata = vi.fn(async () => undefined);
const generateAndUploadOgImage = vi.fn(async () => undefined);
const notifyWebFeedChanged = vi.fn(async () => undefined);

vi.mock('../infrastructure/services/opportunity/feedRefresh', () => ({ scheduleDiscoveryFeedRefresh }));
vi.mock('../infrastructure/services/opportunity/staticFeed.service', () => ({
    StaticFeedService: { uploadSingleJob },
}));
vi.mock('../infrastructure/services/opportunity/webRevalidation.service', () => ({
    notifyWebFeedChanged,
}));
vi.mock('../infrastructure/services/opportunity/publicOpportunityCache.service', () => ({
    invalidatePublicOpportunityCache,
}));
vi.mock('../infrastructure/services/alerts/notification.service', () => ({ sendNewJobAlerts }));
vi.mock('../infrastructure/services/alerts/savedSearchAlert.service', () => ({ notifySavedSearchMatches }));
vi.mock('../infrastructure/services/opportunity/metadata.service', () => ({
    MetadataService: { appendOpportunityMetadata },
}));
vi.mock('../infrastructure/services/opportunity/ogImage.service', () => ({ generateAndUploadOgImage }));

const opportunity = {
    id: 'opp-1',
    slug: 'engineer-at-acme-1a2b3c4d',
    title: 'Engineer',
    company: 'Acme',
    category: 'EMPLOYMENT',
} as never;

describe('publish side-effects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('schedules a feed rebuild, so the new job can reach the hub pages', async () => {
        const { handleOpportunityPublished } = await import(
            '../infrastructure/services/opportunity/publish.service'
        );

        await handleOpportunityPublished(opportunity, { isNew: true });

        expect(scheduleDiscoveryFeedRefresh).toHaveBeenCalledTimes(1);
        // Cached copies are only invalidated here; the feed FILES are what the
        // rebuild produces, and both are required.
        expect(invalidatePublicOpportunityCache).toHaveBeenCalledTimes(1);
    });

    it('uploads the job shard and keeps the other side-effects wired', async () => {
        const { handleOpportunityPublished } = await import(
            '../infrastructure/services/opportunity/publish.service'
        );

        await handleOpportunityPublished(opportunity, { isNew: true });
        await vi.waitFor(() => expect(uploadSingleJob).toHaveBeenCalledTimes(1));

        expect(sendNewJobAlerts).toHaveBeenCalledWith('opp-1');
        await vi.waitFor(() => expect(appendOpportunityMetadata).toHaveBeenCalledTimes(1));
    });

    it('tells the web app that the feeds moved, so the job reaches the site', async () => {
        // Rebuilding the CDN feed is not enough: the web app caches the feed
        // it read, and a tag bust only makes it re-read the same URL. Without
        // this announcement the published job stayed invisible on /jobs until
        // an operator pressed "Refresh cache".
        const { handleOpportunityPublished } = await import(
            '../infrastructure/services/opportunity/publish.service'
        );

        await handleOpportunityPublished(opportunity, { isNew: true });

        await vi.waitFor(() => expect(notifyWebFeedChanged).toHaveBeenCalledTimes(1));
    });
});
