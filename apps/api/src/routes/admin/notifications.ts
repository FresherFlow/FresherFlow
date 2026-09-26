import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database/prisma';
import { actorId, requirePermission, requireStaff } from '../../middleware/auth';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit } from '../../middleware/adminAudit';
import { AppError } from '../../middleware/errorHandler';
import {
    getAdminDeliveryControls,
    updateAdminDeliveryControls,
} from '../../infrastructure/services/adminDeliveryControl.service';
import { retrySocialPost } from '../../infrastructure/services/social/socialPost.service';

const router = Router();

// Phase 15 - notification/social delivery observability + admin controls.
// Reads are moderator-visible (transparency); global kill-switches stay
// SUPER_ADMIN-only via settings.manage.
router.use(requireStaff);

const dispatchQuerySchema = z.object({
    status: z.enum(['INITIATED', 'SENT', 'FAILED', 'SKIPPED']).optional(),
    kind: z.string().trim().max(64).optional(),
    channel: z.enum(['EMAIL', 'APP', 'PUSH']).optional(),
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const controlsSchema = z.object({
    socialAutoPostingEnabled: z.boolean().optional(),
    userAlertsEnabled: z.boolean().optional(),
    userEmailNotificationsEnabled: z.boolean().optional(),
});

/**
 * GET /api/admin/notifications/dispatches
 * Every alert side effect, traceable: INITIATED -> SENT/FAILED/SKIPPED with
 * correlationId, dedupeKey, reason, and errorMessage. Newest first, no-store.
 */
router.get(
    '/dispatches',
    requirePermission('opportunity.review'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = dispatchQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                throw new AppError(parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
            }
            const { status, kind, channel, page, limit } = parsed.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where: any = {};
            if (status) where.status = status;
            if (channel) where.channel = channel;
            if (kind && kind.length <= 64) where.kind = kind;
            const [dispatches, total, failed, skipped] = await Promise.all([
                prisma.alertDispatchLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: {
                        id: true, correlationId: true, kind: true, channel: true,
                        status: true, reason: true, dedupeKey: true, errorMessage: true,
                        attemptedAt: true, deliveredAt: true, createdAt: true,
                        user: { select: { id: true, email: true } },
                        opportunity: { select: { id: true, slug: true, title: true } },
                    },
                }),
                prisma.alertDispatchLog.count({ where }),
                prisma.alertDispatchLog.count({ where: { ...where, status: 'FAILED' } }),
                prisma.alertDispatchLog.count({ where: { ...where, status: 'SKIPPED' } }),
            ]);
            res.setHeader('Cache-Control', 'private, no-store');
            return res.json({
                success: true, dispatches, summary: { total, failed, skipped },
                pagination: { total, page, limit, pages: Math.ceil(total / limit) },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/admin/notifications/social
 * Social + Telegram delivery status: PENDING / PUBLISHED / SENT / FAILED /
 * SKIPPED / DISABLED with dedupe keys, retry counts, and error messages.
 */
router.get(
    '/social',
    requirePermission('opportunity.review'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = Math.max(Number(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
            const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
            if (status && status.length > 32) throw new AppError('status query too long', 400);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const socialWhere: any = status ? { status: status as any } : {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const telegramWhere: any = status ? { status: status as any } : {};
            const [socialPosts, socialTotal, broadcasts, broadcastTotal] = await Promise.all([
                prisma.socialPost.findMany({
                    where: socialWhere,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: {
                        id: true, platform: true, status: true, dedupeKey: true,
                        scheduledFor: true, publishedAt: true, retryCount: true,
                        errorMessage: true, createdAt: true,
                        opportunity: { select: { id: true, slug: true, title: true } },
                    },
                }),
                prisma.socialPost.count({ where: socialWhere }),
                prisma.telegramBroadcast.findMany({
                    where: telegramWhere,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: {
                        id: true, channel: true, status: true, dedupeKey: true,
                        messageId: true, errorMessage: true, sentAt: true, createdAt: true,
                        opportunity: { select: { id: true, slug: true, title: true } },
                    },
                }),
                prisma.telegramBroadcast.count({ where: telegramWhere }),
            ]);
            res.setHeader('Cache-Control', 'private, no-store');
            return res.json({
                success: true, socialPosts, broadcasts,
                pagination: { page, limit, socialTotal, broadcastTotal },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/admin/notifications/social/:id/retry
 * Re-enqueue a FAILED social post. BullMQ retries transient failures
 * automatically; this is the manual escape hatch for reviewed failures.
 */
router.post(
    '/social/:id/retry',
    requirePermission('opportunity.review'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = String(req.params.id);
            const existing = await prisma.socialPost.findUnique({
                where: { id },
                select: { id: true, status: true },
            });
            if (!existing) throw new AppError('Social post not found', 404);
            if (existing.status === 'PUBLISHED') throw new AppError('Post is already published', 409);
            await retrySocialPost(id);
            return res.json({ success: true, message: 'Retry triggered' });
        } catch (error) {
            next(error);
        }
    }
);

/** GET /api/admin/notifications/controls — global delivery kill-switches. */
router.get(
    '/controls',
    requirePermission('opportunity.review'),
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const controls = await getAdminDeliveryControls();
            res.setHeader('Cache-Control', 'private, no-store');
            return res.json({ success: true, controls });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PATCH /api/admin/notifications/controls
 * SUPER_ADMIN-only (settings.manage): pause social auto-posting, user alerts,
 * or user emails globally. Audit-logged with the acting admin.
 */
router.patch(
    '/controls',
    requirePermission('settings.manage'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = controlsSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new AppError(parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
            }
            if (Object.keys(parsed.data).length === 0) throw new AppError('No control fields provided', 400);
            const controls = await updateAdminDeliveryControls(parsed.data, actorId(req) ?? undefined);
            return res.json({ success: true, controls });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
