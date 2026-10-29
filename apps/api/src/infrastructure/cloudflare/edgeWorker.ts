/**
 * ============================================================================
 * CLOUDFLARE EDGE WORKER - PRODUCTION CORRECT SECURITY SHIELD (SECURE R2 EDITION)
 * ============================================================================
 *
 * Enforces:
 * 1. HMAC-SHA256 Cryptographic Request Signature validation for all protected clients.
 * 2. Dual-mode verification:
 *    - Legacy mode (t=): Timestamp-based, used by production mobile app (backward compatible).
 *    - Stable mode (v=): Version-hash-based, used by web/Next.js for indefinite CDN caching.
 * 3. Replay Attack Prevention for the legacy timestamp mode (5-minute drift threshold).
 * 4. Safe Fail-Hard check for environment secrets (Zero dangerous default fallbacks).
 *
 * ---------------------------------------------------------------------------
 * DEPLOYMENT
 * ---------------------------------------------------------------------------
 * There is NO wrangler.toml in this repository and no deploy script for this
 * Worker. It is deployed out-of-band from the Cloudflare dashboard, so the
 * deployed route/binding configuration CANNOT be verified from the tree.
 *
 * `apps/api/src/infrastructure/cloudflare/edgeWorker.js` is a HAND-MAINTAINED
 * classic-script edition of this file (this repo has no build step that emits
 * it, and no script that deploys it). The two files MUST stay semantically
 * identical: a Worker is only ever as good as the copy that was pasted into
 * the dashboard. `src/__tests__/cdn-publish-guard.test.ts` asserts that the
 * two editions declare the same protection set and the same path aliases.
 *
 * ---------------------------------------------------------------------------
 * PROTECTED PATHS vs. WHAT CLIENTS ACTUALLY REQUEST  (verified live 2026-10-22)
 * ---------------------------------------------------------------------------
 * This Worker is mounted on the ROOT of cdn.fresherflow.in. Measured against
 * the live deployment on 2026-10-22:
 *
 *   GET /bootstrap-feed.min.json         -> 403 (protected — this Worker)
 *   GET /taken-usernames.min.json         -> 403 (protected — this Worker)
 *   GET /categories/trending.json         -> 403 (protected — this Worker)
 *   GET /feeds/bootstrap-feed.min.json    -> 200 (NOT protected)
 *   GET /meta/taken-usernames.min.json    -> 200 (NOT protected)
 *
 * But every client in this repo requests the *prefixed* spellings:
 *
 *   web    apps/web/src/lib/utils/runtimeConfig.ts:130-137
 *            BOOTSTRAP_FEED_URL = ${FEED_CDN_BASE}/feeds/bootstrap-feed.min.json
 *            FEED_INDEX_URL    = ${FEED_CDN_BASE}/feeds/feed-index.json
 *          GET_CATEGORY_SHARD_URL(id) = ${FEED_CDN_BASE}/categories/${id}.json
 *   mobile apps/mobile/src/config/api.ts:95-105
 *            BOOTSTRAP_FEED_URL     = ${CDN_URL}/feeds/bootstrap-feed.min.json
 *            GOVERNMENT_FEED_URL    = ${CDN_URL}/feeds/government-feed.json
 *            EXPIRED_FEED_URL       = ${CDN_URL}/feeds/expired-feed.min.json
 *            TAKEN_USERNAMES_URL    = ${CDN_URL}/meta/taken-usernames.min.json
 *            GET_CATEGORY_SHARD_URL = ${CDN_URL}/categories/${id}.json
 *
 * The mobile app signs the ROOT spelling and fetches the PREFIXED one:
 *
 *   mobile apps/mobile/src/utils/cache/syncModule.ts:101-109
 *            signaturePath = isGovt ? '/government-feed.json' : '/bootstrap-feed.min.json'
 *            signedUrl     = ${CDN_URL}/feeds/...?v=..&sig=..
 *   mobile apps/mobile/src/hooks/useOpportunityDetail.ts:106,127
 *            generateCdnSignature('/bootstrap-feed.min.json')  -> fetches /feeds/bootstrap-feed.min.json
 *            generateCdnSignature('/expired-feed.min.json')   -> fetches /feeds/expired-feed.min.json
 *   mobile apps/mobile/src/screens/auth/ChooseUsernameScreen.tsx:83
 *            generateCdnSignature('/taken-usernames.min.json') -> fetches /meta/taken-usernames.min.json
 *
 * The web app signs the path it fetches, so the two agree:
 *
 *   web apps/web/src/lib/api/cdnFeed.ts:109-128 (`signUrlWithVersion`)
 *            const message = `${pathname}:${version}`;   // pathname = the path being fetched
 *
 * CONSEQUENCE: the protection set below covers only ROOT-level paths, so the
 * paths every client actually uses are NOT signature-checked. That is the
 * current, live behaviour: /feeds/* and /meta/* are served unprotected. The
 * only client path that really does reach the signature check today is
 * /categories/{id}.json (web signs `/categories/{id}.json`, Worker verifies
 * `/categories/{id}.json` — they agree).
 *
 * DO NOT "fix" the protection set by adding /feeds/* or /meta/* to it. The
 * mobile app signs the ROOT spelling, so the Worker would compute
 * `/feeds/bootstrap-feed.min.json:<v>` while the client signed
 * `/bootstrap-feed.min.json:<v>` — the HMACs would not match and every
 * mobile feed request would 403. The fix has to happen on the client side
 * (sign the path you fetch), and only then may the protection set grow. The
 * deployed configuration must be checked in the Cloudflare dashboard before
 * any change is made here.
 *
 * To keep that future change safe, the signature message is verified against
 * every EQUIVALENT spelling of the requested path (see PATH_ALIASES below),
 * so a client that signs either spelling of the same logical artifact is
 * accepted. This does not change which paths are protected, and it cannot
 * widen access to a different object: both spellings of an alias pair name
 * the same logical feed artifact.
 * ---------------------------------------------------------------------------
 */

