import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function normalizeHost(value: string | undefined, fallback: string): string {
    const input = (value || fallback).trim();
    if (!input) return fallback;
    try {
        return new URL(input).hostname.toLowerCase();
    } catch {
        return input.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    }
}

const ADMIN_WEB_HOST = normalizeHost(process.env.ADMIN_WEB_HOST, 'admin.fresherflow.in');
const PUBLIC_WEB_HOST = normalizeHost(process.env.PUBLIC_WEB_HOST, 'fresherflow.in');
const APP_WEB_HOST = normalizeHost(process.env.APP_WEB_HOST || process.env.NEXT_PUBLIC_APP_WEB_HOST, 'app.fresherflow.in');
const USER_LOGIN_HOST = normalizeHost(process.env.USER_LOGIN_HOST || process.env.NEXT_PUBLIC_USER_LOGIN_HOST, PUBLIC_WEB_HOST);
const ADMIN_ROOT_PREFIXES = [
    '/dashboard',
    '/opportunities',
    '/jobs',
    '/walkins',
    '/ingestion',
    '/analytics',
    '/feedback',
    '/alerts',
    '/telegram',
    '/settings',
];
const SOCIAL_PREVIEW_BOT_UA =
    /(facebookexternalhit|facebot|twitterbot|xbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|skypeuripreview|applebot)/i;
const KNOWN_CRAWLER_UA = /(bot|crawler|spider|slurp|bingpreview|curl|wget|python-requests|headless)/i;

function isUserProtectedPath(pathname: string): boolean {
    return pathname.startsWith('/dashboard') || pathname.startsWith('/account') || pathname.startsWith('/profile');
}

function isLowValuePrefetch(request: NextRequest): boolean {
    const purpose = (request.headers.get('purpose') || '').toLowerCase();
    const secPurpose = (request.headers.get('sec-purpose') || '').toLowerCase();
    const nextPrefetch = request.headers.get('x-middleware-prefetch') === '1';
    return purpose.includes('prefetch') || secPurpose.includes('prefetch') || nextPrefetch;
}

function isKnownCrawler(request: NextRequest): boolean {
    const ua = request.headers.get('user-agent') || '';
    return KNOWN_CRAWLER_UA.test(ua);
}

function isPublicDetailPath(pathname: string): boolean {
    if (pathname.startsWith('/walk-ins/details/') || pathname.startsWith('/walkins/details/')) {
        return true;
    }

    if (pathname.startsWith('/jobs/')) {
        return pathname !== '/jobs/new';
    }

    if (pathname.startsWith('/internships/')) {
        return true;
    }

    if (pathname.startsWith('/opportunities/')) {
        if (pathname === '/opportunities/create') return false;
        if (pathname.startsWith('/opportunities/edit/')) return false;
        return true;
    }

    return false;
}

function redirectWithMethodAwareness(request: NextRequest, target: string) {
    const url = new URL(target, request.url);
    const method = request.method.toUpperCase();
    const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
    return NextResponse.redirect(url, status);
}

function isSocialPreviewRequest(request: NextRequest): boolean {
    const ua = request.headers.get('user-agent') || '';
    return SOCIAL_PREVIEW_BOT_UA.test(ua);
}

function isSocialShareQuery(request: NextRequest): boolean {
    const ref = (request.nextUrl.searchParams.get('ref') || '').toLowerCase();
    const source = (request.nextUrl.searchParams.get('source') || '').toLowerCase();
    const utmSource = (request.nextUrl.searchParams.get('utm_source') || '').toLowerCase();
    return ref === 'social'
        || source === 'opportunity_share'
        || utmSource === 'telegram'
        || utmSource === 'linkedin'
        || utmSource === 'whatsapp'
        || utmSource === 'facebook'
        || utmSource === 'x';
}

