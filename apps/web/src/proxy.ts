import { NextRequest, NextResponse } from "next/server";
import { handleHostRouting } from "./proxy/hosts";
import { handleAuth } from "./proxy/auth";
import { applySeoHeaders } from "./proxy/seo";

export function proxy(req: NextRequest) {

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
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};





