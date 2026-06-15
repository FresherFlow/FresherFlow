import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { OpportunityStatus } from '@fresherflow/types';
import { adminRateLimit } from '../../../middleware/adminRateLimit';
import { withAdminAudit, validateReason } from '../../../middleware/adminAudit';
import { AppError } from '../../../middleware/errorHandler';
import { invalidatePublicOpportunityCache } from '../../../infrastructure/services/publicOpportunityCache.service';
import { publishOpportunity } from '../../../application/opportunity/publish';
import { rejectOpportunity } from '../../../application/opportunity/moderation';
import { adminCache } from '../../../infrastructure/cache/adminCache';

const router = Router();

/**
 * POST /api/admin/opportunities/:id/expire
 */
router.post(
    '/:id/expire',
    adminRateLimit,
    withAdminAudit('EXPIRE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);

            const existing = await prisma.opportunity.findFirst({
                where: { OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await prisma.opportunity.update({
                where: { id: existing.id as string },
                data: {
                    expiresAt: new Date(Date.now() - 60 * 60 * 1000), // backdated
                    expiredAt: new Date(),
                },
            });

            res.json({ opportunity, message: 'Opportunity marked as expired' });

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id as string, existing.slug as string], purgeFeed: true, type: existing.type as string });
            // void StaticFeedService.scheduleRefresh();
        } catch (error) {
            next(error);
        }
    },
);

/**
 * POST /api/admin/opportunities/:id/restore
 */
router.post(
    '/:id/restore',
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);

            const existing = await prisma.opportunity.findFirst({
                where: { OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await prisma.opportunity.update({
                where: { id: existing.id as string },
                data: { deletedAt: null, deletionReason: null, status: OpportunityStatus.ARCHIVED },
            });

            res.json({ opportunity, message: 'Opportunity restored from deleted list' });

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            void invalidatePublicOpportunityCache({
                idsOrSlugs: [existing.id as string, existing.slug as string, opportunity.id as string, opportunity.slug as string],
                purgeFeed: true,
                type: existing.type as string,
            });
            // void StaticFeedService.scheduleRefresh();
        } catch (error) {
            next(error);
        }
    },
);

/**
 * DELETE /api/admin/opportunities/:id
 * Soft delete — marks ARCHIVED with deletedAt.
 */
router.delete(
    '/:id',
    adminRateLimit,
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);
            const { reason } = req.body;

            const existing = await prisma.opportunity.findFirst({
                where: { OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await prisma.opportunity.update({
                where: { id: existing.id as string },
                data: {
                    status: OpportunityStatus.ARCHIVED,
                    deletedAt: new Date(),
                    deletionReason: reason || 'Deleted by admin',
                },
            });

            res.json({ opportunity, message: 'Opportunity removed successfully (soft delete)' });

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id as string, existing.slug as string], purgeFeed: true, type: existing.type as string });
            // void StaticFeedService.scheduleRefresh();
        } catch (error) {
            next(error);
        }
    },
);

/**
 * POST /api/admin/opportunities/:id/publish
 */
router.post(
    '/:id/publish',
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const adminId = (req as any).user?.id || 'SYSTEM_ADMIN';

            if (!idParam) throw new AppError('Opportunity ID is required', 400);

            const existing = await prisma.opportunity.findFirst({
                where: { OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await publishOpportunity(existing.id as string, adminId);

            res.json({ opportunity, message: 'Opportunity published successfully' });

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            // void StaticFeedService.scheduleRefresh();
        } catch (error) {
            next(error);
        }
    },
);

/**
 * POST /api/admin/opportunities/:id/reject
 */
router.post(
    '/:id/reject',
    adminRateLimit,
    validateReason,
    withAdminAudit('REJECT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const adminId = (req as any).user?.id || 'SYSTEM_ADMIN';
            const { reason } = req.body;

            if (!idParam) throw new AppError('Opportunity ID is required', 400);

            const existing = await prisma.opportunity.findFirst({
                where: { OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await rejectOpportunity(existing.id as string, adminId, reason, false);

            res.json({ opportunity, message: 'Opportunity rejected and archived' });

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id as string, existing.slug as string], purgeFeed: true, type: existing.type as string });
            // void StaticFeedService.scheduleRefresh();
        } catch (error) {
            next(error);
        }
    },
);

/**
 * POST /api/admin/opportunities/:id/spam
 */
router.post(
    '/:id/spam',
    adminRateLimit,
    validateReason,
    withAdminAudit('SPAM'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const adminId = (req as any).user?.id || 'SYSTEM_ADMIN';
            const { reason } = req.body;

            if (!idParam) throw new AppError('Opportunity ID is required', 400);

            const existing = await prisma.opportunity.findFirst({
                where: { OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await rejectOpportunity(existing.id as string, adminId, reason, true);

            res.json({ opportunity, message: 'Opportunity flagged as spam and archived' });

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id as string, existing.slug as string], purgeFeed: true, type: existing.type as string });
            // void StaticFeedService.scheduleRefresh();
        } catch (error) {
            next(error);
        }
    },
);

export default router;
