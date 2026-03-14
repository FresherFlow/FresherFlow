import { Router, Request, Response, NextFunction } from 'express';
import { OpportunityStatus } from '@fresherflow/types';
import prisma from '../../../lib/prisma';
import { AppError } from '../../../middleware/errorHandler';
import {
    isLikelyBotTraffic, publicDetailLimiter, publicDetailBotLimiter,
    isSupportedDetailId
} from './_helpers';

const router: Router = Router();

function adaptiveDetailLimiter(req: Request, res: Response, next: NextFunction) {
    if (isLikelyBotTraffic(req)) return publicDetailBotLimiter(req, res, next);
    return publicDetailLimiter(req, res, next);
}

router.get('/:id/events', adaptiveDetailLimiter, async (req: Request, res: Response, next: NextFunction) => {
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

        const events = await prisma.opportunityEvent.findMany({
            where: { opportunityId: opportunity.id },
            orderBy: { eventDate: 'asc' }
        });

        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        res.setHeader('Vary', 'Cookie, Authorization');
        return res.json({ events });
    } catch (error) {
        next(error);
    }
});

export default router;
