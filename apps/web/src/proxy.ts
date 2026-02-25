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
const ADMIN_ROOT_PREFIXES = [
    '/dashboard',
    '/opportunities',
    '/jobs',
    '/walkins',
    '/analytics',
    '/feedback',
    '/alerts',
    '/telegram',
    '/settings',
];

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

export function proxy(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const isAdminHost = normalizedHost === ADMIN_WEB_HOST;
    const isAdminRootPath = ADMIN_ROOT_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    // Keep internal preview routes out of production traffic.
    if (process.env.NODE_ENV === 'production' && pathname.startsWith('/dev')) {
        return redirectWithMethodAwareness(request, '/');
    }

    // Check for session marker
    const isAuthenticated = request.cookies.has('ff_logged_in') || request.cookies.has('accessToken');
    const isAdminAuthenticated = request.cookies.has('adminAccessToken');
    const isAdminRoute = pathname.startsWith('/admin');
    const isAdminLogin = pathname === '/admin/login';

    // Public detail routes should never be served on admin host.
    // Redirect them to the public web host to avoid /admin-domain 404s.
    if (
        process.env.NODE_ENV === 'production' &&
        isAdminHost &&
        isPublicDetailPath(pathname)
    ) {
        const target = `${request.nextUrl.protocol}//${PUBLIC_WEB_HOST}${pathname}${request.nextUrl.search}`;
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
            return redirectWithMethodAwareness(request, '/login');
        }
    }

    // 2. Admin Route Protection
    if (isAdminRoute && !isAdminLogin) {
        if (!isAdminAuthenticated) {
            return redirectWithMethodAwareness(request, '/admin/login');
        }
    }

    // 3. User Route Protection (cookie marker gate only)
    const isUserProtectedPath =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/account') ||
        pathname.startsWith('/profile');

    if (isUserProtectedPath && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const method = request.method.toUpperCase();
        const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
        return NextResponse.redirect(loginUrl, status);
    }

    // 4. Login route guard
    if (pathname === '/login' && isAuthenticated) {
        return redirectWithMethodAwareness(request, '/dashboard');
    }

    // 5. Main Domain Root Handling
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