export interface Env {
    // Configured via Cloudflare Dashboard Environment Variables
    CDN_SIGNATURE_SECRET: string;
}

/**
 * Paths that require a valid signature. DO NOT change without reading the
 * header comment above: the clients sign the ROOT spelling while requesting
 * the PREFIXED one, so extending this set to /feeds/* or /meta/* 403s the
 * mobile app.
 */
export const PROTECTED_EXACT_PATHS: string[] = [
    '/bootstrap-feed.min.json',
    '/taken-usernames.min.json',
    '/companies-directory.min.json',
];

/** Path prefixes that require a valid signature. */
export const PROTECTED_PATH_PREFIXES: string[] = [
    '/categories/',
];

/**
 * Equivalent spellings of the same logical artifact.
 *
 * The mobile app signs the root spelling and requests the prefixed one (see
 * the header comment). The Worker therefore accepts a signature computed over
 * ANY spelling of the requested path.
 *
 * Both spellings of a pair address the same logical feed artifact, and the
 * root spelling does not exist as an R2 key (the API only ever uploads
 * `feeds/…` and `meta/…`), so accepting the alias grants no access to any
 * additional object.
 */
export const PATH_ALIASES: Record<string, string[]> = {
    '/bootstrap-feed.min.json': ['/feeds/bootstrap-feed.min.json'],
    '/feeds/bootstrap-feed.min.json': ['/bootstrap-feed.min.json'],
    '/government-feed.json': ['/feeds/government-feed.json'],
    '/feeds/government-feed.json': ['/government-feed.json'],
    '/expired-feed.min.json': ['/feeds/expired-feed.min.json'],
    '/feeds/expired-feed.min.json': ['/expired-feed.min.json'],
    '/taken-usernames.min.json': ['/meta/taken-usernames.min.json'],
    '/meta/taken-usernames.min.json': ['/taken-usernames.min.json'],
};

/**
 * Every pathname the signature may have been computed over for a request to
 * `pathname`: the requested path itself plus its equivalent spellings.
 */
function signatureCandidates(pathname: string, token: string): string[] {
    const spellings = [pathname, ...(PATH_ALIASES[pathname] ?? [])];
    return spellings.map((spelling) => `${spelling}:${token}`);
}

