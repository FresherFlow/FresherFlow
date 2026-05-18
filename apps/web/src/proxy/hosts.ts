import { NextRequest, NextResponse } from "next/server";
import { isPublicDetailPath } from "./paths";
import { getHostRole, redirectWithMethodAwareness, resolveHosts } from "./utils";

export function handleHostRouting(req: NextRequest) {
    const { hostname, pathname, search } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const { PUBLIC_WEB_HOST, ADMIN_WEB_HOST, USER_LOGIN_HOST } = resolveHosts(req);
    const hostRole = getHostRole(normalizedHost, req);
    const isProd = process.env.NODE_ENV === 'production';

    if (!isProd) {
        return null;
    }

    // 1. Admin Host handling
    if (hostRole === 'admin') {
        if (pathname === '/admin-manifest.json') {
            return NextResponse.next();
        }
        if (isPublicDetailPath(pathname)) {
            return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${PUBLIC_WEB_HOST}${pathname}${search}`);
        }
        // Rewrite admin.fresherflow.in/* -> /admin/*
        const rewriteUrl = req.nextUrl.clone();
        if (!pathname.startsWith('/admin')) {
            rewriteUrl.pathname = `/admin${pathname}`;
        }
        return NextResponse.rewrite(rewriteUrl);
    }

    // 2. Map /admin to Admin Host
    if (pathname.startsWith('/admin')) {
        const plainPath = pathname === '/admin' ? '/dashboard' : pathname.replace(/^\/admin/, '');
        return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${ADMIN_WEB_HOST}${plainPath}${search}`);
    }

    // 3. Public Host handling
    // NOTE: app.fresherflow.in is temporarily disabled.
    // All paths serve directly from fresherflow.in — no redirects to app subdomain.
    if (hostRole === 'public') {
        if (pathname === '/login') {
            return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${USER_LOGIN_HOST}${pathname}${search}`);
        }
        if (pathname === '/signup') {
            const loginUrl = new URL(`${req.nextUrl.protocol}//${USER_LOGIN_HOST}/login`);
            loginUrl.searchParams.set('intent', 'signup');
            return NextResponse.redirect(loginUrl, 307);
        }
        return null;
    }

    return null;
}
