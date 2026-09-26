import { Router, Request, Response, NextFunction } from 'express';
import { requirePermission } from '../../../middleware/auth';
import { withAdminAudit } from '../../../middleware/adminAudit';
import { invalidatePublicOpportunityCache } from '../../../infrastructure/services/opportunity/publicOpportunityCache.service';
import { queueNewJobAlerts } from './_helpers';
import { OpportunityService } from '../../../infrastructure/services/opportunity/opportunity.service';
import { getGranularTagsForOpportunity } from '../../../infrastructure/services/opportunity/publish.service';
import type { Opportunity } from '@fresherflow/database';

const router = Router();

/**
 * POST /api/admin/opportunities/bulk
 * Bulk publish, archive, expire, or delete by ID array.
 */
/**
 * The bulk action needs the permission of what it does: PUBLISH needs
 * opportunity.publish, ARCHIVE/EXPIRE need opportunity.archive, DELETE needs
 * opportunity.delete (SUPER_ADMIN-only — moderators get 403 on bulk delete).
 */
function requireBulkActionPermission(req: Request, res: Response, next: NextFunction) {
    const action = (req.body as { action?: unknown })?.action;
    const key = action === 'PUBLISH'
        ? 'opportunity.publish'
        : action === 'ARCHIVE' || action === 'EXPIRE'
            ? 'opportunity.archive'
            : 'opportunity.delete';
    return requirePermission(key)(req, res, next);
}

router.post(
    '/bulk',
    requireBulkActionPermission,
    withAdminAudit('BULK_ACTION'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { ids, action, reason } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'IDs array is required' });
            }
            if (!action || !['DELETE', 'ARCHIVE', 'PUBLISH', 'EXPIRE'].includes(action)) {
                return res.status(400).json({ message: 'Valid action (DELETE, ARCHIVE, PUBLISH, EXPIRE) is required' });
            }

            const { result, idsNeedingAlerts, oppsForTags } = await OpportunityService.executeBulkAction(
                ids,
                action as 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'EXPIRE',
                reason
            );

            res.json({
                message: `Bulk ${action.toLowerCase()} completed`,
                action,
                requestedCount: ids.length,
                updatedCount: result.count,
                skippedCount: Math.max(0, ids.length - result.count),
            });

            const { slugify } = await import('@fresherflow/utils');
            const tags = new Set<string>(['homepage-feed']);
            const slugs: string[] = [];
            for (const opp of oppsForTags) {
                slugs.push(opp.slug);
                slugs.push(opp.id);
                if (opp.company) tags.add(`company-${slugify(opp.company)}`);
                // Hub tags are derived from the independent dimensions; reuse the
                // shared helper so bulk invalidation can never drift from the
                // tags the publish path generates.
                // Cast via the helper's own parameter type: the findMany select returns a
                // narrower shape than the full Prisma Opportunity model.
                for (const tag of getGranularTagsForOpportunity(opp as Parameters<typeof getGranularTagsForOpportunity>[0])) {
                    if (tag.startsWith('hub-')) tags.add(tag);
                }
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

