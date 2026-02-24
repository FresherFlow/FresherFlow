import type { MetadataRoute } from 'next';

export const revalidate = 3600;

type SitemapOpportunity = {
  id: string;
  slug: string | null;
  type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
  postedAt: string;
};

type SitemapApiResponse = {
  items: SitemapOpportunity[];
  totalPages: number;
};

const BASE_URL = 'https://fresherflow.in';

function getApiBase(): string {
  const apiBase =
    process.env.NEXT_PUBLIC_USER_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL;

  if (!apiBase) {
    throw new Error('API base URL missing for sitemap generation');
  }

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

  const firstRes = await fetch(
    `${apiBase}/api/public/sitemap/opportunities?page=1&limit=${limit}`,
    { cache: 'no-store' }
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
      { cache: 'no-store' }
    );

    if (!res.ok) {
      throw new Error(`Sitemap API failed page=${page} status=${res.status}`);
    }

    const data = (await res.json()) as SitemapApiResponse;
    if (Array.isArray(data.items)) {
      allItems.push(...data.items);
    }
  }

  return allItems.map((item) => {
    const slugOrId = item.slug ?? item.id;
    const path = `${getPathByType(item.type)}${encodeURIComponent(slugOrId)}`;

    return {
      url: `${BASE_URL}${path}`,
      lastModified: item.postedAt,
      changeFrequency: 'daily',
      priority: 0.7,
    };
  });
}
