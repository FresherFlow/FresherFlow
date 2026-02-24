import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function redirectWithMethodAwareness(request: NextRequest, target: string) {
    const url = new URL(target, request.url);
    const method = request.method.toUpperCase();
    const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
    return NextResponse.redirect(url, status);
}

export function proxy(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;

    // Keep internal preview routes out of production traffic.
    if (process.env.NODE_ENV === 'production' && pathname.startsWith('/dev')) {
        return redirectWithMethodAwareness(request, '/');
    }

    // Check for session marker
    const isAuthenticated = request.cookies.has('ff_logged_in') || request.cookies.has('accessToken');
    const isAdminAuthenticated = request.cookies.has('adminAccessToken');
    const isAdminRoute = pathname.startsWith('/admin');
    const isAdminLogin = pathname === '/admin/login';

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
        '/login',
        '/dashboard/:path*',
        '/account/:path*',
        '/profile/:path*',
        '/admin/:path*',
    ],
};
