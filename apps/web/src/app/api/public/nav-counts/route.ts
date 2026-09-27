import { NextRequest, NextResponse } from 'next/server';
import { FEED_STATS_URL } from '@/lib/utils/runtimeConfig';
import { withRateLimit } from '@/lib/api/rateLimit';

// On-demand revalidation via /api/revalidate — same policy as the feed routes.
export const revalidate = false;
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
    'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
} as const;

const COUNT_KEYS = ['opportunities', 'internships', 'remote', 'walkins', 'government', 'companies'] as const;

function pickCounts(data: Record<string, unknown>): Record<string, unknown> {
    const counts: Record<string, unknown> = {};
    for (const key of COUNT_KEYS) {
        const value = data?.[key];
        counts[key] = Number.isFinite(value) ? Number(value) : 0;
    }
    const govtCategories = data?.govtCategories;
    counts.govtCategories =
        govtCategories && typeof govtCategories === 'object' ? govtCategories : {};
    return counts;
}

/**
 * GET /api/public/nav-counts
 *
 * Feed-count breakdown for the sidebar nav badges. Same-origin so the browser
 * never hits the CDN or the API directly, and it respects FEED_SOURCE:
 * FEED_STATS_URL resolves through FEED_CDN_BASE, so cdn mode reads the CDN
 * snapshot and db mode reads the Postgres-backed API route.
 *
 * Never throws: resolves zeroed counts so badges quietly hide instead of
 * breaking nav.
 */
async function serveNavCounts(_request: NextRequest) {
    try {
        const res = await fetch(FEED_STATS_URL, {
            next: { revalidate: 300, tags: ['feed-stats'] },
        });
        if (!res.ok) {
            return NextResponse.json(pickCounts({}), { headers: CACHE_HEADERS });
        }

        const data = await res.json() as Record<string, unknown>;
        return NextResponse.json(pickCounts(data), { headers: CACHE_HEADERS });
    } catch {
        return NextResponse.json(pickCounts({}), { headers: CACHE_HEADERS });
    }
}

export const GET = withRateLimit(serveNavCounts, { windowMs: 60_000, max: 60, keyPrefix: 'nav-counts' });
