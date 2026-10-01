import { NextRequest, NextResponse } from 'next/server';
import { CDN_URL, SITE_URL } from '@/lib/utils/runtimeConfig';
import { withRateLimit } from '@/lib/api/rateLimit';

export const revalidate = false;
export const dynamic = 'force-dynamic';

async function serveSitemap(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const file = searchParams.get('file');

        if (!file || !/^sitemap(-[a-zA-Z0-9-_]+)?\.xml$/.test(file)) {
            return new NextResponse('Invalid sitemap file', { status: 400 });
        }

        const cdnBase = CDN_URL.replace(/\/+$/, '');
        const sitemapUrl = `${cdnBase}/sitemaps/${file}`;

        const res = await fetch(sitemapUrl, {
            next: { revalidate: 3600 } // Cache sitemaps on Vercel Edge for 1 hour
        });

        if (!res.ok) {
            return new NextResponse('Sitemap not found', { status: 404 });
        }

        let xml = await res.text();

        // Resolve request protocol and host header dynamically
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(SITE_URL).hostname;
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const currentDomain = `${proto}://${host}`;

        // Rewrite every origin in the document to the domain actually being
        // requested, so preview deployments serve their own URLs.
        //
        // This is a two-stage rewrite, and the second stage exists because of a
        // real incident. `replaceAll(SITE_URL, …)` only fixes a *correct*
        // production origin. A publish run with `PUBLIC_FRONTEND_URL` unset made
        // the generator fall back to `http://localhost:3000`, so every `<loc>`
        // was a localhost URL — and that value is not `SITE_URL`, so the first
        // stage left it untouched and handed it straight to the crawler. Google
        // cannot fetch localhost, so the whole sitemap was worth nothing while
        // still returning 200.
        //
        // So rewrite any absolute origin found in a `<loc>`, not just the one we
        // expect. The pattern is anchored on a scheme plus host and stops at the
        // next `/`, so only the origin is replaced and the path is preserved.
        // `assertSitemapBaseUrl` in the API now also refuses to *produce* such a
        // file; this is the belt to that braces, and it means a bad sitemap
        // already on the CDN still serves correctly.
        xml = xml.replaceAll(SITE_URL, currentDomain);
        xml = xml.replace(
            /<loc>https?:\/\/[^/\s<]+/g,
            `<loc>${currentDomain}`
        );

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600'
            }
        });
    } catch (error) {
        console.error('Dynamic sitemap serving failed:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export const GET = withRateLimit(serveSitemap, { windowMs: 60_000, max: 60, keyPrefix: 'sitemap' });
