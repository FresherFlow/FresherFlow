import prisma from '../../infrastructure/database/prisma';
import { OpportunityStatus } from '@fresherflow/types';

/**
 * Use Case: Soft Delete Opportunity (lifecycle step: archive + soft-delete).
 *
 * - Sets ARCHIVED + deletedAt + deletionReason in one write so the public
 *   feed (deletedAt IS NULL) drops the row immediately.
 * - Idempotent guard: re-deleting an already-deleted row throws instead of
 *   refreshing deletedAt and erasing the original audit timestamp.
 * - Org-owned rows are deleted the same way; ownership checks live in the
 *   route (admin permission / org membership), not here.
 */
export async function deleteOpportunity(id: string, adminId: string, reason: string) {
    const existing = await prisma.opportunity.findUnique({
        where: { id },
    });

    if (!existing) throw new Error('Opportunity not found');
    if (existing.deletedAt) throw new Error('Opportunity already deleted');
    if (existing.postedByUserId !== adminId) throw new Error('Unauthorized');

    return await prisma.opportunity.update({
        where: { id },
        data: {
            status: OpportunityStatus.ARCHIVED,
            deletedAt: new Date(),
            deletionReason: reason,
        },
    });
}

/**
 * Archive without deleting: removes the row from the live feed (status
 * flip) but keeps it restorable without going through /restore.
 */
export async function archiveOpportunity(id: string) {
    const existing = await prisma.opportunity.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
    });
    if (!existing) throw new Error('Opportunity not found');

    return await prisma.opportunity.update({
        where: { id },
        data: { status: OpportunityStatus.ARCHIVED },
    });
}