function isProtectedPath(pathname: string): boolean {
    if (PROTECTED_EXACT_PATHS.includes(pathname)) return true;
    return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Secure constant-time comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

async function computeHMAC(message: string, secret: string): Promise<string> {
    const keyData = new TextEncoder().encode(secret);
    const messageData = new TextEncoder().encode(message);
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: { name: 'SHA-256' } },
        false,
        ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // 0. HANDLE CORS PREFLIGHT OPTIONS REQUESTS
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            });
        }

        // 1. FAIL HARD ON MISCONFIGURATION
        if (!env.CDN_SIGNATURE_SECRET) {
            return new Response(JSON.stringify({
                error: 'Edge Server Misconfigured: Missing CDN_SIGNATURE_SECRET'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const url = new URL(request.url);
        const pathname = url.pathname;

        // 2. DEFINE PROTECTED AND PUBLIC PATHS
        // Public metadata (education, skills, cities, sitemaps) are open to download.
        // Dynamic system feeds (bootstrap, usernames, categories) are cryptographically shielded.
        // See the header comment: the set below covers ROOT-level spellings only,
        // and it must not be extended to /feeds/* or /meta/* until the mobile app
        // signs the path it actually fetches.
        const isProtected = isProtectedPath(pathname);

        if (!isProtected) {
            // Forward directly to origin (R2 bucket) for public metadata and sitemaps.
            // The response carries the Cache-Control that was set on the R2 object
            // (see apps/api/src/infrastructure/services/platform/storage.service.ts),
            // which is what makes Cloudflare able to cache these at the edge.
            return fetch(request);
        }

        // 3. DUAL-MODE SIGNATURE VALIDATION
        const timestampStr = url.searchParams.get('t');
        const versionStr = url.searchParams.get('v');
        const signature = url.searchParams.get('sig');

        if (!signature) {
            return new Response(JSON.stringify({
                error: 'Forbidden: Browser/unauthenticated access disabled for feed assets'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let expectedMessages: string[] = [];

        if (versionStr) {
            // === STABLE MODE: Version-Hash Validation (Web / Next.js) ===
            // Signed URL is stable until the next feed publish event → 99%+ CDN cache hit rate.
            expectedMessages = signatureCandidates(pathname, versionStr);

        } else if (timestampStr) {
            // === LEGACY MODE: Timestamp Validation (Production Mobile App) ===
            // Backward compatible — no mobile update required.
            const clientTimestamp = parseInt(timestampStr, 10);
            const serverTimestamp = Math.floor(Date.now() / 1000);
            const timeDrift = Math.abs(serverTimestamp - clientTimestamp);

            if (Number.isNaN(clientTimestamp) || timeDrift > 300) {
                return new Response(JSON.stringify({
                    error: 'Forbidden: Request Signature Expired (Replay Attack Shield)'
                }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            expectedMessages = signatureCandidates(pathname, timestampStr);

        } else {
            return new Response(JSON.stringify({
                error: 'Forbidden: Missing validation token (t or v required)'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 4. RECOMPUTE AND COMPARE HMAC
        try {
            let matched = false;
            for (const message of expectedMessages) {
                const expectedSignature = await computeHMAC(message, env.CDN_SIGNATURE_SECRET);
                if (safeCompare(signature, expectedSignature)) {
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                return new Response(JSON.stringify({
                    error: 'Forbidden: Invalid Signature'
                }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 5. AUTHENTICATED — Serve from R2 with appropriate cache headers
            const r2Response = await fetch(request);

            if (versionStr) {
                // Stable version URL → add immutable cache header for downstream edges
                const newHeaders = new Headers(r2Response.headers);
                newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return new Response(r2Response.body as any, {
                    status: r2Response.status,
                    statusText: r2Response.statusText,
                    headers: newHeaders
                });
            }

            // Legacy t= mode: pass R2 response through unchanged
            return r2Response;

        } catch (e) {
            return new Response(JSON.stringify({
                error: 'Internal Edge Server Error during signature check',
                details: (e as Error).message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};
