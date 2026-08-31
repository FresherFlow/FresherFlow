import { NextRequest, NextResponse } from "next/server";
import { isUserPath, isAuthPath } from "./paths";
import { getHostRole, redirectWithMethodAwareness, resolveHosts } from "./utils";


export function handleAuth(req: NextRequest) {
    const { pathname, hostname } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const { ADMIN_WEB_HOST } = resolveHosts(req);
    const hostRole = getHostRole(normalizedHost, req);
    const effectivePathname = normalizedHost === ADMIN_WEB_HOST && !isAuthPath(pathname) && !pathname.startsWith('/admin')
        ? `/admin${pathname === '/' ? '' : pathname}`
        : pathname;

    const adminLoggedIn = req.cookies.has("adminAccessToken") || req.cookies.has("ff_admin_logged_in");

    // Admin Auth
    if (hostRole === 'admin') {
        if (!adminLoggedIn && effectivePathname !== '/admin/login' && !isAuthPath(pathname)) {
             return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${ADMIN_WEB_HOST}/login`);
        }
        if ((isAuthPath(pathname) || effectivePathname === '/admin/login') && adminLoggedIn) {
             return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${ADMIN_WEB_HOST}/dashboard`);
        }
    }

    if (isUserPath(pathname) && hostRole !== 'admin') {
        // Enforce the standard login auth gate for user paths
        const loggedIn = req.cookies.has("accessToken") || req.cookies.has("ff_logged_in");
        if (!loggedIn) {
            const loginUrl = new URL(`${req.nextUrl.protocol}//${req.nextUrl.host}/login`);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl, 307);
        }
    }

    if (isAuthPath(pathname) && hostRole !== 'admin') {
        // Enforce the standard auth gate to prevent logged in users from seeing login again
        const loggedIn = req.cookies.has("accessToken") || req.cookies.has("ff_logged_in");
        const isExpiredFlow = req.nextUrl.searchParams.has('expired') || req.nextUrl.searchParams.has('logout');
        if (loggedIn && !isExpiredFlow) {
            const url = new URL(`${req.nextUrl.protocol}//${req.nextUrl.host}/dashboard`);
            return NextResponse.redirect(url, 307);
        }
    }

    return null;
}
