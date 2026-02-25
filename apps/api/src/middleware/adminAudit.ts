import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

type AdminAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPIRE' | 'BULK_ACTION' | 'EXPORT';

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
        res.json = function (body: any) {
            // Extract opportunity ID from various sources
            const targetId = req.params.id || body?.opportunity?.id;

            if (targetId && req.adminId) {
                // Log asynchronously (don't block response)
                prisma.adminAudit.create({
                    data: {
                        userId: req.adminId,
                        action,
                        targetId,
                        reason: req.body?.reason || null
                    }
                }).catch(err => {
                    console.error('Failed to log admin action:', err);
                });
            }

            return originalJson(body);
        };

        next();
    };
}

/**
 * Validate delete/expire reason
 * Minimum 10 characters, cannot be empty or "test"
 */
export function validateReason(req: Request, res: Response, next: NextFunction) {
    const { reason } = req.body;

    // Support optional reason with a default
    if (!reason || reason.trim().length === 0) {
        req.body.reason = 'Actioned by Admin';
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

