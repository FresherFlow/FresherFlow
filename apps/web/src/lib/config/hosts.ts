import { NextRequest, NextResponse } from "next/server";
import { isPublicPath, isUserPath, isAuthPath, isPublicDetailPath } from "./paths";
import { getHostRole, redirectWithMethodAwareness, resolveHosts } from "./utils";

export function handleHostRouting(req: NextRequest) {
    const { hostname, pathname, search } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const { PUBLIC_WEB_HOST, ADMIN_WEB_HOST, USER_LOGIN_HOST } = resolveHosts(req);
    const hostRole = getHostRole(normalizedHost, req);
    if (hostRole === 'other') {
        return null;
    }

    // 0. Join Subdomain (join.fresherflow.in / join.fresherflow.com) handling
    if (hostRole === 'join') {
        const rawPath = pathname.replace(/^\/+/, '');
        const segments = rawPath.split('/').filter(Boolean);
        let refCode = req.nextUrl.searchParams.get('ref');

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

    // Phase 4: Strict Host Enforcement
    
    // 3. App Host handling (app.fresherflow.in)
    if (hostRole === 'app') {
        // Redirect root to /dashboard (auth guard will bounce unauthenticated to /login)
        if (pathname === '/') {
            return NextResponse.redirect(
                `${req.nextUrl.protocol}//${USER_LOGIN_HOST}/dashboard`,
                308
            );
        }

        // app.fresherflow.in + PUBLIC route -> 308 fresherflow.in
        // Ensure we don't redirect auth paths or api routes
        if (!pathname.startsWith('/api') && isPublicPath(pathname) && !isAuthPath(pathname)) {
            return NextResponse.redirect(
                `${req.nextUrl.protocol}//${PUBLIC_WEB_HOST}${pathname}${search}`,
                308
            );
        }
        
        // App host + PRIVATE route -> allow (auth logic will handle login checks)
        // App host + AUTH route -> allow
        return null;
    }

    // 4. Public Host handling (fresherflow.in)
    if (hostRole === 'public') {
        // fresherflow.in + PRIVATE route or AUTH route -> 308 app.fresherflow.in
        if (isUserPath(pathname) || isAuthPath(pathname)) {
            return NextResponse.redirect(
                `${req.nextUrl.protocol}//${USER_LOGIN_HOST}${pathname}${search}`,
                308
            );
        }
        
        return null;
    }

    return null;
}
