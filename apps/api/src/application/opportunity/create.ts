import prisma, { Prisma, OpportunityStatus as DbOpportunityStatus, OpportunityCategory as DbOpportunityCategory, EmploymentType as DbEmploymentType } from '../../infrastructure/database/prisma';
import { Opportunity, OpportunityStatus, OpportunityCategory } from '@fresherflow/types';
import { generateSlug, generateCompanyLogoUrl } from '@fresherflow/utils';
import { OpportunityEvent } from '@fresherflow/utils';
import { logger } from '@fresherflow/utils';

/**
 * Use Case: Create Opportunity
 */
export async function createOpportunity(data: Partial<Opportunity>, adminId: string) {
    const tempId = crypto.randomUUID();
    const isGovt = data.governmentJobDetails || data.sector === 'GOVERNMENT';
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
            companyLogoUrl: data.companyLogoUrl || generateCompanyLogoUrl(data.companyWebsite),
            id: tempId,
            slug,
            postedByUserId: adminId,
            status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus, // Defaulting to published for now as per legacy
            category: (data.category || OpportunityCategory.EMPLOYMENT) as unknown as DbOpportunityCategory,
            sector: data.sector || 'PRIVATE',
            recruitmentMethod: data.recruitmentMethod,
            workMode: data.workMode,
            experienceLevel: data.experienceLevel,
            employmentTypes: data.employmentTypes?.length ? data.employmentTypes as unknown as DbEmploymentType[] : undefined,
            title: data.title || '',
            company: data.company || '',
            description: data.description || '',
        },
        include: {
            driveDetails: true,
        },
    });

    // Emit Domain Event (Async/Bg via Queue logic soon)
    logger.info(`[Event] Emitting ${OpportunityEvent.CREATED}`, { id: tempId });
    // TODO: Wire with event bus/queue

    return opportunity;
}
