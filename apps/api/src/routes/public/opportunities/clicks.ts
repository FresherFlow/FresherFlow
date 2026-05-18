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

        // Use Buffered Event Service
        const { eventService } = await import('../../../infrastructure/services/event.service');
        await eventService.track({
            type: 'CLICK_APPLY',
            opportunityId: opportunity.id,
            userId: req.userId || undefined,
            source: (req.headers['x-platform'] as string) || 'unknown'
        });

        return res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
