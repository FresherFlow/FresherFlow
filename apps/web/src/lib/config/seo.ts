import { NextRequest, NextResponse } from "next/server";
import { isUserPath } from "./paths";
import { getHostRole, resolveHosts } from "./hostResolution";

export function applySeoHeaders(req: NextRequest, res: NextResponse) {
    const { pathname, hostname } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const { PUBLIC_WEB_HOST } = resolveHosts(req);
    const hostRole = getHostRole(normalizedHost, req);

    const isAuthUtility = pathname === '/login' || pathname === '/signup' || pathname === '/logout';
    // Private tab views on public routes must never be indexed.
    const hasPrivateTab =
        (pathname === '/jobs' && req.nextUrl.searchParams.has('tab')) ||
        (pathname === '/community' && req.nextUrl.searchParams.has('tab'));
    const isExplicitNoIndexPath =
        pathname === '/deadlines' ||
        pathname === '/account' ||
        hasPrivateTab ||
        pathname === '/sentry-example-page';

    if (
        isUserPath(pathname) ||
        isExplicitNoIndexPath ||
        isAuthUtility ||
        pathname === '/admin-manifest.json' ||
        (hostRole !== 'public' && normalizedHost !== PUBLIC_WEB_HOST && !normalizedHost.includes('localhost')) ||
        pathname.startsWith('/admin')
    ) {
        res.headers.set("X-Robots-Tag", "noindex, follow, noarchive");
    }

    if (pathname.startsWith('/dev/')) {
        res.headers.set("X-Robots-Tag", "noindex, follow, noarchive");
    }

    return res;
}
