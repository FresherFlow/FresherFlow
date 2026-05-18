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
