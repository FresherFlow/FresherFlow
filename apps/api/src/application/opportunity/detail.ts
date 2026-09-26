import prisma from '../../infrastructure/database/prisma';

/**
 * Use Case: Get Single Opportunity by ID or Slug
 */
export async function getBySlugOrId(slugOrId: string) {
    const bySlug = await prisma.opportunity.findFirst({
        where: { slug: slugOrId, deletedAt: null },
        include: {
            driveDetails: true,
            user: {
                select: { fullName: true, email: true },
            },
        },
    });

    if (bySlug) return bySlug;

    return await prisma.opportunity.findFirst({
        where: { id: slugOrId, deletedAt: null },
        include: {
            driveDetails: true,
            user: {
                select: { fullName: true, email: true },
            },
        },
    });
}
