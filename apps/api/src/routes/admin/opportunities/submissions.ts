import { Router, Request, Response, NextFunction } from 'express';
import prisma, { RawOpportunityStatus as DbRawStatus, OpportunityStatus as DbOpportunityStatus, OpportunityType as DbOpportunityType } from '../../../infrastructure/database/prisma';
import { RawOpportunityStatus, OpportunityStatus, OpportunityType, Opportunity } from '@fresherflow/types';
import { generateSlug } from '@fresherflow/utils';
import { handleOpportunityPublished } from '../../../infrastructure/services/publish.service';
import { adminCache } from '../../../infrastructure/cache/adminCache';
import crypto from 'node:crypto';

const router = Router();

/**
 * POST /api/admin/opportunities/submissions/bulk
 * Bulk approve/publish or reject/archive submissions.
 */
router.post('/bulk', async (req: Request & { adminId?: string }, res: Response, next: NextFunction) => {
    try {
        const { ids, action } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'IDs array is required' });
        }
        if (!action || (action !== 'PUBLISH' && action !== 'ARCHIVE')) {
            return res.status(400).json({ message: 'Valid action (PUBLISH or ARCHIVE) is required' });
        }

        const now = new Date();
        let updatedCount = 0;

        if (action === 'ARCHIVE') {
            const result = await prisma.rawOpportunity.updateMany({
                where: { id: { in: ids }, status: RawOpportunityStatus.FETCHED as unknown as DbRawStatus },
                data: { status: RawOpportunityStatus.REJECTED as unknown as DbRawStatus }
            });
            updatedCount = result.count;
        } else if (action === 'PUBLISH') {
            const rawOpps = await prisma.rawOpportunity.findMany({
                where: { id: { in: ids }, status: RawOpportunityStatus.FETCHED as unknown as DbRawStatus }
            });

            for (const rawOpp of rawOpps) {
                const tempId = crypto.randomUUID();
                const slug = generateSlug(rawOpp.title || 'Untitled', rawOpp.company || 'Unknown', tempId);
                const resolvedType = rawOpp.suggestedType || OpportunityType.JOB;

                // Create the published opportunity
                const opportunity = await prisma.opportunity.create({
                    data: {
                        id: tempId,
                        slug,
                        type: resolvedType as unknown as DbOpportunityType,
                        title: rawOpp.title || 'Untitled Opportunity',
                        company: rawOpp.company || 'Unknown Company',
                        sourceLink: rawOpp.sourceLink,
                        applyLink: rawOpp.applyLink || rawOpp.sourceLink,
                        status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus,
                        postedByUserId: rawOpp.createdByUserId || req.adminId || 'system',
                        publishedAt: now,
                    }
                });

                // Update raw opportunity status to DRAFT_CREATED and link it
                await prisma.rawOpportunity.update({
                    where: { id: rawOpp.id },
                    data: {
                        status: RawOpportunityStatus.DRAFT_CREATED as unknown as DbRawStatus,
                        mappedOpportunityId: opportunity.id
                    }
                });

                // Invoke publish hooks
                await handleOpportunityPublished(opportunity as unknown as Opportunity, { isNew: true });
                updatedCount++;
            }
            // Clear lists cache
            adminCache.invalidateLists();
        }

        res.json({ success: true, updatedCount });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/opportunities/submissions
 * List pending user submissions (RawOpportunity with status FETCHED).
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const submissions = await prisma.rawOpportunity.findMany({
            where: {
                status: RawOpportunityStatus.FETCHED
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({ submissions });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/opportunities/submissions/:id/reject
 * Reject a submission.
 */
router.post('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        
        await prisma.rawOpportunity.update({
            where: { id },
            data: {
                status: RawOpportunityStatus.REJECTED
            }
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/opportunities/submissions/:id/link
 * Link a submission (RawOpportunity) to a published opportunity.
 */
router.post('/:id/link', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { opportunityId } = req.body;

        if (!opportunityId) {
            return res.status(400).json({ message: 'opportunityId is required' });
        }

        const raw = await prisma.rawOpportunity.findUnique({ where: { id } });
        if (!raw) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
        if (!opp) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        const updated = await prisma.rawOpportunity.update({
            where: { id },
            data: {
                status: RawOpportunityStatus.DRAFT_CREATED,
                mappedOpportunityId: opportunityId
            }
        });

        res.json({ success: true, submission: updated });
    } catch (error) {
        next(error);
    }
});

export default router;
