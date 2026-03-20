import type { MetadataRoute } from 'next';

const PUBLIC_WEB_HOST = process.env.PUBLIC_WEB_HOST || 'fresherflow.in';

export default function robots(): MetadataRoute.Robots {
    const host = /^https?:\/\//i.test(PUBLIC_WEB_HOST) ? PUBLIC_WEB_HOST : `https://${PUBLIC_WEB_HOST}`;

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
                    '/index',
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
        sitemap: `${host.replace(/\/+$/, '')}/sitemap.xml`,
        host: host.replace(/\/+$/, ''),
    };
}





