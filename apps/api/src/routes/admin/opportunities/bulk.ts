import { Router, Request, Response, NextFunction } from 'express';
import { requirePermission } from '../../../middleware/auth';
import { withAdminAudit } from '../../../middleware/adminAudit';
import { sendError, ErrorCode } from '../../../middleware/errorHandler';
import { invalidatePublicOpportunityCache } from '../../../infrastructure/services/opportunity/publicOpportunityCache.service';
import { queueNewJobAlerts } from '../../../application/opportunity/listingPayload';
import { OpportunityService } from '../../../infrastructure/services/opportunity/opportunity.service';
import { getGranularTagsForOpportunity } from '../../../infrastructure/services/opportunity/publish.service';
import type { Opportunity } from '@fresherflow/database';
import { scheduleDiscoveryFeedRefresh } from '../../../infrastructure/services/opportunity/feedRefresh';
import { notifyWebFeedChanged } from '../../../infrastructure/services/opportunity/webRevalidation.service';
import { logger } from '@fresherflow/utils';

const router = Router();

/**
 * Rebuild the discovery feeds and, once the rebuild has landed, tell the web
 * app that its cached copies are stale.
 *
 * A bulk action moves a whole batch of jobs in or out of the live set, so
 * both halves are required: the feed files decide what the hub pages show,
 * and the web app only re-reads those files when it is told. The announcement
 * is chained onto the rebuild because a tag bust only makes Next re-read the
 * SAME CDN URL — telling the web before the new snapshot exists re-caches the
 * version that is about to be replaced.
 */
function scheduleFeedRefreshAndRevalidate(reason: string): void {
    void Promise.resolve(scheduleDiscoveryFeedRefresh())
        .then(() => notifyWebFeedChanged(reason))
        .catch((err) => {
            logger.error('[bulk] Web feed revalidation announcement failed', {
                reason,
                error: err instanceof Error ? err.message : String(err),
            });
        });
}

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
                return sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'IDs array is required', req.requestId);
            }
            if (!action || !['DELETE', 'ARCHIVE', 'PUBLISH', 'EXPIRE'].includes(action)) {
                return sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Valid action (DELETE, ARCHIVE, PUBLISH, EXPIRE) is required', req.requestId);
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
            // One debounced rebuild for the whole batch, instead of one per row.
            // The Redis invalidation above only clears cached copies; the feed
            // files themselves are what the hub pages read.
            scheduleFeedRefreshAndRevalidate(`bulk-${action.toLowerCase()}`);
        } catch (error) {
            next(error);
        }
    },
);

export default router;

