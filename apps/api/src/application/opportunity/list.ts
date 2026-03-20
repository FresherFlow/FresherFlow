import prisma, { Prisma } from '../../infrastructure/database/prisma';

/**
 * Use Case: Get All Opportunities for Admin
 */
export async function getAllForAdmin(adminId?: string) {
    const where: Prisma.OpportunityWhereInput = {};
    if (adminId) where.postedByUserId = adminId;

    return await prisma.opportunity.findMany({
        where,
        include: {
            walkInDetails: true,
            user: {
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                },
            },
        },
        orderBy: {
            postedAt: 'desc',
        },
    });
}
