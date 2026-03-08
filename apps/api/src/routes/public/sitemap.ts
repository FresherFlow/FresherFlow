import express, { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';

const router: Router = express.Router();
const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 2000;
const EXPIRED_GRACE_DAYS = 45;

router.get('/opportunities', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limitRaw = Number(req.query.limit || DEFAULT_LIMIT);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), MAX_LIMIT) : DEFAULT_LIMIT;
        const pageRaw = Number(req.query.page || 1);
        const page = Number.isFinite(pageRaw) ? Math.max(Math.floor(pageRaw), 1) : 1;
        const skip = (page - 1) * limit;
        const graceCutoff = new Date(Date.now() - EXPIRED_GRACE_DAYS * 24 * 60 * 60 * 1000);

        const where: any = {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: graceCutoff } },
            ],
        };

        const [total, items] = await Promise.all([
            prisma.opportunity.count({ where }),
            prisma.opportunity.findMany({
                where,
                select: {
                    id: true,
                    slug: true,
                    type: true,
                    postedAt: true,
                    expiresAt: true,
                },
                orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
                skip,
                take: limit,
            })
        ]);

        const output = items.map((item: any) => ({
            id: item.id,
            slug: item.slug,
            type: item.type as OpportunityType,
            postedAt: item.postedAt.toISOString(),
            expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
        }));

        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600');
        res.json({
            items: output,
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
