import { NextRequest, NextResponse } from "next/server";
import { isUserPath } from "./paths";
import { PUBLIC_WEB_HOST } from "./utils";

export function applySeoHeaders(req: NextRequest, res: NextResponse) {
    const { pathname, hostname } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();

    const isAuthUtility = pathname === '/login' || pathname === '/signup' || pathname === '/logout';
    const isExplicitNoIndexPath =
        pathname === '/deadlines' ||
        pathname === '/referral' ||
        pathname === '/sentry-example-page' ||
        pathname.startsWith('/companies/');

    if (
        isUserPath(pathname) ||
        isExplicitNoIndexPath ||
        isAuthUtility ||
        pathname === '/admin-manifest.json' ||
        (normalizedHost !== PUBLIC_WEB_HOST && !normalizedHost.includes('localhost')) ||
        pathname.startsWith('/admin')
    ) {
        res.headers.set("X-Robots-Tag", "noindex, follow, noarchive");
    }

    if (pathname.startsWith('/dev/')) {
        res.headers.set("X-Robots-Tag", "noindex, follow, noarchive");
    }

    return res;
}
