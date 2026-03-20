import { NextRequest, NextResponse } from "next/server";
import { isUserPath } from "./paths";
import { ADMIN_WEB_HOST, USER_LOGIN_HOST, redirectWithMethodAwareness } from "./utils";

export function handleAuth(req: NextRequest) {
    const { pathname, hostname } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const effectivePathname = normalizedHost === ADMIN_WEB_HOST && pathname !== '/login' && !pathname.startsWith('/admin')
        ? `/admin${pathname === '/' ? '' : pathname}`
        : pathname;

    const loggedIn = req.cookies.has("accessToken") || req.cookies.has("ff_logged_in");
    const adminLoggedIn = req.cookies.has("adminAccessToken");

    // Admin Auth
    if (normalizedHost === ADMIN_WEB_HOST) {
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

    if (pathname === "/login" && loggedIn && normalizedHost !== ADMIN_WEB_HOST) {
        return redirectWithMethodAwareness(req, "/dashboard");
    }

    if (pathname === "/" && loggedIn && normalizedHost !== ADMIN_WEB_HOST) {
        return redirectWithMethodAwareness(req, "/dashboard");
    }

    return null;
}
