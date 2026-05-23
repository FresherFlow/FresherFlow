import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { ingestionQueue } from '@fresherflow/queue';
import { tryResolveUserIdFromCookie } from './_helpers';
import { requireAuth } from '../../../middleware/auth';
import { updateOpportunityEngagement } from '../../../application/opportunity/engagement';
import { adminCache } from '../../../infrastructure/cache/adminCache';

const router = Router();

/**
 * POST /api/opportunities/share
 * Lightweight endpoint to share a link for background processing.
 */
router.post('/share', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { url } = req.body;
        const userId = req.userId as string;

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

        // 3. Synchronous DRAFT creation (Bypassing ingestion queue)
        let companyName = 'Unknown Company';
        try {
            const urlObj = new URL(normalizedUrl);
            companyName = urlObj.hostname.replace(/^www\./, '');
        } catch (e) {
            // ignore
        }

        const title = 'New Opportunity';
        const baseSlug = `${title.toLowerCase().replace(/\s+/g, '-')}-at-${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const uniqueSlug = `${baseSlug}-${rawOpportunity.id.slice(-6)}`;

        const opportunity = await prisma.opportunity.create({
            data: {
                slug: uniqueSlug,
                title,
                company: companyName,
                type: 'JOB',
                status: 'DRAFT',
                sourceLink: normalizedUrl,
                applyLink: normalizedUrl,
                postedByUserId: userId,
                sharesCount: 1,
            }
        });

        await prisma.rawOpportunity.update({
            where: { id: rawOpportunity.id },
            data: {
                status: 'DRAFT_CREATED',
                mappedOpportunityId: opportunity.id
            }
        });

        // Invalidate admin cache so the new draft appears immediately in the Admin Web Drafts tab
        adminCache.invalidateLists();

        res.status(202).json({
            success: true,
            message: 'Link shared successfully! It has been saved as a draft for review.',
            id: rawOpportunity.id
        });
    } catch (error) {
        next(error);
    }
});


export default router;
