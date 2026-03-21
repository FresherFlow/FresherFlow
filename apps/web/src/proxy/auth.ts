import { NextRequest, NextResponse } from "next/server";
import { isUserPath } from "./paths";
import { getHostRole, redirectWithMethodAwareness, resolveHosts } from "./utils";

function getSafeRedirectTarget(raw: string | null): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
    if (raw === '/login' || raw.startsWith('/login?')) return '/dashboard';
    return raw;
}

export function handleAuth(req: NextRequest) {
    const { pathname, hostname } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const { ADMIN_WEB_HOST, USER_LOGIN_HOST } = resolveHosts(req);
    const hostRole = getHostRole(normalizedHost, req);
    const effectivePathname = normalizedHost === ADMIN_WEB_HOST && pathname !== '/login' && !pathname.startsWith('/admin')
        ? `/admin${pathname === '/' ? '' : pathname}`
        : pathname;

    const loggedIn = req.cookies.has("accessToken") || req.cookies.has("ff_logged_in");
    const adminLoggedIn = req.cookies.has("adminAccessToken");

    // Admin Auth
    if (hostRole === 'admin') {
        if (!adminLoggedIn && effectivePathname !== '/admin/login' && pathname !== '/login') {
             return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${ADMIN_WEB_HOST}/login`);
        }
        if ((pathname === '/login' || effectivePathname === '/admin/login') && adminLoggedIn) {
             return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${ADMIN_WEB_HOST}/dashboard`);
        }
    }

    // App/Public Auth
    if (isUserPath(pathname) && !loggedIn) {
        const loginUrl = new URL(`${req.nextUrl.protocol}//${USER_LOGIN_HOST}/login`);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl, 307);
    }

    if (pathname === "/login" && loggedIn && hostRole !== 'admin') {
        return redirectWithMethodAwareness(req, getSafeRedirectTarget(req.nextUrl.searchParams.get('redirect')));
    }

    if (pathname === "/" && loggedIn && hostRole !== 'admin') {
        return redirectWithMethodAwareness(req, "/dashboard");
    }

    return null;
}
