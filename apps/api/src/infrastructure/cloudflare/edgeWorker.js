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
 */

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
    var isProtected = pathname === '/bootstrap-feed.min.json' ||
                      pathname === '/taken-usernames.min.json' ||
                      pathname === '/companies-directory.min.json' ||
                      pathname.indexOf('/categories/') === 0;

    if (!isProtected) {
        // Forward directly to origin (R2 bucket) for public metadata and sitemaps
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

    var expectedMessage = '';

    if (versionStr) {
        // === STABLE MODE: Version-Hash Validation (Web / Next.js) ===
        // URL is stable until the next feed publish → edges cache it forever (immutable).
        expectedMessage = pathname + ':' + versionStr;

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
        expectedMessage = pathname + ':' + timestampStr;

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
        var expectedSignature = await computeHMAC(expectedMessage, secret);

        if (!safeCompare(signature, expectedSignature)) {
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
