import express, { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { OpportunityStatus } from '@fresherflow/types';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Lightweight health check for uptime monitoring
 * @access  Public
 */
router.get('/health', (req: Request, res: Response) => {
    // Return immediately without DB or Auth checks
    res.status(200).send('ok');
});

/**
 * @route   GET /api/stats
 * @desc    Public site stats (opportunity count) for landing page
 * @access  Public
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const count = await prisma.opportunity.count({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
            },
        });
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.json({ opportunities: count });
    } catch {
        res.json({ opportunities: 0 });
    }
});

export default router;
