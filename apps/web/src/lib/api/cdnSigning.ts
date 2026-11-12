import { CDN_URL, IS_DB_FEED } from '@/lib/utils/runtimeConfig';

/**
 * HMAC-SHA256 signs a message with the given secret, returning a hex digest.
 * Internal helper used by CDN URL signing.
 */
async function signMessage(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const key = await globalThis.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await globalThis.crypto.subtle.sign(
        'HMAC',
        key,
        messageData
    );

    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Signs a CDN URL using a stable feed version string.
 * The resulting URL is identical until the next job publish event,
 * enabling indefinite CDN caching (immutable cache headers from Edge Worker).
 * Used for the bootstrap feed on the web/Next.js server side.
 * Internal helper (used by feedServer.ts).
 */
export async function signUrlWithVersion(url: string, version: string): Promise<string> {
    // FEED_SOURCE=db reads the API directly; it is not signature-gated.
    if (IS_DB_FEED) return url;

    // Server-only secret: feed signing runs in feedServer.ts (server), never in
    // the browser bundle. Keep it out of NEXT_PUBLIC_* so it is never exposed.
    const secret = process.env.CDN_SIGNATURE_SECRET;
    if (!secret) {
        throw new Error('CDN_SIGNATURE_SECRET is required when FEED_SOURCE=cdn');
    }
    try {
        const parsedUrl = new URL(url, CDN_URL);
        parsedUrl.searchParams.set('v', version);
        const pathname = parsedUrl.pathname;
        const message = `${pathname}:${version}`;
        const sig = await signMessage(message, secret);
        parsedUrl.searchParams.set('sig', sig);
        return parsedUrl.toString();
    } catch (err) {
        console.error('Failed to sign CDN url with version:', err);
        throw new Error('Unable to sign the requested CDN URL');
    }
}

/**
 * Signs a CDN URL with a time-based token (2-minute windows).
 * Used for protected CDN assets that need short-lived signatures.
 */
export async function signProtectedCdnUrl(urlOrPath: string): Promise<string> {
    const secret = process.env.CDN_SIGNATURE_SECRET;
    if (!secret) {
        throw new Error('CDN_SIGNATURE_SECRET is required to sign protected CDN URLs');
    }
    try {
        const parsedUrl = new URL(urlOrPath, CDN_URL);
        const pathname = parsedUrl.pathname;
        const t = Math.floor(Date.now() / 1000 / 120) * 120;
        const message = `${pathname}:${t}`;
        const sig = await signMessage(message, secret);
        parsedUrl.searchParams.set('t', t.toString());
        parsedUrl.searchParams.set('sig', sig);
        return parsedUrl.toString();
    } catch (err) {
        console.error('Failed to sign protected CDN URL:', err);
        throw new Error('Unable to sign the requested CDN URL');
    }
}
