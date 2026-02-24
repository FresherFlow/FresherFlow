import { NextResponse } from 'next/server';
import { SITEMAP_PAGE_SIZE, fetchSitemapItems, getOpportunityAbsoluteUrl, urlsetXml } from '../../_lib';

export const revalidate = 3600;

export async function GET(_: Request, context: { params: Promise<{ page: string }> }) {
    const { page: pageRaw } = await context.params;
    const page = Number(pageRaw);
    if (!Number.isFinite(page) || page < 1) {
        return new NextResponse('Not Found', { status: 404 });
    }

    try {
        const payload = await fetchSitemapItems(page, SITEMAP_PAGE_SIZE);
        if (page > payload.totalPages) {
            return new NextResponse('Not Found', { status: 404 });
        }

        const xml = urlsetXml(payload.items.map((item) => ({
            loc: getOpportunityAbsoluteUrl(item),
            lastmod: item.postedAt,
        })));

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200',
            },
        });
    } catch {
        return new NextResponse('Unavailable', { status: 503 });
    }
}
