import { NextResponse } from 'next/server';
import { SITE_URL, SITEMAP_PAGE_SIZE, fetchSitemapItems, sitemapIndexXml } from '../sitemaps/_lib';

export const revalidate = 3600;

export async function GET() {
    try {
        const firstPage = await fetchSitemapItems(1, SITEMAP_PAGE_SIZE);
        const now = new Date().toISOString();
        const entries = [
            { loc: `${SITE_URL}/sitemaps/static.xml`, lastmod: now },
        ];

        for (let page = 1; page <= firstPage.totalPages; page += 1) {
            entries.push({
                loc: `${SITE_URL}/sitemaps/opportunities/${page}`,
                lastmod: now,
            });
        }

        const xml = sitemapIndexXml(entries);
        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200',
            },
        });
    } catch {
        const fallback = sitemapIndexXml([{ loc: `${SITE_URL}/sitemaps/static.xml`, lastmod: new Date().toISOString() }]);
        return new NextResponse(fallback, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
            },
        });
    }
}
