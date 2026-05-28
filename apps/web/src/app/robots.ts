import type { MetadataRoute } from 'next';
import { PUBLIC_WEB_HOST } from '@/lib/runtimeConfig';

export default function robots(): MetadataRoute.Robots {
    const host = PUBLIC_WEB_HOST
        ? (/^https?:\/\//i.test(PUBLIC_WEB_HOST) ? PUBLIC_WEB_HOST : `https://${PUBLIC_WEB_HOST}`)
        : '';
    const normalizedHost = host.replace(/\/+$/, '');

    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/jobs',
                    '/internships',
                    '/walk-ins',
                    '/opportunities',
                    '/api/og/',
                ],
                disallow: [
                    '/api',
                    '/admin',
                    '/admin-manifest.json',
                    '/deadlines',
                    '/dashboard',
                    '/account',
                    '/profile',
                    '/alerts',
                    '/login',
                    '/signup',
                    '/logout',
                ],
            },
            {
                userAgent: 'GPTBot',
                disallow: ['/'],
            },
            {
                userAgent: 'CCBot',
                disallow: ['/'],
            },
        ],
        ...(normalizedHost ? { sitemap: `${normalizedHost}/sitemap.xml`, host: normalizedHost } : {}),
    };
}





