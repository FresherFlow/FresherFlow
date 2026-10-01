import { NextRequest, NextResponse } from "next/server";
import { isUserPath, isAuthPath, isAuthEntryPath, isSafeInternalRedirect } from "./paths";
import { getHostRole, redirectWithMethodAwareness, resolveHosts } from "./hostResolution";


/**
 * Whether the request carries a real, server-issued session cookie.
 *
 * `ff_logged_in` is deliberately NOT accepted. It is written without `httpOnly`
 * by the API (`apps/api/src/routes/auth.ts`) and by the web login shell, so any
 * script on the origin can set or clear it. It stays in use as a *UI hint* —
 * pre-hydration CSS (`features/shell/HeadInjections.tsx`) and client-only gates
 * read it to paint the right shell before hydration — but it is not a
 * credential and must never decide authorization.
 *
 * Only the HttpOnly cookies count here. Both are issued and cleared by
 * `apps/api` and neither is writable from JavaScript.
 *
 * `refreshToken` is accepted alongside `accessToken` because `accessToken`
 * lives 15 minutes (`ACCESS_TOKEN_MAX_AGE_MS`) while the session lives 90 days;
 * requiring the short-lived one alone would 307 most returning visitors to
 * /login mid-session. This is a coarse routing gate, not authorization — the
 * API still verifies the token on every call and answers 401/403 regardless.
 */
function hasServerIssuedSessionCookie(req: NextRequest): boolean {
    return req.cookies.has("accessToken") || req.cookies.has("refreshToken");
}


export function handleAuth(req: NextRequest) {
    const { pathname, hostname } = req.nextUrl;
    const normalizedHost = hostname.toLowerCase();
    const { ADMIN_WEB_HOST } = resolveHosts(req);
    const hostRole = getHostRole(normalizedHost, req);
    const effectivePathname = normalizedHost === ADMIN_WEB_HOST && !isAuthPath(pathname) && !pathname.startsWith('/admin')
        ? `/admin${pathname === '/' ? '' : pathname}`
        : pathname;

    const adminLoggedIn = req.cookies.has("adminAccessToken") || req.cookies.has("ff_admin_logged_in");

    // Admin Auth
    if (hostRole === 'admin') {
        if (!adminLoggedIn && effectivePathname !== '/admin/login' && !isAuthPath(pathname)) {
             return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${ADMIN_WEB_HOST}/login`);
        }
        if ((isAuthPath(pathname) || effectivePathname === '/admin/login') && adminLoggedIn) {
             return redirectWithMethodAwareness(req, `${req.nextUrl.protocol}//${ADMIN_WEB_HOST}/dashboard`);
        }
    }

    if (isUserPath(pathname) && hostRole !== 'admin') {
        // Enforce the standard login auth gate for user paths
        const loggedIn = hasServerIssuedSessionCookie(req);
        if (!loggedIn) {
            const loginUrl = new URL(`${req.nextUrl.protocol}//${req.nextUrl.host}/login`);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl, 307);
        }
    }

    if (isAuthEntryPath(pathname) && hostRole !== 'admin') {
        // Enforce the standard auth gate to prevent logged in users from seeing login again.
        // Only entry pages bounce — /choose-username must stay reachable while a signed-in
        // user still has no username, otherwise /dashboard and /choose-username loop forever.
        const loggedIn = hasServerIssuedSessionCookie(req);
        const isExpiredFlow = req.nextUrl.searchParams.has('expired') || req.nextUrl.searchParams.has('logout');
        if (loggedIn && !isExpiredFlow) {
            // Preserve the intent the visitor arrived with instead of always dumping them on /dashboard:
            // a username claim (/signup?username=... , invite links) or a post-auth destination.
            const usernamePrefill = req.nextUrl.searchParams.get('username');
            const redirectParam = req.nextUrl.searchParams.get('redirect');
            const destination = usernamePrefill
                ? `/choose-username?username=${encodeURIComponent(usernamePrefill)}`
                : redirectParam && isSafeInternalRedirect(redirectParam)
                    ? redirectParam
                    : '/jobs?tab=for-you';
            const url = new URL(destination, `${req.nextUrl.protocol}//${req.nextUrl.host}`);
            return NextResponse.redirect(url, 307);
        }
    }

    return null;
}
