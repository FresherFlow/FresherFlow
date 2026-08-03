import type { MetadataRoute } from 'next';
import { PUBLIC_WEB_HOST } from '@/lib/utils/runtimeConfig';

export const revalidate = 86400; // Revalidate static sitemap daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = PUBLIC_WEB_HOST
        ? (/^https?:\/\//i.test(PUBLIC_WEB_HOST) ? PUBLIC_WEB_HOST : `https://${PUBLIC_WEB_HOST}`).replace(/\/+$/, '')
        : 'https://fresherflow.in';

    const staticRoutes = [
        '',
        '/opportunities',
        '/jobs',
        '/internships',
        '/walk-ins',
        '/companies',
        '/about',
        '/contact',
        '/privacy',
        '/terms',
    ];

    return staticRoutes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' || route === '/opportunities' ? 'hourly' : 'daily',
        priority: route === '' ? 1.0 : route === '/opportunities' ? 0.9 : 0.7,
    }));
}

