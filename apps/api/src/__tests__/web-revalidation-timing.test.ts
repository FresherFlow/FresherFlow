import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Ordering matters more than the request itself.
 *
 * A `revalidatePath` makes Next render the page again from the SAME CDN URL.
 * Telling the web about a detail path before the feed rebuild has uploaded the
 * new snapshot therefore caches the version that is about to be replaced — the
 * exact failure the rebuild-then-announce chain exists to avoid. Paths are
 * added to the same coalesced batch as the tags, so the feed announcement
 * carries them once, after the upload.
 */

process.env.REVALIDATE_SECRET_TOKEN = 'test-revalidate-secret';
process.env.PUBLIC_WEB_URL = 'https://fresherflow.in';

const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));

function sentBodies(): Array<{ secret: string; tags: string[]; paths?: string[] }> {
    return fetchMock.mock.calls.map((call) => {
        const init = (call as unknown as [string, RequestInit])[1];
        return JSON.parse(String(init.body));
    });
}

describe('web revalidation coalescing', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.resetModules();
        fetchMock.mockClear();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('sends the detail paths with the feed tags, once, when the rebuild lands', async () => {
        const { notifyWebPathsChanged, notifyWebFeedChanged } = await import(
            '../infrastructure/services/opportunity/webRevalidation.service'
        );

        // t=0: the mutation queues its detail paths (no request yet).
        void notifyWebPathsChanged(['/jobs/engineer-at-acme'], 'edit');
        await vi.advanceTimersByTimeAsync(500);
        expect(fetchMock).not.toHaveBeenCalled();

        // t=0.5s: the rebuild finished and announces; the batch flushes within
        // the normal coalesce window.
        void notifyWebFeedChanged('feed-refresh:bootstrap');
        await vi.advanceTimersByTimeAsync(1_500);

        const bodies = sentBodies();
        expect(bodies).toHaveLength(1);
        expect(bodies[0].paths).toEqual(['/jobs/engineer-at-acme']);
        expect(bodies[0].tags).toContain('feed-version');
        expect(bodies[0].tags).toContain('feed-index');
    });

    it('does not let a late path delay an announcement that is already queued', async () => {
        const { notifyWebPathsChanged, notifyWebFeedChanged } = await import(
            '../infrastructure/services/opportunity/webRevalidation.service'
        );

        void notifyWebFeedChanged('feed-refresh:bootstrap');
        void notifyWebPathsChanged(['/jobs/engineer-at-acme'], 'edit');

        // The feed announcement's 1s window wins over the 30s path fallback.
        await vi.advanceTimersByTimeAsync(1_500);

        expect(sentBodies()).toHaveLength(1);
        expect(sentBodies()[0].paths).toEqual(['/jobs/engineer-at-acme']);
    });
});
