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
 */

export interface Env {
    // Configured via Cloudflare Dashboard Environment Variables
    CDN_SIGNATURE_SECRET: string;
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
        const isProtected = pathname === '/bootstrap-feed.min.json' ||
                            pathname === '/taken-usernames.min.json' ||
                            pathname === '/companies-directory.min.json' ||
                            pathname.startsWith('/categories/');

        if (!isProtected) {
            // Forward directly to origin (R2 bucket) for public metadata and sitemaps
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

        let expectedMessage = '';

        if (versionStr) {
            // === STABLE MODE: Version-Hash Validation (Web / Next.js) ===
            // Signed URL is stable until the next feed publish event → 99%+ CDN cache hit rate.
            expectedMessage = `${pathname}:${versionStr}`;

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
            expectedMessage = `${pathname}:${timestampStr}`;

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
            const expectedSignature = await computeHMAC(expectedMessage, env.CDN_SIGNATURE_SECRET);

            if (!safeCompare(signature, expectedSignature)) {
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
