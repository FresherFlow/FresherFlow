import type { MetadataRoute } from 'next';

export const revalidate = 86400; // 24 hours; daily sitemap refresh is enough.

type SitemapOpportunity = {
  id: string;
  slug: string | null;
  type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
  postedAt: string;
  updatedAt?: string;
};

type SitemapApiResponse = {
  items: SitemapOpportunity[];
  totalPages: number;
};

const BASE_URL = 'https://fresherflow.in';
const STATIC_ROUTES = ['/', '/opportunities', '/jobs', '/internships', '/walk-ins'];

function getApiBase(): string {
  const apiBase =
    process.env.NEXT_PUBLIC_USER_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    'https://api.fresherflow.in';

  return apiBase.replace(/\/+$/, '');
}

function getPathByType(type: SitemapOpportunity['type']): string {
  if (type === 'INTERNSHIP') return '/internships/';
  if (type === 'WALKIN') return '/walk-ins/details/';
  return '/jobs/';
}

function normalizeTotalPages(value: unknown): number {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.floor(raw);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const apiBase = getApiBase();
  const limit = 1000;
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  try {
    const firstRes = await fetch(
      `${apiBase}/api/public/sitemap/opportunities?page=1&limit=${limit}`,
      { next: { revalidate } }
    );

    if (!firstRes.ok) {
      throw new Error(`Sitemap API failed page=1 status=${firstRes.status}`);
    }

    const firstData = (await firstRes.json()) as SitemapApiResponse;
    const MAX_PAGES = 20;
    const totalPagesCount = normalizeTotalPages(firstData.totalPages);
    const totalPages = Math.min(totalPagesCount, MAX_PAGES);
    const allItems: SitemapOpportunity[] = Array.isArray(firstData.items) ? [...firstData.items] : [];

    if (totalPagesCount > MAX_PAGES) {
      console.warn(`Sitemap truncated: ${totalPagesCount} total pages, but only first ${MAX_PAGES} pages are being indexed.`);
    }

    if (totalPages > 1) {
      const pagePromises = [];
      for (let page = 2; page <= totalPages; page += 1) {
        pagePromises.push(
          fetch(`${apiBase}/api/public/sitemap/opportunities?page=${page}&limit=${limit}`, {
            next: { revalidate },
          }).then((res) => {
            if (!res.ok) throw new Error(`Sitemap API failed page=${page} status=${res.status}`);
            return res.json() as Promise<SitemapApiResponse>;
          })
        );
      }

      const BATCH_SIZE = 5;
      for (let i = 0; i < pagePromises.length; i += BATCH_SIZE) {
        const batch = pagePromises.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch);
        for (const data of results) {
          if (Array.isArray(data.items)) {
            allItems.push(...data.items);
          }
        }
      }
    }

    const seenEntries = new Set<string>();
    const opportunityEntries: MetadataRoute.Sitemap = [];

    for (const item of allItems) {
      const slugOrId = item.slug ?? item.id;
      const path = `${getPathByType(item.type)}${encodeURIComponent(slugOrId)}`;
      const url = `${BASE_URL}${path}`;

      if (seenEntries.has(url)) continue;
      seenEntries.add(url);

      const rawDate = item.updatedAt ?? item.postedAt;
      const date = rawDate ? new Date(rawDate) : new Date();

      opportunityEntries.push({
        url,
        lastModified: Number.isNaN(date.getTime()) ? new Date() : date,
      });
    }

    return [...staticEntries, ...opportunityEntries];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Sitemap generation failed.', error);
    console.warn(`Dynamic sitemap generation failed (API may be down during build): ${message}`);
    return staticEntries;
  }
}





