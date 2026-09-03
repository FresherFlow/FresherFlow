import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';

const INGESTION_URL = process.env.INGESTION_SERVICE_URL || process.env.NEXT_PUBLIC_INGESTION_URL || process.env.INGESTION_URL || 'http://localhost:3005';

/**
 * POST /api/search
 *
 * Proxies to ingestion service's concurrent fan-out search.
 * Body: { searchTerm, location, hoursOld, companySlug, siteType, resultsWanted }
 */
async function handleSearch(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchTerm, location, hoursOld, companySlug, siteType, resultsWanted } = body;

        if (!searchTerm && !companySlug) {
            return NextResponse.json(
                { error: 'Either searchTerm or companySlug is required' },
                { status: 400 }
            );
        }

        const res = await fetch(`${INGESTION_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm, location, hoursOld, companySlug, siteType, resultsWanted }),
            signal: AbortSignal.timeout(60_000), // 60s timeout for concurrent fan-out
        });

        if (!res.ok) {
            const text = await res.text();
            return NextResponse.json(
                { error: `Search service returned ${res.status}: ${text}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
            return NextResponse.json(
                { error: 'Search timed out. Try a more specific query.' },
                { status: 504 }
            );
        }
        console.error('[api/search] Error:', error);
        return NextResponse.json(
            { error: 'Search service unavailable' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/search/scrapers
 *
 * Lists available scrapers from the ingestion service.
 */
async function listScrapers(request: NextRequest) {
    const url = new URL(request.url);
    if (url.searchParams.get('action') === 'scrapers') {
        try {
            const res = await fetch(`${INGESTION_URL}/search/scrapers`);
            const data = await res.json();
            return NextResponse.json(data);
        } catch {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }
    }

    return NextResponse.json({ error: 'Use POST for search, or GET ?action=scrapers' }, { status: 400 });
}

const rateLimitOptions = { windowMs: 60_000, max: 10, keyPrefix: 'search' };

export const POST = withRateLimit(handleSearch, rateLimitOptions);
export const GET = withRateLimit(listScrapers, rateLimitOptions);
