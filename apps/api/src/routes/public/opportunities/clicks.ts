import { Router, Request, Response, NextFunction } from 'express';
import { OpportunityStatus } from '@fresherflow/types';
import prisma from '../../../infrastructure/database/prisma';
import { AppError } from '../../../middleware/errorHandler';
import { updateOpportunityEngagement } from '../../../application/opportunity/engagement';
import {
    isSupportedDetailId
} from './_helpers';

const router: Router = Router();

/**
 * POST /api/opportunities/:id/click
 * Track an outbound click (e.g. "Apply" button) for an opportunity.
 */
router.post('/:id/click', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id || '');
        if (!id || !isSupportedDetailId(id)) throw new AppError('Opportunity id is invalid', 400);

        const opportunity = await prisma.opportunity.findFirst({
            where: {
                OR: [{ id }, { slug: id }],
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null
            },
            select: { id: true }
        });

        if (!opportunity) throw new AppError('Opportunity not found', 404);

        // Update Engagement Counters (Item 160 in plan)
        await updateOpportunityEngagement(opportunity.id, 'click');

        // Optional: Log to OpportunityClick table if detailed audit is needed
        if (req.userId) {
            await prisma.opportunityClick.create({
                data: {
                    opportunityId: opportunity.id,
                    userId: req.userId,
                    source: (req.headers['x-platform'] as string) || 'unknown'
                }
            }).catch(() => null); // Silently fail if unique constraint or other issue
        }

        return res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
