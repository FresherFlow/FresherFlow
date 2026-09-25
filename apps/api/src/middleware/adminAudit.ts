import { Request, Response, NextFunction } from 'express';
import { logger } from '@fresherflow/utils';
import prisma from '../infrastructure/database/prisma';

type AdminAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPIRE' | 'BULK_ACTION' | 'EXPORT' | 'REJECT' | 'SPAM';

/**
 * Automatic Admin Audit Middleware
 * Logs all admin mutations automatically
 * Cannot be forgotten - wraps route handlers
 */
export function withAdminAudit(action: AdminAction) {
    return function (req: Request, res: Response, next: NextFunction) {
        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json to intercept successful responses
        res.json = function (body: unknown) {
            // Extract opportunity ID from various sources (user admin routes use :userId)
            const bodyObj = body as { opportunity?: { id?: string } } | null;
            const params = req.params as { id?: string; userId?: string };
            const targetId = params.id ?? params.userId ?? bodyObj?.opportunity?.id;

            // Attribute to the admin session, or to the user session for
            // moderators acting through the normal login (requireStaff).
            const actorId = req.adminId ?? req.userId;
            if (targetId && actorId) {
                // Log asynchronously (don't block response)
                prisma.adminAudit.create({
                    data: {
                        userId: actorId,
                        action,
                        targetId,
                        reason: (req.body as { reason?: string })?.reason || null
                    }
                }).catch(err => {
                    logger.error('Failed to log admin action', { error: err });
                });
            }

            return originalJson(body);
        } as typeof res.json; // Cast override to match Express signature

        next();
    };
}

/**
 * Validate delete/expire reason
 * Minimum 10 characters, cannot be empty or "test"
 */
export function validateReason(req: Request, res: Response, next: NextFunction) {
    const { reason } = req.body as { reason?: string };

    // Support optional reason with a default
    if (!reason || reason.trim().length === 0) {
        (req.body as { reason?: string }).reason = 'Actioned by Admin';
        return next();
    }

    if (reason.trim().length < 5) {
        return res.status(400).json({
            error: 'Please provide a reason (minimum 5 characters)'
        });
    }

    const normalized = reason.toLowerCase().trim();
    if (normalized === 'test' || normalized === 'testing') {
        return res.status(400).json({
            error: 'Invalid reason - provide a meaningful explanation'
        });
    }

    next();
}
