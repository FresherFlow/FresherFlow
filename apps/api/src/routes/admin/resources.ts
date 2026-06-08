import { Prisma } from '@prisma/client';
import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import prisma from '../../infrastructure/database/prisma';
import { ResourceItemStatus } from '@fresherflow/types';

const router = Router();

// GET /api/admin/resources - Get paginated resources
router.get('/', 
    [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('status').optional().isIn(['PENDING_REVIEW', 'APPROVED']),
        query('search').optional().isString().trim(),
    ],
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;
            
            const status = req.query.status as ResourceItemStatus | undefined;
            const search = req.query.search as string | undefined;

            const where: Prisma.SharedResourceWhereInput = {};
            if (status) {
                where.status = status;
            }
            if (search) {
                where.title = { contains: search, mode: 'insensitive' };
            }

            const [resources, total] = await Promise.all([
                prisma.sharedResource.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.sharedResource.count({ where })
            ]);

            res.json({
                resources,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// PATCH /api/admin/resources/:id - Update resource
const updateResourceValidation = [
    body('title').optional().isString().trim(),
    body('company').optional({ nullable: true }).isString().trim(),
    body('skills').optional().isArray(),
    body('skills.*').isString().trim(),
    body('status').optional().isIn(['PENDING_REVIEW', 'APPROVED']),
];

router.patch('/:id', 
    updateResourceValidation,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }

            const id = req.params.id as string;
            const updateData = req.body;

            const existing = await prisma.sharedResource.findUnique({
                where: { id }
            });

            if (!existing) {
                res.status(404).json({ error: 'Resource not found' });
                return;
            }

            const resource = await prisma.sharedResource.update({
                where: { id },
                data: updateData,
            });

            res.json({ resource });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/admin/resources/:id - Delete resource
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.sharedResource.findUnique({
            where: { id }
        });

        if (!existing) {
            res.status(404).json({ error: 'Resource not found' });
            return;
        }

        await prisma.sharedResource.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
