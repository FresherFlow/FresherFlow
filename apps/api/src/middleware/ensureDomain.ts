import { Request, Response, NextFunction } from 'express';
import { logger } from '@fresherflow/utils';

/**
 * Strictly restricts sensitive production resources (such as /api/admin/*) to allowed origins and trusted client identities.
 * Implements defensive fail-closed validation to prevent bypasses via malformed URLs or arbitrary cloud subdomains.
 */
export function ensureDomainHost(expectedHost: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (process.env.NODE_ENV !== 'production' || !expectedHost) {
            return next();
        }

        const reject = (reason: string, actualValue?: string) => {
            logger.warn('Domain restriction violation', {
                reason,
                path: req.path,
                expectedHost,
                actualHost: actualValue || 'unverified',
                ip: req.ip,
                requestId: req.requestId
            });

            return res.status(403).json({
                error: {
                    message: `This resource is strictly restricted to '${expectedHost}'.`,
                    requestId: req.requestId
                }
            });
        };

        const clientOrigin = req.headers.origin || req.headers.referer;

        // 1. If Origin/Referer is absent (e.g., native mobile apps or internal services),
        // enforce that the request carries a trusted client identity header or authentication token.
        if (!clientOrigin) {
            const requestedFrom = req.header('X-Requested-From');
            const authHeader = req.header('authorization');
            const apiKey = req.header('x-api-key');
            const allowedIdentities = ['fresherflow-client', 'fresherflow-admin', 'fresherflow-web'];

            if (!authHeader && !apiKey && (!requestedFrom || !allowedIdentities.includes(requestedFrom))) {
                return reject('Missing both web origin and valid client authentication identity');
            }
            return next();
        }

        // 2. Safely parse web origin; strictly FAIL CLOSED on malformed URLs or unexpected protocols.
        let requestHostname = '';
        try {
            const originStr = Array.isArray(clientOrigin) ? clientOrigin[0] : clientOrigin;
            const url = new URL(originStr);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return reject('Unsupported protocol in client origin', url.protocol);
            }
            requestHostname = url.hostname.toLowerCase();
        } catch {
            return reject('Malformed origin or referer header');
        }

        const targetHost = expectedHost.toLowerCase();

        // 3. Strict match against expected admin domain or explicit local loopback.
        // For Vercel previews, enforce strict prefix matching to prevent third-party domain spoofing.
        const isExactHost = requestHostname === targetHost;
        const isLocalhost = requestHostname === 'localhost' || requestHostname === '127.0.0.1';
        const isTrustedVercelPreview = /^fresherflow-(?:[a-zA-Z0-9_-]+)?\.vercel\.app$/.test(requestHostname);

        if (!isExactHost && !isLocalhost && !isTrustedVercelPreview) {
            return reject('Origin domain mismatch', requestHostname);
        }

        next();
    };
}
