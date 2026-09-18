import { NextRequest, NextResponse } from 'next/server';
import { OpportunityType } from '@fresherflow/types';
import { fetchFeedIndex, fetchGovernmentFeed, fetchBootstrapFeed, type BootstrapFeedResponse } from '@/lib/api/cdnFeed';
import { withRateLimit } from '@/lib/api/rateLimit';

// On-demand revalidation via /api/revalidate — same policy as the feed routes.
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
 */
async function servePublicFeed(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const requested = (searchParams.get('type') || 'ALL').toUpperCase();
    const type = requested === OpportunityType.GOVERNMENT ? OpportunityType.GOVERNMENT : 'ALL';

    try {
        let feed: BootstrapFeedResponse | null = null;

        if (type === OpportunityType.GOVERNMENT) {
            feed = await fetchGovernmentFeed(false, undefined, true);
            if (!feed?.opportunities?.length) {
                feed = await fetchFeedIndex(false, undefined, true);
            }
        } else {
            // Use lightweight feed-index (faster, has all card-rendering fields)
            // Fall back to bootstrap only if index is unavailable
            feed = await fetchFeedIndex(false, undefined, true);
            if (!feed?.opportunities?.length) {
                feed = await fetchBootstrapFeed(false, undefined, true);
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
                    'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
                },
            }
        );
    } catch (error) {
        console.error('[api/public/feed] Feed serving failed:', error);
        return NextResponse.json({ error: 'Feed unavailable' }, { status: 503 });
    }
}

export const GET = withRateLimit(servePublicFeed, { windowMs: 60_000, max: 60, keyPrefix: 'feed' });