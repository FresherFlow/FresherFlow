import type { MetadataRoute } from 'next';
import { PUBLIC_WEB_HOST } from '@/lib/utils/runtimeConfig';

export const revalidate = 3600; // Revalidate sitemap every hour

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

    const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' || route === '/opportunities' ? 'hourly' : 'daily',
        priority: route === '' ? 1.0 : route === '/opportunities' ? 0.9 : 0.7,
    }));

    // Fetch public candidate usernames for sitemap indexing (only complete/public profiles)
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.fresherflow.in';
        const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/profile/public-usernames`, {
            next: { revalidate: 3600 },
        });
        if (res.ok) {
            const data = await res.json();
            const usernames: string[] = Array.isArray(data.usernames) ? data.usernames : (Array.isArray(data) ? data : []);
            usernames.forEach((username) => {
                entries.push({
                    url: `${baseUrl}/u/${username}`,
                    lastModified: new Date(),
                    changeFrequency: 'weekly',
                    priority: 0.8,
                });
            });
        }
    } catch {
        // Fallback: non-fatal if API call fails
    }

    return entries;
}
