/**
 * ============================================================================
 * CLOUDFLARE EDGE WORKER - COMPATIBILITY SHIELD (PURE JAVASCRIPT EDITION)
 * ============================================================================
 *
 * Enforces:
 * 1. HMAC-SHA256 Cryptographic Request Signature validation for all protected clients.
 * 2. Dual-mode verification:
 *    - Legacy mode (t=): Timestamp-based. Used by production mobile app + OG image route.
 *      Backward compatible — no app update needed.
 *    - Stable mode (v=): Version-hash-based. Used by web/Next.js for indefinite CDN caching.
 *      Signed URL stays identical until the next job publish event → 99%+ cache hit rate.
 * 3. Replay Attack Prevention for legacy mode (5-minute timestamp drift threshold).
 * 4. Safe Fail-Hard on missing secrets (zero dangerous default fallbacks).
 *
 * Written in pure ES6 JavaScript for full Cloudflare Worker compatibility.
 *
 * ---------------------------------------------------------------------------
 * HAND-MAINTAINED MIRROR — KEEP IN SYNC WITH edgeWorker.ts
 * ---------------------------------------------------------------------------
 * This file is NOT generated. No build step emits it and no script deploys it:
 * it is pasted into the Cloudflare dashboard by hand. It must stay
 * semantically identical to `edgeWorker.ts` (the module edition), because a
 * Worker is only ever as good as the copy that was pasted. The protection set
 * and the path aliases below are asserted to match the .ts edition by
 * `src/__tests__/cdn-publish-guard.test.ts`.
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

/**
 * Paths that require a valid signature. DO NOT change without reading the
 * header comment above: the clients sign the ROOT spelling while requesting
 * the PREFIXED one, so extending this set to /feeds/* or /meta/* 403s the
 * mobile app.
 */
var PROTECTED_EXACT_PATHS = [
    '/bootstrap-feed.min.json',
    '/taken-usernames.min.json',
    '/companies-directory.min.json'
];

var PROTECTED_PATH_PREFIXES = [
    '/categories/'
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
var PATH_ALIASES = {
    '/bootstrap-feed.min.json': ['/feeds/bootstrap-feed.min.json'],
    '/feeds/bootstrap-feed.min.json': ['/bootstrap-feed.min.json'],
    '/government-feed.json': ['/feeds/government-feed.json'],
    '/feeds/government-feed.json': ['/government-feed.json'],
    '/expired-feed.min.json': ['/feeds/expired-feed.min.json'],
    '/feeds/expired-feed.min.json': ['/expired-feed.min.json'],
    '/taken-usernames.min.json': ['/meta/taken-usernames.min.json'],
    '/meta/taken-usernames.min.json': ['/taken-usernames.min.json']
};

/**
 * Every pathname the signature may have been computed over for a request to
 * `pathname`: the requested path itself plus its equivalent spellings.
 */
function signatureCandidates(pathname, token) {
    var spellings = [pathname].concat(PATH_ALIASES[pathname] || []);
    return spellings.map(function (spelling) {
        return spelling + ':' + token;
    });
}

function isProtectedPath(pathname) {
    if (PROTECTED_EXACT_PATHS.indexOf(pathname) !== -1) return true;
    return PROTECTED_PATH_PREFIXES.some(function (prefix) {
        return pathname.indexOf(prefix) === 0;
    });
}

// Secure constant-time comparison to prevent timing attacks
function safeCompare(a, b) {
    if (a.length !== b.length) return false;
    var result = 0;
    for (var i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// Compute HMAC-SHA256 using Web Crypto (native to Cloudflare Workers)
async function computeHMAC(message, secret) {
    var keyData = new TextEncoder().encode(secret);
    var messageData = new TextEncoder().encode(message);
    var cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: { name: 'SHA-256' } },
        false,
        ['sign']
    );
    var signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signatureBuffer))
        .map(function(b) { return b.toString(16).padStart(2, '0'); })
        .join('');
}

// Listen to incoming fetch requests (Classic Service Worker Event Listener)
addEventListener('fetch', function(event) {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
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
    // In classic Cloudflare Workers, env variables are bound to the global scope.
    var secret = typeof CDN_SIGNATURE_SECRET !== 'undefined' ? CDN_SIGNATURE_SECRET : null;

    if (!secret) {
        return new Response(JSON.stringify({
            error: 'Edge Server Misconfigured: Missing CDN_SIGNATURE_SECRET'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    var url = new URL(request.url);
    var pathname = url.pathname;

    // 2. DEFINE PROTECTED AND PUBLIC PATHS
    // Public metadata (education, skills, cities, sitemaps) are open to download.
    // Dynamic system feeds (bootstrap, usernames, categories) are cryptographically shielded.
    // See the header comment: the set below covers ROOT-level spellings only,
    // and it must not be extended to /feeds/* or /meta/* until the mobile app
    // signs the path it actually fetches.
    var isProtected = isProtectedPath(pathname);

    if (!isProtected) {
        // Forward directly to origin (R2 bucket) for public metadata and sitemaps.
        // The response carries the Cache-Control that was set on the R2 object
        // (see apps/api/src/infrastructure/services/platform/storage.service.ts),
        // which is what makes Cloudflare able to cache these at the edge.
        return fetch(request);
    }

    // 3. DUAL-MODE SIGNATURE VALIDATION
    var timestampStr = url.searchParams.get('t');
    var versionStr = url.searchParams.get('v');
    var signature = url.searchParams.get('sig');

    if (!signature) {
        return new Response(JSON.stringify({
            error: 'Forbidden: Browser/unauthenticated access disabled for feed assets'
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    var expectedMessages = [];

    if (versionStr) {
        // === STABLE MODE: Version-Hash Validation (Web / Next.js) ===
        // URL is stable until the next feed publish → edges cache it forever (immutable).
        expectedMessages = signatureCandidates(pathname, versionStr);

    } else if (timestampStr) {
        // === LEGACY MODE: Timestamp Validation (Production Mobile App + OG Route) ===
        // Backward compatible — no mobile update needed.
        var clientTimestamp = parseInt(timestampStr, 10);
        var serverTimestamp = Math.floor(Date.now() / 1000);
        var timeDrift = Math.abs(serverTimestamp - clientTimestamp);

        if (isNaN(clientTimestamp) || timeDrift > 300) {
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
        var matched = false;
        for (var i = 0; i < expectedMessages.length; i++) {
            var expectedSignature = await computeHMAC(expectedMessages[i], secret);
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
        var r2Response = await fetch(request);
        var newHeaders = new Headers(r2Response.headers);

        if (versionStr) {
            // Stable version URL → tell all downstream edges to cache indefinitely
            newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
        }

        return new Response(r2Response.body, {
            status: r2Response.status,
            statusText: r2Response.statusText,
            headers: newHeaders
        });

    } catch (e) {
        return new Response(JSON.stringify({
            error: 'Internal Edge Server Error during signature check',
            details: e.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
