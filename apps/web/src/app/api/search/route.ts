import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';

/**
 * Base URL of the ingestion service, trailing slashes trimmed.
 *
 * The localhost default is a developer convenience and must never reach production: shipped
 * to Vercel with the env var unset, it would turn a misconfiguration into a plain 500 and
 * make the cause invisible. `ingestionBaseUrl()` below enforces that split.
 */
const INGESTION_URL = (
    process.env.INGESTION_SERVICE_URL ||
    process.env.NEXT_PUBLIC_INGESTION_URL ||
    process.env.INGESTION_URL ||
    ''
).replace(/\/+$/, '');

const LOCAL_INGESTION_URL = 'http://localhost:3005';

function ingestionBaseUrl(): string | null {
    if (INGESTION_URL) return INGESTION_URL;
    if (process.env.NODE_ENV === 'production') {
        console.error(
            '[api/search] No ingestion URL configured (INGESTION_SERVICE_URL / INGESTION_URL). Search is disabled in this environment.',
        );
        return null;
    }
    return LOCAL_INGESTION_URL;
}

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

        const ingestionUrl = ingestionBaseUrl();
        if (!ingestionUrl) {
            return NextResponse.json({ error: 'Search is temporarily unavailable' }, { status: 503 });
        }

        const res = await fetch(`${ingestionUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm, location, hoursOld, companySlug, siteType, resultsWanted }),
            signal: AbortSignal.timeout(60_000), // 60s timeout for concurrent fan-out
        });

        if (!res.ok) {
            // Log the upstream body, never return it: it can carry internal detail and this
            // is a public route. The client gets the status and nothing else.
            console.error('[api/search] Upstream search failed', {
                status: res.status,
                body: (await res.text()).slice(0, 500),
            });
            return NextResponse.json(
                { error: 'Search is temporarily unavailable' },
                { status: res.status >= 500 ? 503 : res.status }
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
            const ingestionUrl = ingestionBaseUrl();
            if (!ingestionUrl) {
                return NextResponse.json({ error: 'Search is temporarily unavailable' }, { status: 503 });
            }
            const res = await fetch(`${ingestionUrl}/search/scrapers`);
            if (!res.ok) {
                console.error('[api/search] Upstream scraper list failed', { status: res.status });
                return NextResponse.json({ error: 'Search is temporarily unavailable' }, { status: 503 });
            }
            const data = await res.json();
            return NextResponse.json(data);
        } catch (error) {
            console.error('[api/search] Scraper list request failed', error);
            return NextResponse.json({ error: 'Search is temporarily unavailable' }, { status: 503 });
        }
    }

    return NextResponse.json({ error: 'Use POST for search, or GET ?action=scrapers' }, { status: 400 });
}

const rateLimitOptions = { windowMs: 60_000, max: 10, keyPrefix: 'search' };

export const POST = withRateLimit(handleSearch, rateLimitOptions);
export const GET = withRateLimit(listScrapers, rateLimitOptions);
