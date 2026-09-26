import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { requirePermission } from '../../../middleware/auth';
import { OpportunityStatus, Opportunity } from '@fresherflow/types';
import { adminRateLimit } from '../../../middleware/adminRateLimit';
import { withAdminAudit, validateReason } from '../../../middleware/adminAudit';
import { AppError } from '../../../middleware/errorHandler';
import { invalidatePublicOpportunityCache } from '../../../infrastructure/services/publicOpportunityCache.service';
import { getGranularTagsForOpportunity } from '../../../infrastructure/services/publish.service';
import { publishOpportunity } from '../../../application/opportunity/publish';
import { rejectOpportunity } from '../../../application/opportunity/moderation';
import { adminCache } from '../../../infrastructure/cache/adminCache';

const router = Router();

/**
 * POST /api/admin/opportunities/:id/expire
 */
router.post(
    '/:id/expire',
    requirePermission('opportunity.archive'),
    adminRateLimit,
    withAdminAudit('EXPIRE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);

            const existing = await prisma.opportunity.findFirst({
                // Exclude soft-deleted rows: only /restore may act on them.
                where: { deletedAt: null, OR: [{ id: idParam }, { slug: idParam }] },
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

            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id as string, existing.slug as string], purgeFeed: true, type: existing.category as string, tags: getGranularTagsForOpportunity(existing as unknown as Partial<Opportunity>) });
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
    requirePermission('opportunity.restore'),
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
                type: opportunity.category as string,
                tags: getGranularTagsForOpportunity(opportunity as unknown as Partial<Opportunity>)
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
    requirePermission('opportunity.archive'),
    adminRateLimit,
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);
            const { reason } = req.body;

            const existing = await prisma.opportunity.findFirst({
                // Exclude soft-deleted rows: only /restore may act on them.
                where: { deletedAt: null, OR: [{ id: idParam }, { slug: idParam }] },
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

            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id as string, existing.slug as string], purgeFeed: true, type: existing.category as string, tags: getGranularTagsForOpportunity(existing as unknown as Partial<Opportunity>) });
            // void StaticFeedService.scheduleRefresh();
        } catch (error) {
            next(error);
        }
    },
);

/**
 * DELETE /api/admin/opportunities/:id/hard
 * Hard delete — completely removes the opportunity from the database.
 * Use with caution.
 */
router.delete(
    '/:id/hard',
    requirePermission('opportunity.delete'),
    adminRateLimit,
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);

            const existing = await prisma.opportunity.findFirst({
                // Exclude soft-deleted rows: only /restore may act on them.
                where: { deletedAt: null, OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunityId = existing.id as string;

            // Hard delete must succeed even where the deployed database still
            // carries RESTRICT FKs from older migrations (the schema declares
            // Cascades, but drift happens). Delete leaf rows first inside one
            // short transaction — no network calls inside — then the
            // opportunity itself.
            await prisma.$transaction(async (tx) => {
                const commentIds = (
                    await tx.opportunityComment.findMany({
                        where: { opportunityId },
                        select: { id: true },
                    })
                ).map((comment) => comment.id);
                if (commentIds.length > 0) {
                    await tx.commentVote.deleteMany({ where: { commentId: { in: commentIds } } });
                    await tx.notification.deleteMany({ where: { commentId: { in: commentIds } } });
                    await tx.report.deleteMany({ where: { commentId: { in: commentIds } } });
                }

                const interviewIds = (
                    await tx.interviewExperience.findMany({
                        where: { opportunityId },
                        select: { id: true },
                    })
                ).map((experience) => experience.id);
                if (interviewIds.length > 0) {
                    await tx.interviewExperienceVote.deleteMany({
                        where: { interviewExperienceId: { in: interviewIds } },
                    });
                }

                await tx.jobSignal.deleteMany({ where: { opportunityId } });
                await tx.savedOpportunity.deleteMany({ where: { opportunityId } });
                await tx.userAction.deleteMany({ where: { opportunityId } });
                await tx.listingFeedback.deleteMany({ where: { opportunityId } });
                await tx.platformEvent.deleteMany({ where: { opportunityId } });
                await tx.opportunityEvent.deleteMany({ where: { opportunityId } });
                await tx.telegramBroadcast.deleteMany({ where: { opportunityId } });
                await tx.socialPost.deleteMany({ where: { opportunityId } });
                await tx.opportunityComment.deleteMany({ where: { opportunityId } });
                await tx.report.deleteMany({ where: { opportunityId } });
                await tx.interviewExperience.deleteMany({ where: { opportunityId } });
                await tx.applicationUpdate.deleteMany({ where: { opportunityId } });

                await tx.alertDelivery.updateMany({ where: { opportunityId }, data: { opportunityId: null } });
                await tx.alertDispatchLog.updateMany({ where: { opportunityId }, data: { opportunityId: null } });
                await tx.jobSubmission.updateMany({ where: { opportunityId }, data: { opportunityId: null } });
                await tx.salaryReport.updateMany({ where: { opportunityId }, data: { opportunityId: null } });
                await tx.rawOpportunity.updateMany({
                    where: { mappedOpportunityId: opportunityId },
                    data: { mappedOpportunityId: null },
                });
                await tx.notification.updateMany({ where: { opportunityId }, data: { opportunityId: null } });

                // `walkInDetails` was renamed to `driveDetails` when walk-ins became
                // a recruitment method rather than a separate opportunity type.
                await tx.driveDetails.deleteMany({ where: { opportunityId } });
                await tx.governmentJobDetails.deleteMany({ where: { opportunityId } });

                await tx.opportunity.delete({ where: { id: opportunityId } });
            });

            res.json({ message: 'Opportunity permanently deleted' });

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id as string, existing.slug as string], purgeFeed: true, type: existing.category as string, tags: getGranularTagsForOpportunity(existing as unknown as Partial<Opportunity>) });
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
    requirePermission('opportunity.publish'),
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
    requirePermission('opportunity.review'),
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
                // Exclude soft-deleted rows: only /restore may act on them.
                where: { deletedAt: null, OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await rejectOpportunity(existing.id as string, adminId, reason, false);

            res.json({ opportunity, message: 'Opportunity rejected and archived' });

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id as string, existing.slug as string], purgeFeed: true, type: existing.category as string, tags: getGranularTagsForOpportunity(existing as unknown as Partial<Opportunity>) });
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
    requirePermission('opportunity.archive'),
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
                // Exclude soft-deleted rows: only /restore may act on them.
                where: { deletedAt: null, OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await rejectOpportunity(existing.id as string, adminId, reason, true);

            res.json({ opportunity, message: 'Opportunity flagged as spam and archived' });

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            void invalidatePublicOpportunityCache({ idsOrSlugs: [existing.id as string, existing.slug as string], purgeFeed: true, type: existing.category as string, tags: getGranularTagsForOpportunity(existing as unknown as Partial<Opportunity>) });
            // void StaticFeedService.scheduleRefresh();
        } catch (error) {
            next(error);
        }
    },
);

export default router;
