import { Request, Response, NextFunction } from 'express';
import { logger } from '@fresherflow/logger';

/**
 * Ensures that the request is coming from or targeting a specific domain in production.
 */
export function ensureDomainHost(expectedHost: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (process.env.NODE_ENV !== 'production' || !expectedHost) {
            return next();
        }

        const host = req.headers.host?.toLowerCase();

        let requestHostname = host;
        if (requestHostname && requestHostname.includes(':')) {
            requestHostname = requestHostname.split(':')[0];
        }

        if (requestHostname !== expectedHost.toLowerCase() && requestHostname !== 'localhost' && requestHostname !== '127.0.0.1') {
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
