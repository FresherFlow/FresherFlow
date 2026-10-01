import { Router } from 'express';
import { prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/utils';
import { createRateLimiter } from '../../middleware/rateLimit';
import { sendError, ErrorCode } from '../../middleware/errorHandler';

const router = Router();

// Public read path for the government board; the query is unbounded on the
// client side, so it needs a cap above the global limiter.
const publicGovtReadLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many requests. Please slow down.',
    keyPrefix: 'public-govt-read',
});

// GET all government jobs (publicly visible)
router.get('/', publicGovtReadLimiter, async (req, res, next) => {
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
router.get('/:jobId', publicGovtReadLimiter, async (req, res, next) => {
    try {
        // Express widens route params to `string | string[]` once extra
        // middleware is on the handler chain, so coerce before the lookup.
        const jobId = String(req.params.jobId ?? '');
        const job = await prisma.governmentJobDetails.findUnique({
            where: { opportunityId: jobId },
            include: {
                opportunity: true // Include the base opportunity
            }
        });

        if (!job) {
             return sendError(res, 404, ErrorCode.NOT_FOUND, 'Government job not found', req.requestId);
        }

        res.status(200).json(job);
    } catch (error) {
        logger.error('Error fetching single government job', { error, jobId: req.params.jobId });
        next(error);
    }
});

export default router;
