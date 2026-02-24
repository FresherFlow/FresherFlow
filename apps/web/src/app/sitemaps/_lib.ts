import { getOpportunityPath } from '@/lib/opportunityPath';

export type SitemapOpportunityType = 'JOB' | 'INTERNSHIP' | 'WALKIN';

export type SitemapItem = {
    id: string;
    slug: string | null;
    type: SitemapOpportunityType;
    postedAt: string;
    expiresAt: string | null;
};

type SitemapResponse = {
    items: SitemapItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fresherflow.in';
const USER_API_URL =
    process.env.NEXT_PUBLIC_USER_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    'https://api.fresherflow.in';

export const SITEMAP_PAGE_SIZE = 1000;

export async function fetchSitemapItems(page = 1, limit = SITEMAP_PAGE_SIZE): Promise<SitemapResponse> {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    const response = await fetch(`${USER_API_URL}/api/public/sitemap/opportunities?${params.toString()}`, {
        next: { revalidate: 3600 },
        headers: { 'X-Requested-From': 'fresherflow-web' },
    });

    if (!response.ok) throw new Error(`Sitemap source failed: ${response.status}`);
    return response.json() as Promise<SitemapResponse>;
}

export function getOpportunityAbsoluteUrl(item: SitemapItem): string {
    const canonical = item.slug || item.id;
    return `${SITE_URL}${getOpportunityPath(item.type, canonical)}`;
}

export function urlsetXml(urlEntries: Array<{ loc: string; lastmod?: string }>) {
    const rows = urlEntries
        .map((entry) => {
            const lastmodTag = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '';
            return `<url><loc>${entry.loc}</loc>${lastmodTag}</url>`;
        })
        .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</urlset>`;
}

export function sitemapIndexXml(entries: Array<{ loc: string; lastmod?: string }>) {
    const rows = entries
        .map((entry) => {
            const lastmodTag = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '';
            return `<sitemap><loc>${entry.loc}</loc>${lastmodTag}</sitemap>`;
        })
        .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</sitemapindex>`;
}
