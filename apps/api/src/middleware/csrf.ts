import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { logger } from '@fresherflow/utils';
import crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * 
 * In modern SPAs where the API is hosted on the same domain (or verified via CORS),
 * checking for a custom request header is an effective defense against CSRF.
 * 
 * Browsers prevent cross-origin requests from setting custom headers unless explicitly 
 * permitted by the server's CORS policy. Our CORS policy does NOT allow 'X-Requested-From'
 * from unauthorized origins.
 */
export function csrfGate(req: Request, res: Response, next: NextFunction) {
    // 1. Skip GET, HEAD, OPTIONS (Safe methods)
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // 1.1 Allow the ingestion worker to post to /api/ingestion/email, authenticated
    // by the shared INGESTION_WORKER_TOKEN. Path-scoped and secret-scoped: a token
    // that is correct for every other path gets no bypass here.
    if (req.path === '/api/ingestion/email') {
        const authHeader = req.header('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const expectedToken = process.env.INGESTION_WORKER_TOKEN || '';
        if (token && expectedToken && token === expectedToken) {
            return next();
        }
    }

    // 1.2 Machine-to-machine allowlist.
    //
    // CSRF defends against *ambient* credentials: a browser attaching a cookie or
    // Authorization header that the attacker never supplied. A caller holding a
    // shared secret obtained out of band cannot be driven that way — a cross-site
    // page cannot set `x-api-key`, and the CORS policy does not allow that header
    // from unauthorized origins. So each secret below may skip CSRF, and only
    // these exact secrets:
    //
    //   - INTERNAL_API_SECRET via `x-api-key`: the job sweeper and pipeline
    //     scripts (scripts/sweeper/index.ts). Its route-level authentication is
    //     `requireInternalApiKey` (middleware/auth.ts), which re-checks the same
    //     secret independently of this gate.
    //
    // This is deliberately NOT generalised to "any Authorization header". A Bearer
    // token is not an allowlist entry: it is a per-session credential that browser
    // clients attach automatically on every call, so treating its mere presence as
    // proof of a non-browser caller disabled CSRF for every browser mutation.
    const apiKey = req.header('x-api-key');
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (apiKey && internalSecret) {
        const presented = Buffer.from(String(apiKey));
        const expected = Buffer.from(internalSecret);
        // timingSafeEqual throws on a length mismatch, so compare lengths first.
        if (presented.length === expected.length && crypto.timingSafeEqual(presented, expected)) {
            return next();
        }
    }

    // 2. Enforce custom header
    const requestedFrom = req.header('X-Requested-From');
    const allowedIdentities = ['fresherflow-web', 'fresherflow-client'];

    if (!requestedFrom || !allowedIdentities.includes(requestedFrom)) {
        logger.warn('[CSRF] Forbidden: Missing or invalid X-Requested-From header', { 
            header: requestedFrom || 'none', 
            ip: req.ip, 
            path: req.path 
        });
        return next(new AppError('CSRF Security Violation: Request must originate from the verified web application.', 403));
    }
    
    // 3. Origin Validation
    const origin = req.header('origin') || req.header('referer');
    if (origin) {
        try {
            const parsedOrigin = new URL(origin).hostname;
            const envHosts = process.env.ALLOWED_ORIGINS
                ? process.env.ALLOWED_ORIGINS.split(',').map(h => h.trim()).filter(Boolean)
                : [];
            const allowedHosts = envHosts.length > 0 ? envHosts : ['localhost', '127.0.0.1', 'fresherflow.com', 'fresherflow.in'];
            if (!allowedHosts.some(h => parsedOrigin === h || parsedOrigin.endsWith('.' + h))) {
                return next(new AppError('CSRF Security Violation: Invalid origin.', 403));
            }
        } catch {
            return next(new AppError('CSRF Security Violation: Invalid origin format.', 403));
        }
    }

    next();
}
