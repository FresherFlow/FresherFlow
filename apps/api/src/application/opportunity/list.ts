import prisma, { Prisma } from '../../infrastructure/database/prisma';
import { opportunityDetailInclude } from './detail';

export interface AdminListOptions {
    take?: number;
    skip?: number;
    orderBy?: Prisma.OpportunityOrderByWithRelationInput | Prisma.OpportunityOrderByWithRelationInput[];
}

/**
 * Use Case: Get All Opportunities for Admin.
 *
 * Paginated (Phase 6): unbounded `findMany` on this table is a free-tier
 * memory risk, so callers pass take/skip and the route derives page metadata.
 */
export async function getAllForAdmin(adminId?: string, options: AdminListOptions = {}) {
    const where: Prisma.OpportunityWhereInput = {};
    if (adminId) where.postedByUserId = adminId;

    const { take = 50, skip = 0, orderBy = { postedAt: 'desc' as const } } = options;

    return await prisma.opportunity.findMany({
        where,
        include: { ...opportunityDetailInclude },
        orderBy,
        take: Math.min(Math.max(take, 1), 200),
        skip: Math.max(skip, 0),
    });
}
