import { Router } from 'express';
import { prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';

const router = Router();

// GET all government jobs (publicly visible)
router.get('/', async (req, res, next) => {
    try {
        const jobs = await prisma.governmentJobDetails.findMany({
            where: {
                opportunity: {
                    status: 'PUBLISHED'
                }
            },
            include: {
                opportunity: {
                    select: { title: true, company: true, locations: true, slug: true }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        res.status(200).json(jobs);
    } catch (error) {
        logger.error('Error fetching public government jobs', { error });
        next(error);
    }
});

// GET single government job by jobId
router.get('/:jobId', async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const job = await prisma.governmentJobDetails.findUnique({
            where: { opportunityId: jobId },
            include: {
                opportunity: true // Include the base opportunity
            }
        });

        if (!job) {
             res.status(404).json({ error: 'Government job not found' });
             return;
        }

        res.status(200).json(job);
    } catch (error) {
        logger.error('Error fetching single government job', { error, jobId: req.params.jobId });
        next(error);
    }
});

export default router;
