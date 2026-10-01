import type { MetadataRoute } from 'next';
import { PUBLIC_WEB_HOST } from '@/lib/utils/runtimeConfig';

export default function robots(): MetadataRoute.Robots {
    const host = PUBLIC_WEB_HOST
        ? (/^https?:\/\//i.test(PUBLIC_WEB_HOST) ? PUBLIC_WEB_HOST : `https://${PUBLIC_WEB_HOST}`)
        : '';
    const normalizedHost = host.replace(/\/+$/, '');

    return {
        rules: [
            // Social crawlers: the empty `disallow` is what grants these bots
            // everything — a named group takes precedence over the `*` group
            // below, so `/api/og/` card images are fetched despite the `/api`
            // disallow. The `allow` list documents the intent; the empty
            // `disallow` is what actually does it.
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
                // No `allow` here on purpose. An `Allow` rule cannot narrow a
                // group that has no `Disallow: /`, so the eight hub paths this
                // group used to "allow" were indexable by default all along and
                // the list never changed crawler behaviour — it only documented
                // intent. Everything not listed below is crawlable.
                disallow: [
                    '/api',
                    '/admin',
                    '/moderator',
                    '/admin-manifest.json',
                    '/deadlines',
                    '/account',
                    '/onboarding',
                    '/login',
                    '/signup',
                    '/join',
                    '/choose-username',
                    '/logout',
                    '/dev',
                    '/sentry-example-page',
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





