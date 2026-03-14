import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../lib/prisma';
import { OpportunityStatus } from '@fresherflow/types';
import { adminRateLimit } from '../../../middleware/adminRateLimit';
import { withAdminAudit, validateReason } from '../../../middleware/adminAudit';
import { AppError } from '../../../middleware/errorHandler';
import { invalidatePublicOpportunityCache } from '../../../services/publicOpportunityCache.service';

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
                where: { id: existing.id },
                data: {
                    expiresAt: new Date(Date.now() - 60 * 60 * 1000), // backdated
                    expiredAt: new Date(),
                },
            });

            res.json({ opportunity, message: 'Opportunity marked as expired' });
            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id, existing.slug], purgeFeed: true });
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
                where: { id: existing.id },
                data: { deletedAt: null, deletionReason: null, status: OpportunityStatus.ARCHIVED },
            });

            res.json({ opportunity, message: 'Opportunity restored from deleted list' });
            void invalidatePublicOpportunityCache({
                idsOrSlugs: [existing.id, existing.slug, opportunity.id, opportunity.slug],
                purgeFeed: true,
            });
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
                where: { id: existing.id },
                data: {
                    status: OpportunityStatus.ARCHIVED,
                    deletedAt: new Date(),
                    deletionReason: reason || 'Deleted by admin',
                },
            });

            res.json({ opportunity, message: 'Opportunity removed successfully (soft delete)' });
            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id, existing.slug], purgeFeed: true });
        } catch (error) {
            next(error);
        }
    },
);

export default router;
