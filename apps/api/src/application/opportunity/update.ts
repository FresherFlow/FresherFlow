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

    if (data.companyWebsite !== undefined) {
        updateData.companyLogoUrl = generateCompanyLogoUrl(data.companyWebsite);
    }

    if (data.title || data.company) {
        const newTitle = data.title || existing.title;
        const newCompany = data.company || existing.company;
        updateData.slug = generateSlug(newTitle, newCompany, existing.id);
    }

    return await prisma.opportunity.update({
        where: { id },
        data: updateData,
        include: {
            walkInDetails: true,
        },
    });
}