export function proxy(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const isPreviewBot = isSocialPreviewRequest(request);
    const isSocialShare = isSocialShareQuery(request);
    const isAdminHost = normalizedHost === ADMIN_WEB_HOST;
    const isAdminRootPath = ADMIN_ROOT_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    const isAdminRoute = pathname.startsWith('/admin');
    const isAdminLogin = pathname === '/admin/login' || pathname === '/login';
    const isUserPath = isUserProtectedPath(pathname);

    // Keep proxy zero-cost for requests that never need host/auth rewriting.
    if (
        normalizedHost === APP_WEB_HOST &&
        !isAdminRoute &&
        !isAdminRootPath &&
        !isUserPath &&
        pathname !== '/login' &&
        pathname !== '/'
    ) {
        return NextResponse.next();
    }

    // Skip expensive logic for crawler/prefetch traffic on public routes.
    if (
        (isKnownCrawler(request) || isLowValuePrefetch(request)) &&
        !isAdminRoute &&
        !isAdminRootPath &&
        !isUserPath
    ) {
        return NextResponse.next();
    }

    // Keep internal preview routes out of production traffic.
    if (process.env.NODE_ENV === 'production' && pathname.startsWith('/dev')) {
        return redirectWithMethodAwareness(request, '/');
    }

    // Keep fresherflow.in as landing + user login only.
    // Any other path canonicalizes to app host.
    if (
        process.env.NODE_ENV === 'production' &&
        normalizedHost === PUBLIC_WEB_HOST &&
        pathname !== '/' &&
        pathname !== '/login' &&
        !((isPreviewBot || isSocialShare) && isPublicDetailPath(pathname))
    ) {
        const target = `${request.nextUrl.protocol}//${APP_WEB_HOST}${pathname}${request.nextUrl.search}`;
        return redirectWithMethodAwareness(request, target);
    }

    // Check for session marker
    const isAuthenticated = request.cookies.has('ff_logged_in') || request.cookies.has('accessToken');
    const isAdminAuthenticated = request.cookies.has('adminAccessToken');
    const userLoginUrl = `${request.nextUrl.protocol}//${USER_LOGIN_HOST}/login`;

    // Public detail routes should never be served on admin host.
    // Redirect them to app host to keep one canonical app domain.
    if (
        process.env.NODE_ENV === 'production' &&
        isAdminHost &&
        isPublicDetailPath(pathname)
    ) {
        const target = `${request.nextUrl.protocol}//${APP_WEB_HOST}${pathname}${request.nextUrl.search}`;
        return redirectWithMethodAwareness(request, target);
    }

    // Force admin routes to dedicated admin host in production.
    if (
        process.env.NODE_ENV === 'production' &&
        isAdminRoute &&
        !isAdminHost
    ) {
        const targetPath = pathname === '/admin'
            ? '/dashboard'
            : (pathname.replace(/^\/admin/, '') || '/');
        const target = `${request.nextUrl.protocol}//${ADMIN_WEB_HOST}${targetPath}${request.nextUrl.search}`;
        return redirectWithMethodAwareness(request, target);
    }

    // Admin host root mapping:
    // - keep clean URLs (/login, /dashboard, ...)
    // - internally serve /admin/* pages via rewrite.
    if (isAdminHost) {
        if (pathname === '/admin') {
            return redirectWithMethodAwareness(request, '/dashboard');
        }
        if (pathname.startsWith('/admin/')) {
            const targetPath = pathname === '/admin/login'
                ? '/login'
                : (pathname.replace(/^\/admin/, '') || '/');
            return redirectWithMethodAwareness(request, `${targetPath}${request.nextUrl.search}`);
        }
        if (pathname === '/') {
            return redirectWithMethodAwareness(request, isAdminAuthenticated ? '/dashboard' : '/login');
        }
        if (pathname === '/login') {
            if (isAdminAuthenticated) {
                return redirectWithMethodAwareness(request, '/dashboard');
            }
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = '/admin/login';
            return NextResponse.rewrite(rewriteUrl);
        }
        if (isAdminRootPath) {
            if (!isAdminAuthenticated) {
                return redirectWithMethodAwareness(request, '/login');
            }
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = `/admin${pathname}`;
            return NextResponse.rewrite(rewriteUrl);
        }
    }

    // 1. Subdomain Handling (app.fresherflow.in)
    // If user hits 'app.domain.com' root, they want app entry.
    if (hostname.startsWith('app.')) {
        if (pathname === '/') {
            if (isAuthenticated) return redirectWithMethodAwareness(request, '/dashboard');
            return redirectWithMethodAwareness(request, userLoginUrl);
        }
        if (pathname === '/login') {
            if (isAuthenticated) return redirectWithMethodAwareness(request, '/dashboard');
            return redirectWithMethodAwareness(request, userLoginUrl);
        }
    }

    // 2. Admin Route Protection
    if (isAdminRoute && !isAdminLogin) {
        if (!isAdminAuthenticated) {
            const target = `${request.nextUrl.protocol}//${ADMIN_WEB_HOST}/login`;
            return redirectWithMethodAwareness(request, target);
        }
    }

    // 3. User Route Protection (cookie marker gate only)
    if (isUserPath && !isAuthenticated) {
        const loginUrl = new URL(userLoginUrl);
        loginUrl.searchParams.set('redirect', pathname);
        const method = request.method.toUpperCase();
        const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
        return NextResponse.redirect(loginUrl, status);
    }

    // 4. Login route guard
    if (pathname === '/login' && isAuthenticated) {
        const dashboardUrl = `${request.nextUrl.protocol}//${APP_WEB_HOST}/dashboard`;
        return redirectWithMethodAwareness(request, dashboardUrl);
    }

    // Keep fresherflow.in root as landing page always.
    if (normalizedHost === PUBLIC_WEB_HOST && pathname === '/') {
        return NextResponse.next();
    }

    // 5. Main non-landing host root handling
    if (pathname === '/' && isAuthenticated) {
        return redirectWithMethodAwareness(request, '/dashboard');
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/',
        '/admin',
        '/login',
        '/dashboard/:path*',
        '/opportunities/:path*',
        '/jobs/:path*',
        '/internships/:path*',
        '/walkins/:path*',
        '/walk-ins/:path*',
        '/analytics/:path*',
        '/feedback/:path*',
        '/alerts/:path*',
        '/telegram/:path*',
        '/settings/:path*',
        '/account/:path*',
        '/profile/:path*',
        '/admin/:path*',
    ],
};
