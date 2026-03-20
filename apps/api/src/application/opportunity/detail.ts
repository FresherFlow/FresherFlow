import prisma from '../../infrastructure/database/prisma';

/**
 * Use Case: Get Single Opportunity by ID or Slug
 */
export async function getBySlugOrId(slugOrId: string) {
    const bySlug = await prisma.opportunity.findUnique({
        where: { slug: slugOrId },
        include: {
            walkInDetails: true,
            user: {
                select: { fullName: true, email: true },
            },
        },
    });

    if (bySlug) return bySlug;

    return await prisma.opportunity.findUnique({
        where: { id: slugOrId },
        include: {
            walkInDetails: true,
            user: {
                select: { fullName: true, email: true },
            },
        },
    });
}
