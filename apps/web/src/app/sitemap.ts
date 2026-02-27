import type { MetadataRoute } from 'next';

export const revalidate = 86400; // 24 hours — Google doesn't need hourly sitemap refreshes

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
const STATIC_ROUTES = ['/', '/opportunities', '/jobs', '/internships', '/walk-ins', '/login', '/signup'];

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
    const totalPages = normalizeTotalPages(firstData.totalPages);
    const allItems: SitemapOpportunity[] = Array.isArray(firstData.items) ? [...firstData.items] : [];

    for (let page = 2; page <= totalPages; page += 1) {
      const res = await fetch(
        `${apiBase}/api/public/sitemap/opportunities?page=${page}&limit=${limit}`,
        { next: { revalidate } }
      );

      if (!res.ok) {
        throw new Error(`Sitemap API failed page=${page} status=${res.status}`);
      }

      const data = (await res.json()) as SitemapApiResponse;
      if (Array.isArray(data.items)) {
        allItems.push(...data.items);
      }
    }

    const opportunityEntries: MetadataRoute.Sitemap = allItems.map((item) => {
      const slugOrId = item.slug ?? item.id;
      const path = `${getPathByType(item.type)}${encodeURIComponent(slugOrId)}`;

      return {
        url: `${BASE_URL}${path}`,
        lastModified: item.updatedAt ?? item.postedAt,
      };
    });

    return [...staticEntries, ...opportunityEntries];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Sitemap generation failed.', error);

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Dynamic sitemap generation failed: ${message}`);
    }

    return staticEntries;
  }
}
