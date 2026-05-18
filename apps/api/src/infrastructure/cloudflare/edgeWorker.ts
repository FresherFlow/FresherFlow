/**
 * ============================================================================
 * CLOUDFLARE EDGE WORKER - PRODUCTION CORRECT SECURITY SHIELD (SECURE R2 EDITION)
 * ============================================================================
 * 
 * Enforces:
 * 1. HMAC-SHA256 Cryptographic Request Signature validation for all protected clients
 *    signing both the PATHNAME and TIMESTAMP (Path-locked replay prevention).
 * 2. Replay Attack Prevention (5-minute timestamp drift threshold).
 * 3. Safe Fail-Hard check for environment secrets (Zero dangerous default fallbacks).
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

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
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
        // Dynamic system feeds (bootstrap, usernames, categories) are cryptographic shielded.
        const isProtected = pathname === '/bootstrap-feed.min.json' ||
                            pathname === '/taken-usernames.min.json' ||
                            pathname === '/companies-directory.min.json' ||
                            pathname.startsWith('/categories/');

        if (!isProtected) {
            // Forward directly to origin (R2 bucket) for public metadata and sitemaps
            return fetch(request);
        }

        // 3. CRYPTOGRAPHIC SIGNATURE CHECK (REQUIRED FOR PROTECTED FEEDS)
        const timestampStr = url.searchParams.get('t');
        const signature = url.searchParams.get('sig');
        const hasSignature = timestampStr && signature;

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

        // B. Recompute Expected HMAC-SHA256 Signature of PATHNAME + TIMESTAMP
        const secretKey = env.CDN_SIGNATURE_SECRET;
        const keyData = new TextEncoder().encode(secretKey);
        
        // Sign pathname and timestamp together: `${pathname}:${timestamp}`
        const message = `${pathname}:${timestampStr}`;
        const messageData = new TextEncoder().encode(message);

        try {
            // Import crypto key using Web Crypto APIs (Native to Cloudflare Workers)
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: { name: 'SHA-256' } },
                false,
                ['sign', 'verify']
            );

            // Compute expected signature
            const signatureBuffer = await crypto.subtle.sign(
                'HMAC',
                cryptoKey,
                messageData
            );

            // Convert buffer to hex string
            const signatureArray = Array.from(new Uint8Array(signatureBuffer));
            const expectedSignature = signatureArray
                .map(b => b.toString(16).padStart(2, '0'))
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
                details: (e as Error).message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};
