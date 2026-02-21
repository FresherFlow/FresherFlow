import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CompanyService {
    /**
     * Get company profile and basic stats
     */
    static async getCompanyProfile(name: string) {
        // Find the most recent opportunity for this company to extract metadata
        const latestOpportunity = await prisma.opportunity.findFirst({
            where: {
                company: { equals: name, mode: 'insensitive' },
                status: 'PUBLISHED',
                deletedAt: null
            },
            orderBy: { postedAt: 'desc' }
        });

        if (!latestOpportunity) {
            return null;
        }

        const activeCount = await prisma.opportunity.count({
            where: {
                company: { equals: name, mode: 'insensitive' },
                status: 'PUBLISHED',
                deletedAt: null,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });

        return {
            name: latestOpportunity.company, // Use the name as stored in DB
            website: latestOpportunity.companyWebsite,
            logo: latestOpportunity.companyLogoUrl,
            stats: {
                activeJobs: activeCount
            }
        };
    }

    /**
     * Search/List unique companies (for directory or autocomplete)
     */
    static async listCompanies(query?: string) {
        // This is a bit expensive in Prisma without a dedicated Company model,
        // but for now we'll use groupBy.
        const companies = await prisma.opportunity.groupBy({
            by: ['company'],
            where: {
                status: 'PUBLISHED',
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

        return companies.map(c => ({
            name: c.company,
            jobCount: c._count.id
        }));
    }
}
