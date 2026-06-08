import prisma, { Prisma } from '../../infrastructure/database/prisma';
import { Opportunity } from '@fresherflow/types';
import { generateSlug, generateCompanyLogoUrl } from '@fresherflow/utils';

/**
 * Use Case: Update Opportunity
 */
export async function updateOpportunity(id: string, data: Partial<Opportunity>, adminId: string) {
    const existing = await prisma.opportunity.findUnique({
        where: { id },
    });

    if (!existing) throw new Error('Opportunity not found');
    if (existing.postedByUserId !== adminId) throw new Error('Unauthorized');

    const updateData: Prisma.OpportunityUpdateInput = {
        ...(data as unknown as Prisma.OpportunityUpdateInput),
        lastVerified: new Date(),
    };

    // If data.status is provided, ensure it's correctly typed
    if (data.status !== undefined) {
        updateData.status = data.status as unknown as Prisma.EnumOpportunityStatusFieldUpdateOperationsInput;
    }

    if (data.companyLogoUrl !== undefined) {
        updateData.companyLogoUrl = data.companyLogoUrl || null;
    } else if (data.companyWebsite !== undefined) {
        updateData.companyLogoUrl = generateCompanyLogoUrl(data.companyWebsite);
    }

    if (data.title || data.company) {
        const newTitle = (data.title || existing.title) as string;
        const newCompany = (data.company || existing.company) as string;
        updateData.slug = generateSlug(newTitle, newCompany, existing.id as string);
    }

    // If data.type is provided, ensure it's correctly typed
    if (data.type !== undefined) {
        updateData.type = data.type as unknown as Prisma.EnumOpportunityTypeFieldUpdateOperationsInput;
    }

    return await prisma.opportunity.update({
        where: { id },
        data: updateData,
        include: {
            walkInDetails: true,
        },
    });
}
