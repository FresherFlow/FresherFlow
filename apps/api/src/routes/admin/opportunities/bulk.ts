import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { OpportunityStatus } from '@fresherflow/types';
import { withAdminAudit } from '../../../middleware/adminAudit';
import { invalidatePublicOpportunityCache } from '../../../infrastructure/services/publicOpportunityCache.service';
import { queueNewJobAlerts } from './_helpers';

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

            const oppsForTags = await prisma.opportunity.findMany({
                where: { id: { in: ids } },
                select: { id: true, slug: true, company: true, type: true, locations: true, requiredSkills: true, title: true, allowedPassoutYears: true }
            });
            const { slugify } = await import('@fresherflow/utils');
            const tags = new Set<string>(['homepage-feed']);
            const slugs: string[] = [];
            for (const opp of oppsForTags) {
                slugs.push(opp.slug);
                slugs.push(opp.id);
                if (opp.company) tags.add(`company-${slugify(opp.company)}`);
                if (opp.type === 'JOB') tags.add('hub-jobs');
                if (opp.type === 'INTERNSHIP') tags.add('hub-internships');
                if (opp.type === 'WALKIN') tags.add('hub-walkins');
                if (opp.type === 'GOVERNMENT') tags.add('hub-government');
                if (Array.isArray(opp.locations)) opp.locations.forEach(loc => tags.add(`location-${slugify(loc)}`));
                if (Array.isArray(opp.requiredSkills)) opp.requiredSkills.forEach(skill => tags.add(`skill-${slugify(skill)}`));
                if (Array.isArray(opp.allowedPassoutYears)) opp.allowedPassoutYears.forEach(year => tags.add(`batch-${year}`));
                const role = opp.title;
                if (role) tags.add(`role-${slugify(role)}`);
            }

            void invalidatePublicOpportunityCache({ idsOrSlugs: slugs, purgeFeed: true, tags: Array.from(tags) });
            if (action === 'PUBLISH' && idsNeedingAlerts.length > 0) {
                idsNeedingAlerts.forEach(id => queueNewJobAlerts(id));
            }
            // StaticFeedService.scheduleRefresh(); // Commented out to prevent automatic builds
        } catch (error) {
            next(error);
        }
    },
);

export default router;
