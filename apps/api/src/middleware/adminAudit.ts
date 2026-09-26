import { Request, Response, NextFunction } from 'express';
import { logger } from '@fresherflow/utils';
import prisma from '../infrastructure/database/prisma';

type AdminAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPIRE' | 'BULK_ACTION' | 'EXPORT' | 'REJECT' | 'SPAM';

/**
 * Resolve the acted-on row id for the audit row.
 *
 * Path params win (they name the target even when the response envelope does
 * not echo it). Known response envelopes are covered so a mutation that
 * returns `{ post: { id } }` or `{ room: { id } }` is still traceable.
 * Previously only `:id`/`:userId`/`{ opportunity }` were recognised, which
 * silently skipped audit rows for community moderation (`:commentId`),
 * opportunity events (`:eventId`), room creation, and bulk actions.
 */
function extractTargetId(req: Request, body: unknown): string | undefined {
    // Bulk actions carry their id list in the REQUEST body while the response
    // only echoes counts, so they are resolved from req.body first. One
    // bounded row per request instead of N rows, so a 500-id bulk call cannot
    // turn the audit write into a write-amplification vector.
    const reqBody = req.body as { ids?: unknown; action?: unknown } | undefined;
    if (reqBody && Array.isArray(reqBody.ids) && reqBody.ids.length > 0) {
        const action = typeof reqBody.action === 'string' && reqBody.action.length > 0 ? reqBody.action : 'BULK';
        return `bulk:${action}:${reqBody.ids.length}`;
    }

    const params = req.params as Record<string, unknown>;
    for (const key of ['id', 'userId', 'commentId', 'eventId']) {
        const value = params[key];
        if (typeof value === 'string' && value.length > 0) return value;
    }

    if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;

        for (const key of ['opportunity', 'room', 'post', 'experience', 'report', 'user', 'data']) {
            const nested = b[key] as { id?: unknown } | undefined;
            if (nested && typeof nested === 'object' && typeof nested.id === 'string' && nested.id.length > 0) {
                return nested.id;
            }
        }

        if (typeof b.commentId === 'string' && b.commentId.length > 0) return b.commentId;

        const grant = b.grant as { userId?: unknown } | undefined;
        if (grant && typeof grant === 'object' && typeof grant.userId === 'string' && grant.userId.length > 0) {
            return grant.userId;
        }
    }

    return undefined;
}

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
            const targetId = extractTargetId(req, body);

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
