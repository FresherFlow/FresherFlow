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
    const { ADMIN_WEB_HOST } = resolveHosts(req);
    const hostRole = getHostRole(normalizedHost, req);
    const effectivePathname = normalizedHost === ADMIN_WEB_HOST && pathname !== '/login' && !pathname.startsWith('/admin')
        ? `/admin${pathname === '/' ? '' : pathname}`
        : pathname;

    const loggedIn = req.cookies.has("accessToken") || req.cookies.has("ff_logged_in");
    const adminLoggedIn = req.cookies.has("adminAccessToken") || req.cookies.has("ff_admin_logged_in");

    // Admin Auth
    if (hostRole === 'admin') {
        if (!adminLoggedIn && effectivePathname !== '/admin/login' && pathname !== '/login') {
             return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${ADMIN_WEB_HOST}/login`);
        }
        if ((pathname === '/login' || effectivePathname === '/admin/login') && adminLoggedIn) {
             return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${ADMIN_WEB_HOST}/dashboard`);
        }
    }

    // WEB PIVOT: user/account routes are frozen for now. Keep old login/dashboard logic here
    // for later restoration, but send users to the app download page instead of waking APIs.
    // if (isUserPath(pathname) && !loggedIn) {
    //     const loginUrl = new URL(`${req.nextUrl.protocol}//${req.nextUrl.host}/login`);
    //     loginUrl.searchParams.set("redirect", pathname);
    //     return NextResponse.redirect(loginUrl, 307);
    // }
    if (isUserPath(pathname) && hostRole !== 'admin') {
        return NextResponse.redirect(new URL('/download', req.url), 307);
    }

    // if (pathname === "/login" && loggedIn && hostRole !== 'admin') {
    //     return redirectWithMethodAwareness(req, getSafeRedirectTarget(req.nextUrl.searchParams.get('redirect')));
    // }

    // if (pathname === "/" && loggedIn && hostRole !== 'admin') {
    //     return redirectWithMethodAwareness(req, "/dashboard");
    // }

    return null;
}
