import prisma from '../../infrastructure/database/prisma';
import { OpportunityStatus, Opportunity } from '@fresherflow/types';
import { handleOpportunityPublished } from '../../infrastructure/services/publish.service';

/**
 * Use Case: Publish Opportunity (DRAFT → ACTIVE)
 */
export async function publishOpportunity(id: string, adminId: string) {
    const opportunity = await prisma.opportunity.findUnique({
        where: { id },
    });

    if (!opportunity) throw new Error('Opportunity not found');
    if (opportunity.postedByUserId !== adminId) throw new Error('Unauthorized');
    if (opportunity.status !== OpportunityStatus.DRAFT) {
        throw new Error('Can only publish draft opportunities');
    }

    const updated = await prisma.opportunity.update({
        where: { id },
        data: {
            status: OpportunityStatus.PUBLISHED,
            lastVerified: new Date(),
        },
    });

    // Dispatch side-effects (Decoupled from routes handlers)
    await handleOpportunityPublished(updated as unknown as Opportunity, { isNew: true });

    return updated;
}
