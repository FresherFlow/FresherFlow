import { NextRequest, NextResponse } from "next/server";
import { handleHostRouting } from "./proxy/hosts";
import { handleAuth } from "./proxy/auth";
import { applySeoHeaders } from "./proxy/seo";

export function proxy(req: NextRequest) {
    // 0. Check if maintenance mode is active (migrated from middleware.ts)
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
