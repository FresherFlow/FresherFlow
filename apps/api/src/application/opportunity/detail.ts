import prisma from '../../infrastructure/database/prisma';

/**
 * Phase 5 detail includes — one place that defines the full opportunity
 * graph so public detail, admin detail, and search hydration never drift:
 * drive/event/government kind details, institution targeting, compensation
 * components, lifecycle events, org ownership, authorship, and
 * feedback/report counters.
 */
export const opportunityDetailInclude = {
    driveDetails: true,
    eventDetails: true,
    governmentJobDetails: true,
    institutions: { include: { institution: true } },
    compensations: true,
    events: { orderBy: { eventDate: 'asc' as const } },
    organization: { select: { id: true, name: true, slug: true } },
    user: { select: { fullName: true, email: true } },
    _count: { select: { feedback: true, reports: true, savedBy: true, actions: true } },
} as const;

/**
 * Use Case: Get Single Opportunity by ID or Slug
 */
export async function getBySlugOrId(slugOrId: string) {
    const bySlug = await prisma.opportunity.findFirst({
        where: { slug: slugOrId, deletedAt: null },
        include: { ...opportunityDetailInclude },
    });

    if (bySlug) return bySlug;

    return await prisma.opportunity.findFirst({
        where: { id: slugOrId, deletedAt: null },
        include: { ...opportunityDetailInclude },
    });
}
