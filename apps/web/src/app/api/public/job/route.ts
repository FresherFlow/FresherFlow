import { NextRequest, NextResponse } from 'next/server';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { withRateLimit } from '@/lib/api/rateLimit';

// The route renders per request (force-dynamic) and its own response is
// edge-cacheable. The INNER read used to be untracked, so it served one
// snapshot forever; it is now tracked and bounded like every other feed read.
export const revalidate = false;
export const dynamic = 'force-dynamic';

/**
 * GET /api/public/job?id=<uuid|slug>
 *
 * Single-job detail proxy for the browser. The per-job CDN shards
 * (jobs/{id}.json) are published per-publish and lag the feed index, so the
 * split-view pane can hit 404s when upgrading card data to full detail.
 *
 * MUST be a static route (no [id] segment): next.config.ts rewrites
 * /api/:path* to the API server in development, and afterFiles rewrites are
 * checked BEFORE dynamic routes — a dynamic route here would be shadowed in
 * dev. A static path wins over the rewrite in both dev and production.
 *
 * Serves one record (~2.5KB) from the bootstrap feed, resolving by id or
 * slug, same-origin like /api/public/feed. Edge-cacheable.
 */
async function serveOpportunityDetail(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();
    if (!id || id.length > 200) {
        return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
    }

    try {
        const feed = await fetchBootstrapFeed();
        const opportunities = feed?.opportunities ?? [];
        const match = opportunities.find(
            (opp) => opp.id === id || opp.slug === id
        ) ?? null;

        if (!match) {
            return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
        }

        return NextResponse.json(
            { opportunity: match },
            {
                headers: {
                    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
                },
            }
        );
    } catch (error) {
        console.error('[api/public/job] Detail serving failed:', error);
        return NextResponse.json({ error: 'Opportunity unavailable' }, { status: 503 });
    }
}

export const GET = withRateLimit(serveOpportunityDetail, {
    windowMs: 60_000,
    max: 120,
    keyPrefix: 'job-detail',
});
