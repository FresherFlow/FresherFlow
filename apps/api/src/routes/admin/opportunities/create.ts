import { Router, Request, Response, NextFunction } from 'express';
import prisma, { OpportunityStatus as DbOpportunityStatus } from '../../../infrastructure/database/prisma';
import { OpportunityStatus } from '@fresherflow/types';
import { adminRateLimit } from '../../../middleware/adminRateLimit';
import { withAdminAudit } from '../../../middleware/adminAudit';
import { validate } from '../../../middleware/validate';
import { sendError, ErrorCode } from '../../../middleware/errorHandler';
import { opportunitySchema } from '../../../utils/validation';
import { requirePermission } from '../../../middleware/auth';
import {
    createListing, updateListing, ListingWriteError,
} from '../../../application/opportunity/listingWrite';
import { handleOpportunityPublished } from '../../../infrastructure/services/opportunity/publish.service';
import { invalidatePublicOpportunityCache } from '../../../infrastructure/services/opportunity/publicOpportunityCache.service';
import { refreshFeedsAndAnnounce } from '../../../infrastructure/services/opportunity/feedRefresh';
import { buildIdOrSlugWhere } from '../../../application/opportunity/listingPayload';
import { adminCache } from '../../../infrastructure/cache/adminCache';

const router = Router();

/**
 * Translate a service-layer failure into the one error envelope clients already
 * understand. The write rules live in `application/opportunity/listingWrite.ts`
 * so the internal MCP surface can share them; this keeps the HTTP mapping here.
 */
function respondWithWriteError(
    res: Response,
    req: Request,
    error: ListingWriteError,
): Response {
    return sendError(res, error.status, ErrorCode[error.code], error.message, req.requestId, error.details);
}

/**
 * Status transitions need the permission of the destination state, mirroring
 * lifecycle.ts: publishing needs opportunity.publish, expiring/archiving
 * needs opportunity.archive, anything else needs opportunity.edit.
 */
function requireStatusPermission() {
    return async (req: Request, res: Response, next: NextFunction) => {
        const status = typeof req.body?.status === 'string' ? req.body.status : '';
        const key = status === 'PUBLISHED'
            ? 'opportunity.publish'
            : status === 'EXPIRED' || status === 'ARCHIVED'
                ? 'opportunity.archive'
                : 'opportunity.edit';
        return requirePermission(key)(req, res, next);
    };
}

/**
 * POST /api/admin/opportunities
 * Create and immediately publish an opportunity.
 */
router.post(
    '/',
    requirePermission('opportunity.create'),
    adminRateLimit,
    withAdminAudit('CREATE'),
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { listing } = await createListing(req.body, {
                actorId: req.adminId as string,
                status: 'PUBLISHED',
                onDuplicate: 'reject',
            });
            res.status(201).json({ opportunity: listing, message: 'Opportunity created successfully.' });
        } catch (error) {
            if (error instanceof ListingWriteError) {
                return respondWithWriteError(res, req, error);
            }
            next(error);
        }
    },
);

/**
 * POST /api/admin/opportunities/ingest-draft
 * Automation-safe entrypoint — always creates DRAFT for admin review.
 */
router.post(
    '/ingest-draft',
    requirePermission('opportunity.create'),
    adminRateLimit,
    withAdminAudit('CREATE'),
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { listing } = await createListing(req.body, {
                actorId: req.adminId as string,
                status: 'DRAFT',
                onDuplicate: 'reject',
            });
            res.status(201).json({
                opportunity: listing,
                message: 'Draft ingested successfully. Review and publish from admin.',
            });
        } catch (error) {
            if (error instanceof ListingWriteError) {
                return respondWithWriteError(res, req, error);
            }
            next(error);
        }
    },
);

/**
 * PUT /api/admin/opportunities/:id
 */
router.put(
    '/:id',
    requirePermission('opportunity.edit'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { listing, previousStatus } = await updateListing(
                req.params.id as string,
                req.body,
            );
            const message = previousStatus !== OpportunityStatus.PUBLISHED
                && listing.status === OpportunityStatus.PUBLISHED
                ? 'Opportunity published successfully.'
                : 'Opportunity updated successfully';
            res.json({ opportunity: listing, message });
        } catch (error) {
            if (error instanceof ListingWriteError) {
                return respondWithWriteError(res, req, error);
            }
            next(error);
        }
    },
);

/**
 * PATCH /api/admin/opportunities/:id/status
 * Lightweight status-only update (used by quick Publish / quick Expire buttons).
 * Does NOT require the full opportunitySchema — just { status }.
 */
router.patch(
    '/:id/status',
    requireStatusPermission(),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            const { status } = req.body as { status: string };

            if (!status) return sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'status is required', req.requestId);

            const existing = await prisma.opportunity.findFirst({
                where: buildIdOrSlugWhere(idParam),
            });
            if (!existing) return sendError(res, 404, ErrorCode.NOT_FOUND, 'Opportunity not found', req.requestId);

            const opportunity = await prisma.opportunity.update({
                where: { id: existing.id as string },
                data: {
                    status: status as unknown as DbOpportunityStatus,
                    ...(status === OpportunityStatus.PUBLISHED ? { expiredAt: null, expiresAt: null, deletedAt: null, deletionReason: null } : {}),
                },
                include: { driveDetails: true, governmentJobDetails: true },
            });

            // Fire publish pipeline if transitioning to PUBLISHED
            if (existing.status !== OpportunityStatus.PUBLISHED && status === OpportunityStatus.PUBLISHED) {
                await handleOpportunityPublished(opportunity as unknown as import('@fresherflow/types').Opportunity, { isNew: true });
            } else if (existing.status === OpportunityStatus.PUBLISHED && status !== OpportunityStatus.PUBLISHED) {
                // Leaving the live set is a removal: the R2 feed still lists the
                // listing and its job shard still resolves, so /jobs/<slug>
                // stayed reachable after the admin set it back to draft or
                // archived. Rebuild (which collects the shard), then announce
                // the new snapshot once it exists.
                void invalidatePublicOpportunityCache({
                    idsOrSlugs: [existing.id as string, existing.slug as string],
                    purgeFeed: true,
                    type: existing.category as string,
                    tags: [],
                });
                void refreshFeedsAndAnnounce('status-unpublish');
            }

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            res.json({ opportunity, message: `Status updated to ${status}` });
        } catch (error) {
            next(error);
        }
    },
);

export default router;