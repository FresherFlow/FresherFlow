import prisma from '../../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { requireAdmin } from '../../middleware/auth';

const router: Router = express.Router();


// GET /api/admin/app-feedback - App-level feedback
router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const feedback = await prisma.appFeedback.findMany({
            include: {
                user: {
                    select: {
                        fullName: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ feedback });
    } catch (error) {
        next(error);
    }
});

export default router;
