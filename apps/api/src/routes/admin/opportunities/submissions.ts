import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { RawOpportunityStatus } from '@fresherflow/types';

const router = Router();

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

export default router;
