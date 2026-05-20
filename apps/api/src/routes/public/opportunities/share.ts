import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
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

        // Resolve or create User Shares IngestionSource (violates FK constraint if not present)
        let ingestionSource = await prisma.ingestionSource.findFirst({
            where: { name: 'User Shares' }
        });

        if (!ingestionSource) {
            ingestionSource = await prisma.ingestionSource.create({
                data: {
                    name: 'User Shares',
                    sourceType: 'CUSTOM',
                    endpoint: 'Mobile App Share',
                    defaultType: 'JOB',
                }
            });
        }

        const sourceId = ingestionSource?.id || '';

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
                    sourceId,
                    sourceLink: normalizedUrl,
                    createdByUserId: userId || undefined,
                    status: 'DEDUPED',
                    mappedOpportunityId: existing.id as string,
                    rawPayload: {
                        sharedByUserId: userId,
                        originalUrl: url,
                        source: 'mobile_share',
                        note: 'Immediate URL match'
                    }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any
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
        const existingRaw = await prisma.rawOpportunity.findFirst({
            where: {
                sourceLink: normalizedUrl,
                status: { in: ['FETCHED', 'DRAFT_CREATED'] }
            }
        });

        if (existingRaw) {
            return res.status(409).json({
                message: 'This link is already under review!'
            });
        }

        const rawOpportunity = await prisma.rawOpportunity.create({
            data: {
                sourceId,
                sourceLink: normalizedUrl,
                createdByUserId: userId || undefined,
                status: 'FETCHED',
                rawPayload: {
                    sharedByUserId: userId,
                    originalUrl: url,
                    source: 'mobile_share'
                }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
        });

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
