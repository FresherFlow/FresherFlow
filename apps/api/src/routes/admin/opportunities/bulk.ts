import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { OpportunityStatus } from '@fresherflow/types';
import { withAdminAudit } from '../../../middleware/adminAudit';
import { invalidatePublicOpportunityCache } from '../../../infrastructure/services/publicOpportunityCache.service';
import { queueNewJobAlerts } from './_helpers';
import { StaticFeedService } from '../../../infrastructure/services/staticFeed.service';

const router = Router();

/**
 * POST /api/admin/opportunities/bulk
 * Bulk publish, archive, expire, or delete by ID array.
 */
router.post(
    '/bulk',
    withAdminAudit('BULK_ACTION'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { ids, action, reason } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'IDs array is required' });
            }
            if (!action) {
                return res.status(400).json({ message: 'Action is required' });
            }

            const now = new Date();
            let result;
            let idsNeedingAlerts: string[] = [];

            switch (action) {
                case 'DELETE':
                    result = await prisma.opportunity.updateMany({
                        where: { id: { in: ids } },
                        data: { status: OpportunityStatus.ARCHIVED, deletedAt: now, deletionReason: reason || 'Bulk deleted by admin' },
                    });
                    break;
                case 'ARCHIVE':
                    result = await prisma.opportunity.updateMany({
                        where: { id: { in: ids } },
                        data: { status: OpportunityStatus.ARCHIVED },
                    });
                    break;
                case 'PUBLISH':
                    idsNeedingAlerts = (await prisma.opportunity.findMany({
                        where: { id: { in: ids }, status: { not: OpportunityStatus.PUBLISHED } },
                        select: { id: true },
                    })).map(item => item.id);
                    result = await prisma.opportunity.updateMany({
                        where: { id: { in: ids } },
                        data: { status: OpportunityStatus.PUBLISHED, expiredAt: null, deletedAt: null },
                    });
                    break;
                case 'EXPIRE':
                    result = await prisma.opportunity.updateMany({
                        where: { id: { in: ids } },
                        data: { expiredAt: now },
                    });
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid action' });
            }

            res.json({
                message: `Bulk ${action.toLowerCase()} completed`,
                action,
                requestedCount: ids.length,
                updatedCount: result.count,
                skippedCount: Math.max(0, ids.length - result.count),
            });

            void invalidatePublicOpportunityCache({ idsOrSlugs: ids, purgeFeed: true });
            if (action === 'PUBLISH' && idsNeedingAlerts.length > 0) {
                idsNeedingAlerts.forEach(id => queueNewJobAlerts(id));
            }
            void StaticFeedService.refresh();
        } catch (error) {
            next(error);
        }
    },
);

export default router;
