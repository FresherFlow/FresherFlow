import { NextRequest, NextResponse } from "next/server";
import { handleHostRouting } from "@/lib/config/hosts";
import { handleAuth } from "@/lib/config/auth";
import { applySeoHeaders } from "@/lib/config/seo";
import { logRouteResult } from "@/lib/observability";

/**
 * Standard Next.js Proxy (formerly Middleware)
 * Handles host routing, maintenance mode, and authentication limits.
 */
export default function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Redirect /home -> / permanently
    if (pathname === '/home') {
        const url = req.nextUrl.clone();
        url.pathname = '/';
        logRouteResult('/home', '308');
        return NextResponse.redirect(url, 308); // 308 Permanent Redirect
    }
    if (pathname.startsWith('/home/')) {
        const url = req.nextUrl.clone();
        const suffix = pathname.slice(6);
        url.pathname = suffix.startsWith('/') ? suffix : `/${suffix}`;
        logRouteResult('/home/*', '308');
        return NextResponse.redirect(url, 308);
    }

    // Prevent bot fallthroughs for case-mismatched paths
    // Ignore internal routes, static files, and API routes
    const isInternalOrAsset = 
        pathname.startsWith('/api/') || 
        pathname.startsWith('/_next/') || 
        pathname.includes('.') || 
        pathname.startsWith('/static/');

    if (!isInternalOrAsset && /[A-Z]/.test(pathname)) {
        const url = req.nextUrl.clone();
        url.pathname = pathname.toLowerCase();
        logRouteResult(pathname, '308');
        return NextResponse.redirect(url, 308);
    }

    // 0. Check if maintenance mode is active
    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
        if (req.nextUrl.pathname.startsWith('/api')) {
            return new NextResponse(
                JSON.stringify({ status: 'dormant', message: 'API is hibernation mode.' }),
                { status: 503, headers: { 'content-type': 'application/json' } }
            );
        }

        return new NextResponse(
            'FresherFlow is currently in Hibernate mode to conserve resources. We will be back soon!',
            { status: 503, headers: { 'content-type': 'text/plain' } }
        );
    }

    // 0b. Enforce Basic Auth / Cookie check on cap subdomain and block captions page on main domain
    const host = req.headers.get('host') || '';
    const isCapSubdomain = host.startsWith('cap.');

    if (isCapSubdomain) {
        const hasAuthCookie = req.cookies.get('captions_auth')?.value === '1';
        const basicAuth = req.headers.get('authorization');
        let authenticated = hasAuthCookie;

        if (!authenticated && basicAuth) {
            try {
                const authValue = basicAuth.split(' ')[1];
                const [user, pwd] = atob(authValue).split(':');

                const expectedUser = process.env.BASIC_AUTH_USER;
                const expectedPass = process.env.BASIC_AUTH_PASSWORD;

                if (expectedUser && expectedPass && user === expectedUser && pwd === expectedPass) {
                    authenticated = true;
                }
            } catch {
                // Fail silently
            }
        }

        if (!authenticated) {
            const isApi = pathname.startsWith('/api/');
            if (isApi) {
                return new NextResponse('Auth Required', {
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Basic realm="Secure Area"',
                    },
                });
            }
        }

        // Rewrite root path "/" or "/captions" on the subdomain to the internal "/captions" route
        if (pathname === '/' || pathname === '/captions') {
            const url = req.nextUrl.clone();
            url.pathname = '/captions';
            return NextResponse.rewrite(url);
        }
    } else {
        // Hide captions page on the main domain (redirect to 404)
        if (pathname === '/captions') {
            const url = req.nextUrl.clone();
            url.pathname = '/404';
            return NextResponse.rewrite(url);
        }
    }

    // 1. Handle Host Restrictions & Rewrites
    const hostResult = handleHostRouting(req);
    if (hostResult && hostResult.status >= 300 && hostResult.status < 400) {
        return hostResult;
    }

    // 2. Enforce Authentication Limits
    const authResult = handleAuth(req);
    if (authResult) return authResult;

    // 3. Complete response and apply SEO NoIndex rules
    const response = hostResult || NextResponse.next();
    return applySeoHeaders(req, response);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};
