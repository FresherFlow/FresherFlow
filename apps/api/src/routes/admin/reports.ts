import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database/prisma';
import { validate } from '../../middleware/validate';
import { actorId, requirePermission, requireStaff } from '../../middleware/auth';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit } from '../../middleware/adminAudit';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Mounted as /api/admin/reports behind a domain gate in index.ts; enforce
// staff auth here like routes/admin/opportunities/index.ts does: admins and
// moderators (via the normal login) pass requireStaff, then report.resolve
// decides. Queue reads and resolve/dismiss are one workflow, so
// report.resolve gates the router.
router.use(requireStaff, requirePermission('report.resolve'));

const REPORT_STATUSES = ['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as const;

const resolveSchema = z.object({
    note: z.string().trim().max(500).optional(),
});

/**
 * GET /api/admin/reports?status=OPEN&page=1&limit=20
 * Prisma-backed report triage queue. Defaults to OPEN, newest first.
 * This is the canonical moderation queue — the legacy Firebase feedback
 * view must not be used as a moderation dependency.
 */
router.get(
    '/',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const requested = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'OPEN';
            const status = (REPORT_STATUSES as readonly string[]).includes(requested)
                ? requested
                : 'OPEN';
            if (requested.length > 32) throw new AppError('status query too long', 400);

            const page = Math.max(Number(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
            const skip = (page - 1) * limit;

            const where = { status: status as (typeof REPORT_STATUSES)[number] };

            const [reports, total, openCount] = await Promise.all([
                prisma.report.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        reason: true,
                        message: true,
                        status: true,
                        createdAt: true,
                        resolvedAt: true,
                        opportunityId: true,
                        commentId: true,
                        reporter: { select: { id: true, fullName: true, username: true, email: true } },
                        resolvedBy: { select: { id: true, fullName: true, username: true } },
                        opportunity: { select: { id: true, slug: true, title: true, company: true } },
                        comment: { select: { id: true, text: true, opportunityId: true } },
                    },
                }),
                prisma.report.count({ where }),
                prisma.report.count({ where: { status: 'OPEN' } }),
            ]);

            res.setHeader('Cache-Control', 'private, no-store');
            res.json({
                reports,
                openCount,
                status,
                pagination: { total, page, limit, pages: Math.ceil(total / limit) },
            });
        } catch (error) {
            next(error);
        }
    },
);

/**
 * POST /api/admin/reports/:id/resolve
 * Marks an OPEN/REVIEWING report RESOLVED. Content removal (if warranted)
 * happens via the admin community moderation routes, not here.
 */
router.post(
    '/:id/resolve',
    adminRateLimit,
    validate(resolveSchema),
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = String(req.params.id);
            const actor = actorId(req) ?? 'system';

            const report = await prisma.report.findUnique({
                where: { id },
                select: { id: true, status: true },
            });
            if (!report) throw new AppError('Report not found', 404);
            if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
                throw new AppError(`Report is already ${report.status.toLowerCase()}`, 409);
            }

            const updated = await prisma.report.update({
                where: { id },
                data: { status: 'RESOLVED', resolvedById: actor, resolvedAt: new Date() },
                select: { id: true, status: true, resolvedAt: true },
            });

            return res.json({ success: true, report: updated });
        } catch (error) {
            next(error);
        }
    },
);

/**
 * POST /api/admin/reports/:id/dismiss
 * Marks an OPEN/REVIEWING report DISMISSED (no violation found).
 */
router.post(
    '/:id/dismiss',
    adminRateLimit,
    validate(resolveSchema),
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = String(req.params.id);
            const actor = actorId(req) ?? 'system';

            const report = await prisma.report.findUnique({
                where: { id },
                select: { id: true, status: true },
            });
            if (!report) throw new AppError('Report not found', 404);
            if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
                throw new AppError(`Report is already ${report.status.toLowerCase()}`, 409);
            }

            const updated = await prisma.report.update({
                where: { id },
                data: { status: 'DISMISSED', resolvedById: actor, resolvedAt: new Date() },
                select: { id: true, status: true, resolvedAt: true },
            });

            return res.json({ success: true, report: updated });
        } catch (error) {
            next(error);
        }
    },
);

export default router;
