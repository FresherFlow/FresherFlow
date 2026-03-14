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
const APP_ONLY_PREFIXES = ['/dashboard', '/account', '/profile', '/alerts'];
const SOCIAL_PREVIEW_BOT_UA = /(facebookexternalhit|facebot|twitterbot|xbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|skypeuripreview|applebot)/i;
const KNOWN_CRAWLER_UA = /(bot|crawler|spider|slurp|bingpreview|curl|wget|python-requests|headless)/i;

function isUserProtectedPath(pathname: string): boolean {
    return pathname.startsWith('/dashboard') || pathname.startsWith('/account') || pathname.startsWith('/profile') || pathname.startsWith('/alerts');
}

function isAppOnlyPath(pathname: string): boolean {
    return APP_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
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
    if (pathname.startsWith('/walk-ins/details/') || pathname.startsWith('/walkins/details/')) return true;
    if (pathname.startsWith('/jobs/')) return pathname !== '/jobs/new';
    if (pathname.startsWith('/internships/')) return true;
    if (pathname.startsWith('/opportunities/')) {
        if (pathname === '/opportunities/create') return false;
        if (pathname.startsWith('/opportunities/edit/')) return false;
        return true;
    }
    return false;
}

function isPublicCanonicalPath(pathname: string): boolean {
    if (pathname === '/' || pathname === '/login' || pathname === '/jobs' || pathname === '/internships' || pathname === '/walk-ins' || pathname === '/opportunities') {
        return true;
    }
    if (pathname.startsWith('/jobs/')) return true;
    if (pathname.startsWith('/internships/')) return true;
    if (pathname.startsWith('/walk-ins/')) return true;
    if (pathname.startsWith('/walkins/')) return true;
    if (pathname.startsWith('/opportunities/')) {
        if (pathname === '/opportunities/create') return false;
        if (pathname.startsWith('/opportunities/edit/')) return false;
        return true;
    }
    if (pathname.startsWith('/companies/')) return true;
    return false;
}

function redirectWithMethodAwareness(request: NextRequest, target: string, permanent: boolean = false) {
    const url = new URL(target, request.url);
    const method = request.method.toUpperCase();
    let status = 307;
    if (permanent) {
        status = 308;
    } else if (method !== 'GET' && method !== 'HEAD') {
        status = 303;
    }
    return NextResponse.redirect(url, status);
}

