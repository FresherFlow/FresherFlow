import prisma, { Prisma } from '../../infrastructure/database/prisma';
import { Opportunity, OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { generateSlug, generateCompanyLogoUrl } from '@fresherflow/utils';
import { OpportunityEvent } from '@fresherflow/domain';
import { logger } from '@fresherflow/logger';

/**
 * Use Case: Create Opportunity
 */
export async function createOpportunity(data: Partial<Opportunity>, adminId: string) {
    const tempId = crypto.randomUUID();
    const slug = generateSlug(data.title || '', data.company || '', tempId);

    const opportunity = await prisma.opportunity.create({
        data: {
            ...(data as unknown as Prisma.OpportunityUncheckedCreateInput),
            companyLogoUrl: generateCompanyLogoUrl(data.companyWebsite),
            id: tempId,
            slug,
            postedByUserId: adminId,
            status: OpportunityStatus.PUBLISHED, // Defaulting to published for now as per legacy
            type: data.type || OpportunityType.JOB,
            title: data.title || '',
            company: data.company || '',
            description: data.description || '',
        },
        include: {
            walkInDetails: true,
        },
    });

    // Emit Domain Event (Async/Bg via Queue logic soon)
    logger.info(`[Event] Emitting ${OpportunityEvent.CREATED}`, { id: tempId });
    // TODO: Wire with event bus/queue

    return opportunity;
}
