import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { areOpportunityUrlsEquivalent, getOpportunityUrlAliases, normalizeOpportunityUrl } from '@fresherflow/utils';
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
        const { url, title: bodyTitle, company: bodyCompany } = req.body;
        const userId = req.userId as string;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'URL is required' });
        }

        const normalizedUrl = normalizeOpportunityUrl(url);
        const normalizedAliases = getOpportunityUrlAliases(normalizedUrl);

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
        const existingCandidates = await prisma.opportunity.findMany({
            where: {
                OR: [
                    { sourceLink: { in: normalizedAliases } },
                    { applyLink: { in: normalizedAliases } }
                ],
                deletedAt: null
            },
            take: 25,
        });
        const existing = existingCandidates.find(candidate =>
            (candidate.sourceLink && areOpportunityUrlsEquivalent(candidate.sourceLink, normalizedUrl)) ||
            (candidate.applyLink && areOpportunityUrlsEquivalent(candidate.applyLink, normalizedUrl))
        );

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
        const existingRawCandidates = await prisma.rawOpportunity.findMany({
            where: {
                sourceLink: { in: normalizedAliases },
                status: { in: ['FETCHED', 'DRAFT_CREATED'] }
            },
            take: 25,
        });
        const existingRaw = existingRawCandidates.find(candidate =>
            candidate.sourceLink && areOpportunityUrlsEquivalent(candidate.sourceLink, normalizedUrl)
        );

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
                    source: 'mobile_share',
                    parsedTitle: bodyTitle,
                    parsedCompany: bodyCompany
                }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
        });

        // 3. Synchronous DRAFT creation (Bypassing ingestion queue)
        let companyName = bodyCompany || 'Unknown Company';
        if (!bodyCompany) {
            try {
                const urlObj = new URL(normalizedUrl);
                companyName = urlObj.hostname.replace(/^www\./, '');
            } catch {
                // ignore
            }
        }

        const title = bodyTitle || 'New Opportunity';
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
