import { NextRequest, NextResponse } from "next/server";
import { isUserPath } from "./paths";
import { ADMIN_WEB_HOST } from "./utils";

export function applySeoHeaders(req: NextRequest, res: NextResponse) {
    const { pathname, hostname } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();

    const isAuthUtility = pathname === '/login' || pathname === '/signup' || pathname === '/logout' || pathname === '/index';
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
        normalizedHost === ADMIN_WEB_HOST ||
        pathname.startsWith('/admin')
    ) {
        res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }

    if (pathname.startsWith('/dev/')) {
        res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }

    return res;
}
