import { NextRequest, NextResponse } from "next/server";
import { isPublicPath, isUserPath, isAuthPath, isPublicDetailPath } from "./paths";
import { getHostRole, redirectWithMethodAwareness, resolveHosts } from "./hostResolution";

export function handleHostRouting(req: NextRequest) {
    const { hostname, pathname, search } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const { PUBLIC_WEB_HOST, ADMIN_WEB_HOST, USER_LOGIN_HOST } = resolveHosts(req);
    const hostRole = getHostRole(normalizedHost, req);
    // Ensure admin.* hosts always route to the admin area regardless of other role checks
    const isAdminHost = normalizedHost.startsWith('admin.');
    if (hostRole === 'other' && !isAdminHost) {
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

        const targetUrl = new URL(`${req.nextUrl.protocol}//${USER_LOGIN_HOST}/signup`);
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

    // 1. Admin Host handling — always route admin.* hosts to /admin prefix
    if (hostRole === 'admin' || isAdminHost) {
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

    // 3. Public Host handling (fresherflow.in)
    //
    // There is no app host: the signed-in app is served from this same public
    // host. Any host that is not admin. or join. falls through to here as
    // 'public' when it matches the configured/derived public host, and to
    // 'other' (no routing) when it matches nothing known.
    if (hostRole === 'public') {
        // fresherflow.in + PRIVATE route or AUTH route -> 308 the login host.
        // Never redirect to ourselves: in a single-domain deployment the login
        // host IS the public host, and an unconditional redirect here is a
        // self-inflicted 308 loop that looks like "login reloads forever".
        if ((isUserPath(pathname) || isAuthPath(pathname)) && USER_LOGIN_HOST !== normalizedHost) {
            return NextResponse.redirect(
                `${req.nextUrl.protocol}//${USER_LOGIN_HOST}${pathname}${search}`,
                308
            );
        }
        
        return null;
    }

    return null;
}
