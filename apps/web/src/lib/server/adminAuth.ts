import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@fresherflow/utils';

/**
 * Admin authentication for the `/api/admin/**` Route Handlers in `apps/web`.
 *
 * Why this exists: these handlers run on the web deployment, hold server-only
 * secrets (`WORKER_SECRET`, `INGESTION_SECRET`, the ingestion database) and are
 * NOT covered by `src/proxy.ts`. The proxy's admin gate tests
 * `startsWith('/admin')`, which `/api/admin/...` never matches, and the proxy
 * runs on the edge runtime where the JWT secret cannot be verified. Rate
 * limiting alone (IP-keyed) is not authentication, so each handler verifies the
 * caller itself.
 *
 * The accepted credential is the token `apps/api` issues on admin login. It is
 * read from the HttpOnly `adminAccessToken` cookie *or* an `Authorization:
 * Bearer` header (for non-browser staff tooling: curl, Postman, CI send neither
 * cookie nor `Origin`). Both candidates are offered to the shared
 * `verifyAdminToken` helper, which enforces the same `type === 'admin'` /
 * `role === 'admin'` rules as the API's `requireAdmin`, and the first one that
 * verifies wins — a stale or expired cookie therefore cannot shadow a valid
 * Bearer token. Verification, not mere presence, selects the credential.
 *
 * The check fails closed: an unset secret, an expired token, a forged token and
 * a valid *user* (non-admin) token all resolve to a denial. A missing
 * credential is 401; a present-but-unverifiable one is 403.
 *
 * Cookie-authenticated unsafe methods additionally require a same-origin
 * `Origin` header (or Fetch Metadata `Sec-Fetch-Site: same-origin`).
 * `SameSite=Lax` still sends the cookie from sibling subdomains, so a valid
 * session alone does not prove the browser meant to send the request.
 *
 * WHY THAT CHECK IS COOKIE-ONLY, and why that is deliberate: CSRF is an attack
 * on *ambient* credentials — a browser that attaches a cookie the attacker
 * never supplied. A `Bearer` token is an explicit credential, chosen by the
 * caller and attached by a non-browser client that will not do so on an
 * attacker's behalf; no cross-site page can cause one to be sent, so there is
 * nothing for the origin check to protect. Narrowing the check to the cookie
 * credential therefore removes no protection while making the advertised
 * staff-tooling path actually reachable.
 *
 * NOTE — this is intentionally the OPPOSITE decision to
 * `apps/api/src/middleware/csrf.ts:40-44`, which treats "has a Bearer header"
 * as a reason to skip BOTH its header check and its origin validation. Two
 * apps, two defensible-but-different policies on the same question. Reconcile
 * them deliberately; do not assume they agree. This file is unchanged by that
 * reconciliation, and neither policy may be loosened to "fix" the other.
 *
 * Not covered here: account-status revocation and per-permission
 * authorization. Those stay in `apps/api` (`requireAdmin` / `requirePermission`
 * re-check the database on every call); these handlers gate on a valid admin
 * session only.
 *
 * Usage — keep `withRateLimit` outermost so unauthenticated callers stay
 * rate-limited:
 *
 *   export const GET = withRateLimit(withAdminAuth(getStats), rateLimitOptions);
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Longest plausible `host` value: 253-char DNS name plus a port and a separator. */
const MAX_HOST_LENGTH = 260;

export type AdminRouteHandler = (
    request: NextRequest,
    context?: unknown,
) => Promise<NextResponse> | NextResponse;

/**
 * True when no admin signing secret is configured at all, in which case
 * `verifyAdminToken` cannot verify anything and every caller is denied.
 *
 * Detection only — this never produces, returns or substitutes a secret, and
 * it is never used to verify anything. `getAdminSecret` in
 * `packages/utils/src/auth.ts` is not exported, so the only available signal is
 * the presence of the three names it resolves from, in its documented
 * precedence (`JWT_ADMIN_SECRET`, else `JWT_ACCESS_SECRET`, else `JWT_SECRET`).
 * Keep in sync with that helper; if the chain there changes, change it here too.
 */
function isAdminSecretUnset(): boolean {
    return ![process.env.JWT_ADMIN_SECRET, process.env.JWT_ACCESS_SECRET, process.env.JWT_SECRET]
        .some((value) => typeof value === 'string' && value.trim().length > 0);
}

/** Whether the unset-secret misconfiguration has already been reported in this process. */
let hasWarnedMissingAdminSecret = false;

type AdminCredential = {
    adminId: string;
    /** Which header/cookie produced the accepted token; drives the origin check. */
    source: 'cookie' | 'bearer';
};

type AdminCredentialCandidate = { source: AdminCredential['source']; token: string };

/**
 * Every credential the request offers, in the order they should be tried.
 * A value present in both the cookie and the header is tried once.
 */
