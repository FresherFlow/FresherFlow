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

    // 0. Join Subdomain (join.fresherflow.in / join.fresherflow.com) handling
    if (hostRole === 'join') {
        const rawPath = pathname.replace(/^\/+/, '');
        const segments = rawPath.split('/').filter(Boolean);
        let refCode = req.nextUrl.searchParams.get('ref');

        // If URL format is join.fresherflow.in/ABC123
        if (!refCode && segments.length === 1 && !['login', 'signup', 'api', '_next'].includes(segments[0].toLowerCase())) {
            refCode = segments[0];
        }

        const targetUrl = new URL(`${req.nextUrl.protocol}//${USER_LOGIN_HOST}/login`);
        targetUrl.searchParams.set('intent', 'signup');
        if (refCode) {
            targetUrl.searchParams.set('ref', refCode.toUpperCase());
        }

        const res = NextResponse.redirect(targetUrl, 307);
        if (refCode) {
            // Set 30-day persistent cookie to preserve referral code across tabs/browsing
            res.cookies.set('ff_ref_code', refCode.toUpperCase(), {
                maxAge: 30 * 24 * 60 * 60,
                path: '/',
                sameSite: 'lax',
            });
        }
        return res;
    }

    // 1. Admin Host handling
    if (hostRole === 'admin') {
        if (pathname === '/admin-manifest.json') {
            return NextResponse.next();
        }
        if (isPublicDetailPath(pathname)) {
            return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${PUBLIC_WEB_HOST}${pathname}${search}`);
        }
        // Rewrite admin.fresherflow.in/* -> /admin/* (except API routes)
        const rewriteUrl = req.nextUrl.clone();
        if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
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
