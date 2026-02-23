import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

async function safeAuthCheck(url: string, cookieHeader: string) {
    try {
        const response = await fetch(url, {
            headers: { cookie: cookieHeader },
            cache: 'no-store'
        });
        return response.ok;
    } catch {
        return false;
    }
}

function redirectWithMethodAwareness(request: NextRequest, target: string) {
    const url = new URL(target, request.url);
    const method = request.method.toUpperCase();
    const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
    return NextResponse.redirect(url, status);
}

export async function proxy(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;
    const cookieHeader = request.headers.get('cookie') || '';

    // Keep internal preview routes out of production traffic.
    if (process.env.NODE_ENV === 'production' && pathname.startsWith('/dev')) {
        return redirectWithMethodAwareness(request, '/');
    }

    // Check for session marker
    const isAuthenticated = request.cookies.has('ff_logged_in') || request.cookies.has('accessToken');
    const isAdminAuthenticated = request.cookies.has('adminAccessToken');
    const isAdminRoute = pathname.startsWith('/admin');
    const isAdminLogin = pathname === '/admin/login';

    const userProtectedPaths = [
        '/dashboard',
        '/opportunities',
        '/jobs',
        '/internships',
        '/walk-ins',
        '/profile/complete',
        '/profile',
        '/account',
        '/account/saved',
        '/account/tracker',
    ];

    // 1. Subdomain Handling (app.fresherflow.in)
    // If user hits 'app.domain.com' root, they always want the app.
    if (hostname.startsWith('app.')) {
        if (pathname === '/') {
            if (isAuthenticated && API_URL) {
                const userOk = await safeAuthCheck(`${API_URL}/api/auth/me`, cookieHeader);
                if (userOk) {
                    return redirectWithMethodAwareness(request, '/dashboard');
                }
                return redirectWithMethodAwareness(request, '/login');
            }

            // If logged in marker exists but API_URL is missing, fall back to optimistic redirect.
            if (isAuthenticated) return redirectWithMethodAwareness(request, '/dashboard');
            return redirectWithMethodAwareness(request, '/login');
        }
    }

    // 2. Admin Route Protection
    if (isAdminRoute && !isAdminLogin) {
        if (!isAdminAuthenticated) {
            return redirectWithMethodAwareness(request, '/admin/login');
        }
        if (API_URL) {
            const adminOk = await safeAuthCheck(`${API_URL}/api/admin/auth/me`, cookieHeader);
            if (!adminOk) {
                return redirectWithMethodAwareness(request, '/admin/login');
            }
        }
    }

    // 3. User Route Protection (exact matches only)
    if (userProtectedPaths.includes(pathname) && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const method = request.method.toUpperCase();
        const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
        return NextResponse.redirect(loginUrl, status);
    }
    if (userProtectedPaths.includes(pathname) && isAuthenticated && API_URL) {
        const userOk = await safeAuthCheck(`${API_URL}/api/auth/me`, cookieHeader);
        if (!userOk) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            const method = request.method.toUpperCase();
            const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
            return NextResponse.redirect(loginUrl, status);
        }
    }

    // 4. Main Domain Root Handling
    // Redirect to dashboard only when auth is actually valid (prevents stale-cookie loops).
    if (pathname === '/' && isAuthenticated) {
        if (API_URL) {
            const userOk = await safeAuthCheck(`${API_URL}/api/auth/me`, cookieHeader);
            if (!userOk) return NextResponse.next();
        }
        return redirectWithMethodAwareness(request, '/dashboard');
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|js|css|woff|woff2|ttf|eot)).*)',
    ],
};
