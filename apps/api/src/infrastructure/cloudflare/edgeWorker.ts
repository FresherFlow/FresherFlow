/**
 * ============================================================================
 * CLOUDFLARE EDGE WORKER - PRODUCTION CORRECT SECURITY SHIELD (SECURE EDITION)
 * ============================================================================
 * 
 * Enforces:
 * 1. Strict CORS checking for Web browsers.
 * 2. HMAC-SHA256 Cryptographic Request Signature validation for Mobile clients
 *    signing both the PATHNAME and TIMESTAMP (Path-locked replay prevention).
 * 3. Replay Attack Prevention (5-minute timestamp drift threshold).
 * 4. Safe Fail-Hard check for environment secrets (Zero dangerous default fallbacks).
 */

export interface Env {
    // Configured via Cloudflare Dashboard Environment Variables
    CDN_SIGNATURE_SECRET: string;
    CDN_BUILD_TOKEN: string; // Shared with Vercel env as X-CDN-Build-Token header
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
        if (!env.CDN_SIGNATURE_SECRET || !env.CDN_BUILD_TOKEN) {
            return new Response(JSON.stringify({ 
                error: 'Edge Server Misconfigured: Missing CDN_SIGNATURE_SECRET or CDN_BUILD_TOKEN' 
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
            // Forward directly to origin (or edge cache) for public metadata
            return fetch(request);
        }

        // 3. SERVER BUILD TOKEN CHECK (Vercel builds, Next.js SSR)
        // Server-side requests (no Origin/Referer) must present a pre-shared build token.
        // This prevents competitors from doing a simple curl to steal the entire feed.
        const buildToken = request.headers.get('X-CDN-Build-Token');
        const origin = request.headers.get('Origin');
        const referer = request.headers.get('Referer');
        const userAgent = request.headers.get('User-Agent') || '';

        const isServerSideRequest = !origin && !referer;
        if (isServerSideRequest) {
            if (!buildToken || !safeCompare(buildToken, env.CDN_BUILD_TOKEN)) {
                return new Response(JSON.stringify({ error: 'Forbidden: Missing or invalid build token' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            // Valid build token — serve directly
            return fetch(request);
        }

        // 4. WEB BROWSER ORIGIN PROTECTION (CORS)
        // Identify browsers by origin/referer presence
        const isWebBrowser = origin || referer || userAgent.includes('Mozilla');

        if (isWebBrowser && !userAgent.includes('FresherFlow')) {
            const allowedOrigins = [
                'https://fresherflow.in',
                'https://www.fresherflow.in',
                'https://app.fresherflow.in',
                'https://fresherflow.com',
                'https://www.fresherflow.com',
                'http://localhost:3000',
                'http://localhost:3001'
            ];
            
            const reqOrigin = origin || (referer ? new URL(referer).origin : '');
            if (!allowedOrigins.includes(reqOrigin)) {
                return new Response(JSON.stringify({ error: 'CORS Blocked: Unauthorized Web Domain' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Allow Web fetch if origin matches
            const response = await fetch(request);
            const headers = new Headers(response.headers);
            headers.set('Access-Control-Allow-Origin', reqOrigin);
            headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
            headers.set('Access-Control-Allow-Headers', 'Content-Type');
            return new Response(response.body as any, { 
                status: response.status, 
                statusText: response.statusText, 
                headers 
            });
        }

        // 5. CRYPTOGRAPHIC SIGNATURE CHECK (MOBILE CLIENTS)
        const timestampStr = url.searchParams.get('t');
        const signature = url.searchParams.get('sig');

        if (!timestampStr || !signature) {
            return new Response(JSON.stringify({ 
                error: 'Forbidden: Missing Cryptographic Signature parameters (t, sig)' 
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

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

            // Signature matches! Serve the static file from Edge cache or Origin
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
