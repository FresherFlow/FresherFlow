import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@fresherflow/database';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { ingestionQueue } from '@fresherflow/queue';
import { tryResolveUserIdFromCookie } from './_helpers';
import { updateOpportunityEngagement } from '../../../application/opportunity/engagement';

const router = Router();

/**
 * POST /api/opportunities/share
 * Lightweight endpoint to share a link for background processing.
 */
router.post('/share', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { url } = req.body;
        const userId = tryResolveUserIdFromCookie(req);

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'URL is required' });
        }

        const normalizedUrl = normalizeOpportunityUrl(url);

        // 1. Check for existing opportunities with this URL
        const existing = await prisma.opportunity.findFirst({
            where: {
                OR: [
                    { sourceLink: normalizedUrl },
                    { applyLink: normalizedUrl }
                ],
                deletedAt: null
            }
        });

        if (existing) {
            // Still record the share for popularity signaling
            await prisma.rawOpportunity.create({
                data: {
                    sourceId: 'USER_SHARE',
                    sourceLink: normalizedUrl,
                    createdByUserId: userId,
                    status: 'DEDUPED',
                    mappedOpportunityId: existing.id as string,
                    rawPayload: {
                        sharedByUserId: userId,
                        originalUrl: url,
                        source: 'mobile_share',
                        note: 'Immediate URL match'
                    }
                }
            });

            // Update Engagement Counters (Item 161 in plan)
            await updateOpportunityEngagement(existing.id as string, 'share');

            return res.status(200).json({
                success: true,
                message: 'Opportunity already exists! Your contribution has been recorded.',
                id: existing.id,
                existing: true
            });
        }


        // 2. Check for existing raw/pending ingestion
        // Note: We still create a new record for EACH share attempt to track "momentum"
        // but we might want to avoid re-enqueuing if it's already pending.
        const existingRaw = await prisma.rawOpportunity.findFirst({
            where: {
                sourceLink: normalizedUrl,
                status: { in: ['FETCHED', 'DRAFT_CREATED'] }
            }
        });

        const rawOpportunity = await prisma.rawOpportunity.create({
            data: {
                sourceId: 'USER_SHARE',
                sourceLink: normalizedUrl,
                createdByUserId: userId,
                status: 'FETCHED',
                rawPayload: {
                    sharedByUserId: userId,
                    originalUrl: url,
                    source: 'mobile_share'
                }
            }
        });

        if (existingRaw) {
            // Already being processed, so we just record our share but don't re-enqueue
            return res.status(200).json({
                success: true,
                message: 'This link is already being processed! Your contribution has been added.',
                id: rawOpportunity.id,
                pending: true
            });
        }

        // 3. Enqueue background parsing
        await ingestionQueue.add('process-user-share', {
            rawOpportunityId: rawOpportunity.id,
            url: normalizedUrl,
            userId
        });

        res.status(202).json({
            success: true,
            message: 'Link shared successfully! It will be processed shortly.',
            id: rawOpportunity.id
        });
    } catch (error) {
        next(error);
    }
});


export default router;
