/**
 * ============================================================================
 * CLOUDFLARE EDGE WORKER - COMPATIBILITY SHIELD (PURE JAVASCRIPT EDITION)
 * ============================================================================
 * 
 * Enforces:
 * 1. HMAC-SHA256 Cryptographic Request Signature validation for all protected clients
 *    signing both the PATHNAME and TIMESTAMP (Path-locked replay prevention).
 * 2. Replay Attack Prevention (5-minute timestamp drift threshold).
 * 3. Safe Fail-Hard check for environment secrets (Zero dangerous default fallbacks).
 * 
 * Note: Written in pure, highly compatible ES5/ES6 Javascript to support both
 * ES Module Workers and Classic Service Workers without any SyntaxErrors!
 */

// Secure constant-time comparison to prevent timing attacks
function safeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
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
    // In classic Cloudflare workers, environment variables are bound to the global scope.
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
    // Dynamic system feeds (bootstrap, usernames, categories) are cryptographic shielded.
    var isProtected = pathname === '/bootstrap-feed.min.json' ||
                      pathname === '/taken-usernames.min.json' ||
                      pathname === '/companies-directory.min.json' ||
                      pathname.indexOf('/categories/') === 0;

    if (!isProtected) {
        // Forward directly to origin (R2 bucket) for public metadata and sitemaps
        return fetch(request);
    }

    // 3. CRYPTOGRAPHIC SIGNATURE CHECK (REQUIRED FOR PROTECTED FEEDS)
    var timestampStr = url.searchParams.get('t');
    var signature = url.searchParams.get('sig');
    var hasSignature = timestampStr && signature;

    if (!hasSignature) {
        return new Response(JSON.stringify({ 
            error: 'Forbidden: Browser/unauthenticated access disabled for feed assets' 
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 4. CRYPTOGRAPHIC SIGNATURE CHECK (MOBILE CLIENTS / SECURE SERVER-SIDE FRONTEND)
    // A. Prevent Replay Attacks (Timestamp drift must be < 5 minutes / 300 seconds)
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

    // B. Recompute Expected HMAC-SHA256 Signature of PATHNAME + TIMESTAMP
    var keyData = new TextEncoder().encode(secret);
    
    // Sign pathname and timestamp together: `${pathname}:${timestamp}`
    var message = pathname + ':' + timestampStr;
    var messageData = new TextEncoder().encode(message);

    try {
        // Import crypto key using Web Crypto APIs (Native to Cloudflare Workers)
        var cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: { name: 'SHA-256' } },
            false,
            ['sign', 'verify']
        );

        // Compute expected signature
        var signatureBuffer = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            messageData
        );

        // Convert buffer to hex string
        var signatureArray = Array.from(new Uint8Array(signatureBuffer));
        var expectedSignature = signatureArray
            .map(function(b) { return b.toString(16).padStart(2, '0'); })
            .join('');

        // Constant-Time Comparison
        if (!safeCompare(signature, expectedSignature)) {
            return new Response(JSON.stringify({ 
                error: 'Forbidden: Invalid Cryptographic Signature match' 
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Signature matches! Serve the static file directly from R2
        return fetch(request);

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
