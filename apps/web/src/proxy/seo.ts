import { NextRequest, NextResponse } from "next/server";
import { isUserPath } from "./paths";
import { getHostRole, resolveHosts } from "./utils";

export function applySeoHeaders(req: NextRequest, res: NextResponse) {
    const { pathname, hostname } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const { PUBLIC_WEB_HOST } = resolveHosts(req);
    const hostRole = getHostRole(normalizedHost, req);

    const isAuthUtility = pathname === '/login' || pathname === '/signup' || pathname === '/logout';
    const isExplicitNoIndexPath =
        pathname === '/deadlines' ||
        pathname === '/referral' ||
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
