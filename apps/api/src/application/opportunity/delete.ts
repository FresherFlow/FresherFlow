import prisma from '../../infrastructure/database/prisma';
import { OpportunityStatus } from '@fresherflow/types';

/**
 * Use Case: Soft Delete Opportunity
 */
export async function deleteOpportunity(id: string, adminId: string, reason: string) {
    const existing = await prisma.opportunity.findUnique({
        where: { id },
    });

    if (!existing) throw new Error('Opportunity not found');
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
