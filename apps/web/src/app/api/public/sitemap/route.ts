import { NextRequest, NextResponse } from 'next/server';
import { CDN_URL, SITE_URL } from '@/lib/utils/runtimeConfig';
import { withRateLimit } from '@/lib/api/rateLimit';

export const revalidate = false;
export const dynamic = 'force-dynamic';

async function serveSitemap(request: NextRequest) {
    try {
        // The rewrite from `/sitemap*.xml` names the file in `?file=`, but a
        // rewritten route handler is handed the *public* request URL, so that
        // query is not visible here — in `next dev` it is dropped entirely and
        // every sitemap answered 400. Fall back to the requested filename,
        // which is the same value the rewrite was built from. Both carriers go
        // through the same validation below.
        const requestUrl = new URL(request.url);
        const file = requestUrl.searchParams.get('file') ?? requestUrl.pathname.split('/').pop() ?? null;

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
        // Single-pass rewrite: the regex matches *any* absolute origin after
        // `<loc>` (not just the expected SITE_URL), so a single `.replace`
        // handles both the production origin and the localhost fallback from a
        // misconfigured publish run. This removes the old two-pass
        // `replaceAll(SITE_URL, …)` + `replace` that materialised the full XML
        // twice on every cache miss. The pattern is anchored on a scheme plus
        // host and stops at the next `/`, so only the origin is replaced and
        // the path is preserved.
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
