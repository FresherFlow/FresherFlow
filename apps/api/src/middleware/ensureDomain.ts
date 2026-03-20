import { Request, Response, NextFunction } from 'express';
import { logger } from '@fresherflow/logger';

/**
 * Ensures that the request is coming from or targeting a specific domain in production.
 */
export function ensureDomainHost(expectedHost: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (process.env.NODE_ENV !== 'production') {
            return next();
        }

        const host = req.headers.host?.toLowerCase();
        const origin = req.headers.origin;
        const referer = req.headers.referer;

        // Extract hostname from Origin or Referer if host isn't enough (e.g. shared API endpoint)
        let requestHostname = host;
        if (origin) {
            try {
                requestHostname = new URL(origin).hostname.toLowerCase();
            } catch { /* ignore */ }
        } else if (referer) {
            try {
                requestHostname = new URL(referer).hostname.toLowerCase();
            } catch { /* ignore */ }
        }

        if (requestHostname !== expectedHost.toLowerCase()) {
            logger.warn('Domain restriction violation', {
                path: req.path,
                expectedHost,
                actualHost: requestHostname,
                requestId: req.requestId
            });

            return res.status(403).json({
                error: {
                    message: `This resource is strictly restricted to '${expectedHost}'.`,
                    requestId: req.requestId
                }
            });
        }

        next();
    };
}
