import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { AppError } from '../../../middleware/errorHandler';
import { buildGuestOpportunitySelect } from './_helpers';

const router: Router = Router();

router.get('/:id/similar', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const original = await prisma.opportunity.findUnique({
            where: { id: id as string },
            select: { id: true, title: true, company: true, type: true, tags: true }
        });

        if (!original) throw new AppError('Original opportunity not found', 404);

        // Simple similarity logic: same type and either same company or title keywords
        const similar = await prisma.opportunity.findMany({
            where: {
                status: 'PUBLISHED',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                deletedAt: null as any,
                id: { not: id as string },
                AND: [
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    { type: (original as any).type },
                    {
                        OR: [
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            { company: { contains: (original as any).company || '', mode: 'insensitive' } },
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            { title: { contains: ((original as any).title || '').split(' ')[0], mode: 'insensitive' } },
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            { tags: { hasSome: (original as any).tags || [] } }
                        ]
                    }
                ]
            },
            take: 4,
            orderBy: [
                { trendingScore: 'desc' },
                { postedAt: 'desc' }
            ],
            select: buildGuestOpportunitySelect()
        });

        return res.json({ opportunities: similar });
    } catch (e) {
        next(e);
    }
});

export default router;