function withNoIndex(response: NextResponse) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
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
    const isAppHost = normalizedHost === APP_WEB_HOST;
    const isAdminRootPath = ADMIN_ROOT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    const isAdminRoute = pathname.startsWith('/admin');
    const isAdminLogin = pathname === '/admin/login' || pathname === '/login';
    const isUserPath = isUserProtectedPath(pathname);
    const isPublicPath = isPublicCanonicalPath(pathname);
    const isPublicHubPath = pathname === '/' || pathname === '/jobs' || pathname === '/internships' || pathname === '/walk-ins' || pathname === '/opportunities';
    const shouldNoIndex = isAdminHost || isAppHost || isAdminRoute || (isAdminRootPath && !isPublicHubPath) || pathname === '/logout' || pathname === '/index' || pathname === '/admin-manifest.json';

    let response: NextResponse | undefined;

    if ((isKnownCrawler(request) || isLowValuePrefetch(request)) && !isAdminRoute && !isAdminRootPath && !isUserPath) {
        if (isAppHost && isPublicPath) {
            const target = `${request.nextUrl.protocol}//${PUBLIC_WEB_HOST}${pathname}${request.nextUrl.search}`;
            return redirectWithMethodAwareness(request, target, true);
        }
        response = shouldNoIndex ? withNoIndex(NextResponse.next()) : NextResponse.next();
    }

    if (!response && process.env.NODE_ENV === 'production' && pathname.startsWith('/dev')) {
        return redirectWithMethodAwareness(request, '/');
    }

    const isAuthenticated = request.cookies.has('ff_logged_in') || request.cookies.has('accessToken');
    const isAdminAuthenticated = request.cookies.has('adminAccessToken');
    const userLoginUrl = `${request.nextUrl.protocol}//${USER_LOGIN_HOST}/login`;

    if (!response && process.env.NODE_ENV === 'production' && normalizedHost === PUBLIC_WEB_HOST) {
        // On Public Domain:
        if (isUserPath || (isPublicPath && isAuthenticated)) {
            // Move logged-in users to the App domain for ALL paths (Private OR Public)
            // Move guests to App domain for Private paths (triggering login redirect there)
            const target = `${request.nextUrl.protocol}//${APP_WEB_HOST}${pathname}${request.nextUrl.search}`;
            return redirectWithMethodAwareness(request, target, true);
        }
    }

    if (!response && process.env.NODE_ENV === 'production' && isAppHost) {
        // On App Domain:
        if (isPublicPath && !isAuthenticated) {
            // Force Guests back to Public domain for Public paths
            const target = `${request.nextUrl.protocol}//${PUBLIC_WEB_HOST}${pathname}${request.nextUrl.search}`;
            return redirectWithMethodAwareness(request, target, true);
        }
    }

    if (
        !response &&
        process.env.NODE_ENV === 'production' &&
        normalizedHost === PUBLIC_WEB_HOST &&
        pathname !== '/' &&
        !isPublicPath &&
        !((isPreviewBot || isSocialShare) && isPublicDetailPath(pathname))
    ) {
        const target = `${request.nextUrl.protocol}//${APP_WEB_HOST}${pathname}${request.nextUrl.search}`;
        return redirectWithMethodAwareness(request, target, true);
    }

    if (!response && process.env.NODE_ENV === 'production' && isAdminHost && isPublicDetailPath(pathname)) {
        const target = `${request.nextUrl.protocol}//${PUBLIC_WEB_HOST}${pathname}${request.nextUrl.search}`;
        return redirectWithMethodAwareness(request, target, true);
    }

    if (!response && process.env.NODE_ENV === 'production' && isAdminRoute && !isAdminHost) {
        const targetPath = pathname === '/admin' ? '/dashboard' : (pathname.replace(/^\/admin/, '') || '/');
        const target = `${request.nextUrl.protocol}//${ADMIN_WEB_HOST}${targetPath}${request.nextUrl.search}`;
        return redirectWithMethodAwareness(request, target, true);
    }

    if (!response && isAdminHost) {
        if (pathname === '/admin-manifest.json') {
            response = withNoIndex(NextResponse.next());
        } else if (pathname === '/admin') {
            return redirectWithMethodAwareness(request, '/dashboard', true);
        } else if (pathname.startsWith('/admin/')) {
            const targetPath = pathname === '/admin/login' ? '/login' : (pathname.replace(/^\/admin/, '') || '/');
            return redirectWithMethodAwareness(request, `${targetPath}${request.nextUrl.search}`, true);
        } else if (pathname === '/') {
            return withNoIndex(redirectWithMethodAwareness(request, isAdminAuthenticated ? '/dashboard' : '/login'));
        } else if (pathname === '/login') {
            if (isAdminAuthenticated) {
                return withNoIndex(redirectWithMethodAwareness(request, '/dashboard'));
            }
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = '/admin/login';
            response = withNoIndex(NextResponse.rewrite(rewriteUrl));
        } else if (isAdminRootPath) {
            if (!isAdminAuthenticated) {
                return withNoIndex(redirectWithMethodAwareness(request, '/login'));
            }
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = `/admin${pathname}`;
            response = withNoIndex(NextResponse.rewrite(rewriteUrl));
        } else {
            const target = `${request.nextUrl.protocol}//${PUBLIC_WEB_HOST}${pathname}${request.nextUrl.search}`;
            return redirectWithMethodAwareness(request, target, true);
        }
    }

    if (!response && isAppHost) {
        if (pathname === '/') {
            if (isAuthenticated) return withNoIndex(redirectWithMethodAwareness(request, '/dashboard'));
            const loginTarget = new URL(userLoginUrl);
            if (loginTarget.hostname !== normalizedHost || loginTarget.pathname !== '/login') {
                return withNoIndex(redirectWithMethodAwareness(request, userLoginUrl));
            }
            response = withNoIndex(NextResponse.next());
        } else if (pathname === '/login') {
            if (isAuthenticated) return withNoIndex(redirectWithMethodAwareness(request, '/dashboard'));
            response = withNoIndex(NextResponse.next());
        } else if (!isAppOnlyPath(pathname)) {
            const target = `${request.nextUrl.protocol}//${PUBLIC_WEB_HOST}${pathname}${request.nextUrl.search}`;
            return redirectWithMethodAwareness(request, target, true);
        }
    }

    if (!response && isAdminRoute && !isAdminLogin) {
        if (!isAdminAuthenticated) {
            const target = `${request.nextUrl.protocol}//${ADMIN_WEB_HOST}/login`;
            return withNoIndex(redirectWithMethodAwareness(request, target));
        }
    }

    if (!response && isUserPath && !isAuthenticated) {
        const loginUrl = new URL(userLoginUrl);
        loginUrl.searchParams.set('redirect', pathname);
        const method = request.method.toUpperCase();
        const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
        return withNoIndex(NextResponse.redirect(loginUrl, status));
    }

    if (!response && pathname === '/login' && isAuthenticated) {
        const dashboardUrl = `${request.nextUrl.protocol}//${APP_WEB_HOST}/dashboard`;
        return withNoIndex(redirectWithMethodAwareness(request, dashboardUrl));
    }

    if (!response && normalizedHost === PUBLIC_WEB_HOST && pathname === '/') {
        response = NextResponse.next();
    }

    if (!response && pathname === '/' && isAuthenticated) {
        return withNoIndex(redirectWithMethodAwareness(request, '/dashboard'));
    }

    if (!response) {
        response = shouldNoIndex ? withNoIndex(NextResponse.next()) : NextResponse.next();
    }

    // CORS logic for cross-subdomain redirects and fetches
    const origin = request.headers.get('origin');
    if (origin && (origin.endsWith('.fresherflow.in') || origin === 'https://fresherflow.in')) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Requested-From, X-Request-Id, sentry-trace, baggage');
    }

    return response;
}

export const config = {
    matcher: [
        '/',
        '/admin',
        '/login',
        '/signup',
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
        '/companies/:path*',
        '/logout',
        '/index',
        '/admin-manifest.json',
    ],
};
