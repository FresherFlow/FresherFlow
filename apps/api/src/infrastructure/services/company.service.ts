import prisma from '../database/prisma';
import { OpportunityStatus } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils';

export class CompanyService {
    /**
     * Get company profile by slug using Opportunity metadata
     */
    static async getCompanyBySlug(slug: string) {
        const opportunities = await prisma.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null
            },
            select: {
                company: true,
                companyWebsite: true,
                companyLogoUrl: true,
                expiresAt: true,
                postedAt: true
            },
            take: 200
        });

        const matchingOpp = opportunities.find((o) => slugify(o.company) === slug);
        if (!matchingOpp) return null;

        const companyName = matchingOpp.company;
        const activeJobsCount = opportunities.filter((o) => 
            o.company.toLowerCase() === companyName.toLowerCase() &&
            (!o.expiresAt || new Date(o.expiresAt) > new Date())
        ).length;

        return {
            name: companyName,
            slug,
            website: matchingOpp.companyWebsite,
            logo: matchingOpp.companyLogoUrl,
            stats: {
                activeJobs: activeJobsCount,
                totalJobs: opportunities.filter((o) => o.company.toLowerCase() === companyName.toLowerCase()).length,
                freshersScore: 85
            }
        };
    }

    /**
     * Get company profile and basic stats by name
     */
    static async getCompanyProfile(name: string) {
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

        const latestOpportunity = await prisma.opportunity.findFirst({
            where: {
                company: { equals: name, mode: 'insensitive' },
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null
            },
            orderBy: { postedAt: 'desc' }
        });

        if (!latestOpportunity) {
            return null;
        }

        return {
            name: latestOpportunity.company,
            website: latestOpportunity.companyWebsite,
            logo: latestOpportunity.companyLogoUrl,
            stats: {
                activeJobs: activeCount
            }
        };
    }

    /**
     * Search/List unique companies
     */
    static async listCompanies(query?: string) {
        const companies = await prisma.opportunity.groupBy({
            by: ['company'],
            where: {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                ...(query ? { company: { contains: query, mode: 'insensitive' } } : {})
            },
            _count: {
                id: true
            },
            orderBy: {
                company: 'asc'
            },
            take: 50
        });

        return companies.map((c) => ({
            name: c.company,
            slug: slugify(c.company),
            jobCount: c._count.id
        }));
    }
}
