import prisma from '../../infrastructure/database/prisma';
import { OpportunityStatus } from '@fresherflow/types';

/**
 * Use Case: Get company profile and basic stats
 */
export async function getCompanyProfile(name: string) {
    // Find the most recent opportunity for this company to extract metadata
    const latestOpportunity = await prisma.opportunity.findFirst({
        where: {
            company: { equals: name, mode: 'insensitive' },
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null
        },
        orderBy: { postedAt: 'desc' }
    });

    if (!latestOpportunity) return null;

    const activeCount = await prisma.opportunity.count({
        where: {
            company: { equals: name, mode: 'insensitive' },
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ]
        }
    });

    return {
        name: latestOpportunity.company,
        website: latestOpportunity.companyWebsite,
        logo: latestOpportunity.companyLogoUrl,
        stats: { activeJobs: activeCount }
    };
}

/**
 * Use Case: Search/List unique companies
 */
export async function listCompanies(query?: string) {
    const companies = await prisma.opportunity.groupBy({
        by: ['company'],
        where: {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            ...(query ? { company: { contains: query, mode: 'insensitive' } } : {})
        },
        _count: { id: true },
        orderBy: { company: 'asc' },
        take: 50
    });

    return companies.map((c) => ({
        name: c.company,
        jobCount: c._count.id
    }));
}
