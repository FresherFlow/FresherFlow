import express, { Router } from 'express';
import crypto from 'crypto';
import { generateKeyPairSync } from 'crypto';

/** JWKS endpoint for the FresherFlow OAuth 2.1 authorization server.

 * Serves a static RSA key pair so ChatGPT can validate `private_key_jwt`
 * client assertions. The key is generated once at startup and cached in
 * memory; it never leaves the server.
 */

const router: Router = express.Router();

// Lazy-init: generate the key pair once, on first request.
let jwks: { keys: Array<Record<string, unknown>> } | null = null;

function spkiToJwk(spkiDer: Buffer): Record<string, unknown> {
    // Base64url encode the DER bytes (removes trailing == padding).
    const derBytes = Buffer.from(spkiDer);
    const b64url = derBytes.toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=+$/, '');
    return {
        alg: 'RS256',
        ext: true,
        key_ops: ['verify'],
        kty: 'RSA',
        n: b64url,
        e: 'AQAB',
    };
}

function loadJwks(): Record<string, unknown> {
    if (jwks) return jwks;
    const { publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    const der = crypto.createPublicKey(publicKey).export({ type: 'spki', format: 'der' });
    const jwk = spkiToJwk(der);
    jwks = { keys: [jwk] };
    return jwks;
}

router.get('/oauth/jwks.json', (_req, res) => {
    res.json(loadJwks());
});

export default router;
