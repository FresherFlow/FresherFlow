import type { MetadataRoute } from 'next';
import { PUBLIC_WEB_HOST, SITE_URL } from '@/lib/runtimeConfig';
import { fetchBootstrapFeed, fetchSitemapData } from '@/lib/api/cdnFeed';

export const revalidate = 86400; // 24 hours; daily sitemap refresh is enough.

type SitemapOpportunity = {
  id: string;
  slug: string | null;
  type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
  postedAt: string;
  updatedAt?: string;
};

function getBaseUrl(): string {
  const normalizedSiteUrl = SITE_URL.replace(/\/+$/, '');
  if (normalizedSiteUrl) return normalizedSiteUrl;

  const host = PUBLIC_WEB_HOST.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (host) return `https://${host}`;

  return '';
}

const BASE_URL = getBaseUrl();
const STATIC_ROUTES = ['/', '/opportunities', '/jobs', '/internships', '/walk-ins'];

function getPathByType(type: SitemapOpportunity['type']): string {
  if (type === 'INTERNSHIP') return '/internships/';
  if (type === 'WALKIN') return '/walk-ins/details/';
  return '/jobs/';
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  try {
    const sitemapData = await fetchSitemapData();
    let allItems: SitemapOpportunity[] = [];
    let companyEntries: MetadataRoute.Sitemap = [];

    if (sitemapData) {
      allItems = (sitemapData.opportunities || []).map((item) => ({
        id: item.id,
        slug: item.slug ?? null,
        type: item.type as SitemapOpportunity['type'],
        postedAt: String(item.postedAt || new Date().toISOString()),
        updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
      }));

      companyEntries = (sitemapData.companies || []).map((c) => ({
        url: `${BASE_URL}/companies/${encodeURIComponent(c.slug.toLowerCase().trim())}`,
        lastModified: new Date(),
      }));
    } else {
      console.warn('Sitemap data fetch returned null, falling back to bootstrap feed.');
      const feed = await fetchBootstrapFeed();
      allItems = (feed?.opportunities || []).map((item) => ({
        id: item.id,
        slug: item.slug ?? null,
        type: item.type as SitemapOpportunity['type'],
        postedAt: String(item.postedAt || feed?.generatedAt || new Date().toISOString()),
        updatedAt: item.publishedAt ? String(item.publishedAt) : undefined,
      }));
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

    return [...staticEntries, ...companyEntries, ...opportunityEntries];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Sitemap generation failed.', error);
    console.warn(`Dynamic sitemap generation failed (API may be down during build): ${message}`);
    return staticEntries;
  }
}