function adminCredentialCandidates(request: NextRequest): AdminCredentialCandidate[] {
    const candidates: AdminCredentialCandidate[] = [];

    const cookieToken = request.cookies?.get('adminAccessToken')?.value;
    if (cookieToken) candidates.push({ source: 'cookie', token: cookieToken });

    const authorization = request.headers.get('authorization');
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        const bearerToken = authorization.slice(7).trim();
        if (bearerToken && bearerToken !== cookieToken) {
            candidates.push({ source: 'bearer', token: bearerToken });
        }
    }

    return candidates;
}

/**
 * Resolves the admin credential by *verification*, not by presence: each
 * candidate is offered to `verifyAdminToken` and the first that verifies wins.
 * A stale or expired cookie must not shadow a valid `Bearer` token.
 */
function resolveAdminCredential(request: NextRequest): AdminCredential | null {
    for (const candidate of adminCredentialCandidates(request)) {
        const adminId = verifyAdminToken(candidate.token);
        if (adminId) return { adminId, source: candidate.source };
    }
    return null;
}

function addHostname(hostnames: Set<string>, rawValue: string | null | undefined): void {
    if (!rawValue) return;
    // `x-forwarded-host` may carry a comma-separated hop list; the first entry is ours.
    const first = rawValue.split(',')[0]?.trim().toLowerCase();
    if (!first || first.length > MAX_HOST_LENGTH) return;
    hostnames.add(first);
    const withoutPort = first.replace(/:\d+$/, '');
    if (withoutPort) hostnames.add(withoutPort);
}

/**
 * Hostnames this request was actually addressed to. `host` is set by the
 * browser and cannot be forged by a cross-site page, so it is a sound baseline
 * for a same-origin comparison.
 */
function requestHostnames(request: NextRequest): string[] {
    const hostnames = new Set<string>();
    addHostname(hostnames, request.headers.get('host'));
    addHostname(hostnames, request.headers.get('x-forwarded-host'));
    try {
        addHostname(hostnames, request.nextUrl?.hostname);
    } catch {
        // A malformed request URL is not a reason to trust the caller.
    }
    return [...hostnames];
}

/**
 * Same-origin check for unsafe methods. Browsers always attach `Origin` to
 * non-GET requests, including same-origin ones, so a mismatch is a cross-site
 * caller; when `Origin` is absent, Fetch Metadata must vouch for the request.
 */
function isSameOriginMutation(request: NextRequest): boolean {
    if (SAFE_METHODS.has(request.method)) return true;

    const origin = request.headers.get('origin');
    if (origin) {
        try {
            const parsed = new URL(origin);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
            return requestHostnames(request).includes(parsed.hostname.toLowerCase());
        } catch {
            return false;
        }
    }

    return request.headers.get('sec-fetch-site') === 'same-origin';
}

/**
 * Returns a denial response when the caller is not an authenticated admin, or
 * `null` when the request may proceed to the handler.
 */
export function requireAdminApi(request: NextRequest): NextResponse | null {
    const candidates = adminCredentialCandidates(request);

    if (candidates.length === 0) {
        console.warn(`[admin-auth] denied ${request.method} ${request.nextUrl?.pathname}: no admin token`);
        return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const credential = resolveAdminCredential(request);

    if (!credential) {
        if (isAdminSecretUnset() && !hasWarnedMissingAdminSecret) {
            hasWarnedMissingAdminSecret = true;
            console.error(
                '[admin-auth] MISCONFIGURED: no admin signing secret is set, so every admin token ' +
                'fails verification and all /api/admin/** routes deny with 403 regardless of the ' +
                'caller. Set JWT_ADMIN_SECRET (or JWT_ACCESS_SECRET, or JWT_SECRET) on this ' +
                'deployment to the SAME value apps/api signs admin tokens with. This is a ' +
                'deployment problem, not an invalid session.'
            );
        }
        console.warn(`[admin-auth] denied ${request.method} ${request.nextUrl?.pathname}: invalid admin token`);
        return NextResponse.json({ error: 'Invalid admin session' }, { status: 403 });
    }

    // Origin check applies to the ambient credential only — see the file comment.
    if (credential.source === 'cookie' && !isSameOriginMutation(request)) {
        console.warn(`[admin-auth] denied ${request.method} ${request.nextUrl?.pathname}: cross-site request`);
        return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
    }

    return null;
}

/**
 * Wraps a Route Handler so it only runs for an authenticated admin session.
 * Signature-compatible with `withRateLimit`'s handler argument.
 */
export function withAdminAuth(handler: AdminRouteHandler): AdminRouteHandler {
    return async (request: NextRequest, context?: unknown) => {
        const denied = requireAdminApi(request);
        if (denied) return denied;
        return handler(request, context);
    };
}
