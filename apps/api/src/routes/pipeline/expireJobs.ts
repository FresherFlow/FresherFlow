import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database/prisma';
import { requireInternalApiKey } from '../../middleware/auth';
import { invalidatePublicOpportunityCache } from '../../infrastructure/services/publicOpportunityCache.service';
import { adminCache } from '../../infrastructure/cache/adminCache';
import { logger } from '@fresherflow/logger';

const router = Router();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

/**
 * Body schema for POST /api/pipeline/expire-jobs
 *
 * Accepts either:
 *   - A list of specific job IDs/slugs to expire immediately, OR
 *   - A `sweepExpired` flag to auto-expire all jobs whose `expiresAt` is in the past
 *     and are currently PUBLISHED.
 */
const expireJobsSchema = z.object({
    /**
     * Optional list of opportunity IDs (UUID) or slugs to expire directly.
     * When provided, only these specific jobs are expired regardless of their `expiresAt`.
     */
    ids: z.array(z.string().min(1)).max(500).optional(),

    /**
     * When true, the API will scan for all PUBLISHED jobs whose `expiresAt`
     * is set and is now in the past, and expire them all in one batch.
     * Defaults to false.
     */
    sweepExpired: z.boolean().optional().default(false),

    /**
     * Optional reason stored with the expiry for audit trail.
     * Defaults to 'Expired by automated pipeline'.
     */
    reason: z.string().max(256).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/pipeline/expire-jobs
// ---------------------------------------------------------------------------

/**
 * Expires one or more job opportunities.
 *
 * Authentication: x-api-key header matching INTERNAL_API_SECRET env var.
 *
 * Modes:
 *   1. Targeted — provide `ids[]` of specific jobs to expire.
 *   2. Sweep    — set `sweepExpired: true` to auto-expire all stale PUBLISHED jobs.
 *   3. Combined — both can be used together in a single call.
 *
 * The endpoint is idempotent: already-expired jobs are skipped and reported separately.
 *
 * @example
 * POST /api/pipeline/expire-jobs
 * x-api-key: <INTERNAL_API_SECRET>
 * { "sweepExpired": true }
 *
 * @example
 * POST /api/pipeline/expire-jobs
 * x-api-key: <INTERNAL_API_SECRET>
 * { "ids": ["job-uuid-1", "some-job-slug"] }
 */
router.post(
    '/expire-jobs',
    requireInternalApiKey,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = expireJobsSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                });
            }

            const { ids, sweepExpired, reason } = parsed.data;
            const expiredReason = reason || 'Expired by automated pipeline';
            const now = new Date();

            const expiredIds: string[] = [];
            const skippedIds: string[] = [];
            const notFoundIds: string[] = [];

            // ---------------------------------------------------------------
            // 1. Targeted expiry — specific IDs/slugs
            // ---------------------------------------------------------------
            if (ids && ids.length > 0) {
                const found = await prisma.opportunity.findMany({
                    where: {
                        OR: ids.map((idOrSlug) => [{ id: idOrSlug }, { slug: idOrSlug }]).flat(),
                    },
                    select: { id: true, slug: true, expiredAt: true, type: true },
                });

                const foundIdSet = new Set(found.map((o) => o.id));
                const foundSlugSet = new Set(found.map((o) => o.slug).filter(Boolean));

                // Report anything not found
                for (const idOrSlug of ids) {
                    if (!foundIdSet.has(idOrSlug) && !foundSlugSet.has(idOrSlug)) {
                        notFoundIds.push(idOrSlug);
                    }
                }

                for (const opp of found) {
                    if (opp.expiredAt) {
                        // Already expired — skip to keep idempotency
                        skippedIds.push(opp.id);
                        continue;
                    }

                    await prisma.opportunity.update({
                        where: { id: opp.id },
                        data: {
                            expiresAt: new Date(now.getTime() - 60 * 60 * 1000), // backdated 1h
                            expiredAt: now,
                        },
                    });

                    expiredIds.push(opp.id);

                    adminCache.invalidate(opp.id);
                    if (opp.slug) adminCache.invalidate(opp.slug);

                    void invalidatePublicOpportunityCache({
                        idsOrSlugs: [opp.id, opp.slug as string].filter(Boolean),
                        purgeFeed: true,
                        type: opp.type as string,
                    });
                }
            }

            // ---------------------------------------------------------------
            // 2. Sweep mode — auto-expire all stale PUBLISHED jobs
            // ---------------------------------------------------------------
            if (sweepExpired) {
                const staleJobs = await prisma.opportunity.findMany({
                    where: {
                        status: 'PUBLISHED',
                        expiresAt: { lt: now },
                        expiredAt: null,
                    },
                    select: { id: true, slug: true, type: true },
                });

                logger.info(`[pipeline/expire-jobs] Sweep found ${staleJobs.length} stale jobs to expire.`);

                for (const opp of staleJobs) {
                    await prisma.opportunity.update({
                        where: { id: opp.id },
                        data: {
                            expiresAt: new Date(now.getTime() - 60 * 60 * 1000), // backdated 1h
                            expiredAt: now,
                        },
                    });

                    expiredIds.push(opp.id);

                    adminCache.invalidate(opp.id);
                    if (opp.slug) adminCache.invalidate(opp.slug);

                    void invalidatePublicOpportunityCache({
                        idsOrSlugs: [opp.id, opp.slug as string].filter(Boolean),
                        purgeFeed: true,
                        type: opp.type as string,
                    });
                }
            }

            logger.info(`[pipeline/expire-jobs] Done. expired=${expiredIds.length} skipped=${skippedIds.length} notFound=${notFoundIds.length} reason="${expiredReason}"`);

            return res.json({
                success: true,
                expired: expiredIds.length,
                skipped: skippedIds.length,
                notFound: notFoundIds.length,
                expiredIds,
                skippedIds,
                notFoundIds,
            });
        } catch (error) {
            next(error);
        }
    },
);

export default router;
