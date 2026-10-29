import { NextRequest, NextResponse } from 'next/server';
import { Sector } from '@fresherflow/types';
import { fetchFeedIndex, fetchGovernmentFeed, fetchBootstrapFeed, type BootstrapFeedResponse } from '@/lib/api/cdnFeed';
import { withRateLimit } from '@/lib/api/rateLimit';

// The route itself is always rendered per request (force-dynamic) and its own
// response is edge-cacheable below. The INNER read is the part that used to be
// wrong: it fetched the feed untracked, so the Data Cache kept one snapshot
// forever and this proxy served the same stale payload no matter how fresh the
// CDN was. It is now a normal tracked + bounded read, so the body follows the
// feed version and the shared cache below can only make it staler by its own
// declared TTL.
export const revalidate = false;
export const dynamic = 'force-dynamic';

/**
 * GET /api/public/feed?type=ALL|GOVERNMENT
 *
 * Same-origin feed delivery for the browser. Route components serialize only
 * the first page of jobs into the HTML (keeps view-source light), so the
 * client loads the rest here, after paint. The CDN asset is signature-protected
 * and sends no CORS headers to browsers, which is why this proxy exists:
 * the signature stays server-side and the response is edge-cacheable.
 *
 * GOVERNMENT selects the sector=GOVERNMENT feed (new taxonomy dimension);
 * everything else serves the main employment feed.
 */
async function servePublicFeed(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const requested = (searchParams.get('type') || 'ALL').toUpperCase();
    const isGovernment = requested === Sector.GOVERNMENT;

    try {
        let feed: BootstrapFeedResponse | null = null;

        if (isGovernment) {
            feed = await fetchGovernmentFeed();
            if (!feed?.opportunities?.length) {
                feed = await fetchFeedIndex();
            }
        } else {
            // Use lightweight feed-index (faster, has all card-rendering fields)
            // Fall back to bootstrap only if index is unavailable
            feed = await fetchFeedIndex();
            if (!feed?.opportunities?.length) {
                feed = await fetchBootstrapFeed();
            }
        }

        if (!feed?.opportunities?.length) {
            return NextResponse.json({ error: 'Feed unavailable' }, { status: 503 });
        }

        return NextResponse.json(
            {
                opportunities: feed.opportunities,
                count: feed.count ?? feed.opportunities.length,
                generatedAt: feed.generatedAt,
            },
            {
                headers: {
                    // Shared caches keep a fresh copy for 5 minutes and may serve
                    // one stale copy for at most another 5 minutes while they
                    // revalidate in the background. The previous 10-minute fresh
                    // window plus a 1-hour stale window let a published job stay
                    // invisible in the browser for over an hour.
                    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
                },
            }
        );
    } catch (error) {
        console.error('[api/public/feed] Feed serving failed:', error);
        return NextResponse.json({ error: 'Feed unavailable' }, { status: 503 });
    }
}

export const GET = withRateLimit(servePublicFeed, { windowMs: 60_000, max: 60, keyPrefix: 'feed' });