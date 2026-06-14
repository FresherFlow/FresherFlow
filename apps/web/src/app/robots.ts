import type { MetadataRoute } from 'next';
import { PUBLIC_WEB_HOST } from '@/lib/utils/runtimeConfig';

export default function robots(): MetadataRoute.Robots {
    const host = PUBLIC_WEB_HOST
        ? (/^https?:\/\//i.test(PUBLIC_WEB_HOST) ? PUBLIC_WEB_HOST : `https://${PUBLIC_WEB_HOST}`)
        : '';
    const normalizedHost = host.replace(/\/+$/, '');

    return {
        rules: [
            // Social crawlers: explicitly allow OG image routes so Twitter/Facebook
            // card images are never blocked by the broader /api disallow below.
            {
                userAgent: 'Twitterbot',
                allow: ['/api/og/'],
                disallow: [],
            },
            {
                userAgent: 'facebookexternalhit',
                allow: ['/api/og/'],
                disallow: [],
            },
            {
                userAgent: 'LinkedInBot',
                allow: ['/api/og/'],
                disallow: [],
            },
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/jobs',
                    '/internships',
                    '/walk-ins',
                    '/opportunities',
                    '/companies',
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





