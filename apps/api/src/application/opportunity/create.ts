import prisma, { Prisma, OpportunityStatus as DbOpportunityStatus, OpportunityType as DbOpportunityType } from '../../infrastructure/database/prisma';
import { Opportunity, OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { generateSlug, generateCompanyLogoUrl } from '@fresherflow/utils';
import { OpportunityEvent } from '@fresherflow/domain';
import { logger } from '@fresherflow/logger';

/**
 * Use Case: Create Opportunity
 */
export async function createOpportunity(data: Partial<Opportunity>, adminId: string) {
    const tempId = crypto.randomUUID();
    const isGovt = data.governmentJobDetails || (data.type === 'JOB' && (data as { isGovtMode?: boolean }).isGovtMode);
    const slug = generateSlug(
        data.title || '',
        data.company || '',
        tempId,
        {
            isGovt: !!isGovt,
            vacancyCount: data.governmentJobDetails?.vacancyCount
        }
    );

    const opportunity = await prisma.opportunity.create({
        data: {
            ...(data as unknown as Prisma.OpportunityUncheckedCreateInput),
            companyLogoUrl: generateCompanyLogoUrl(data.companyWebsite),
            id: tempId,
            slug,
            postedByUserId: adminId,
            status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus, // Defaulting to published for now as per legacy
            type: (data.type || OpportunityType.JOB) as unknown as DbOpportunityType,
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
