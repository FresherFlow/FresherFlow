import prisma from '../../infrastructure/database/prisma';
import { Prisma } from '@prisma/client';
import { OpportunityStatus } from '@fresherflow/types';
import { logger } from '@fresherflow/logger';
import { StorageService } from '../../infrastructure/services/storage.service';

export class FeedGeneratorService {
    private static readonly companySlugMap = new Map<string, string>();

    public static getCompanySlugMap(): Map<string, string> {
        return this.companySlugMap;
    }

    public static slugify(text: string): string {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
    }

    public static getCompanySlug(companyName: string): string {
        if (!companyName) return '';
        const key = companyName.toLowerCase().trim();
        return this.companySlugMap.get(key) || this.slugify(companyName);
    }

    public static async loadCompanySlugMap(): Promise<void> {
        const companiesContent = await StorageService.fetchFromR2('companies.json');
        this.companySlugMap.clear();
        if (companiesContent) {
            try {
                const companiesList = JSON.parse(companiesContent);
                for (const c of companiesList) {
                    if (c && c.name && c.slug) {
                        this.companySlugMap.set(c.name.toLowerCase().trim(), c.slug);
                    }
                }
            } catch (e) {
                logger.error('[FeedGeneratorService] Failed to parse companies.json', e);
            }
        }
    }

    public static async withDbRetry<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isConnError = 
                errorMsg.includes("Can't reach database server") ||
                errorMsg.includes("PrismaClientInitializationError") ||
                errorMsg.includes("connection limit") ||
                errorMsg.includes("ETIMEDOUT") ||
                errorMsg.includes("ECONNREFUSED") ||
                errorMsg.includes("NeonDbError") ||
                errorMsg.includes("suspended") ||
                errorMsg.includes("pooler");

            if (isConnError && retries > 0) {
                logger.warn(`[FeedGeneratorService] Database connection issue or cold-start detected. Retrying in ${delay}ms... (${retries} retries left)`, { error: errorMsg });
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.withDbRetry(operation, retries - 1, delay * 2);
            }
            throw error;
        }
    }

    public static getFeedSelectFields() {
        return {
            // Identity
            id: true,
            slug: true,
            type: true,
            status: true,

            // Display
            title: true,
            company: true,
            companyWebsite: true,
            companyLogoUrl: true,
            description: true,
            jobFunction: true,
            employmentType: true,
            notesHighlights: true,
            selectionProcess: true,
            tags: true,

            // Eligibility (mobile match scoring)
            allowedDegrees: true,
            allowedCourses: true,
            allowedSpecializations: true,
            allowedPassoutYears: true,
            requiredSkills: true,
            experienceMin: true,
            experienceMax: true,

            // Location
            locations: true,
            workMode: true,

            // Compensation
            salaryMin: true,
            salaryMax: true,
            salaryRange: true,
            salaryPeriod: true,
            stipend: true,
            incentives: true,

            // Application
            applyLink: true,
            sourceLink: true,
            applicationDetails: true,

            // Timestamps
            postedAt: true,
            publishedAt: true,
            expiresAt: true,
            updatedAt: true,

            // Engagement stats (public)
            trendingScore: true,
            sharesCount: true,
            savesCount: true,
            clicksCount: true,
            commentsCount: true,

            // Relations
            walkInDetails: true,
            governmentJobDetails: true,
            events: true,

            // Referrals and Contributors
            user: {
                select: {
                    username: true,
                    fullName: true,
                    role: true
                }
            },
            rawIngestions: {
                select: {
                    reasonFlags: true,
                    createdBy: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true
                        }
                    }
                }
            },
        };
    }

    public static mapFeedOpportunities(opportunities: Record<string, unknown>[]) {
        return opportunities.map((opp: Record<string, unknown>) => {
            let isReferral = false;
            let referredByUsername: string | undefined = undefined;

            if (opp.rawIngestions && Array.isArray(opp.rawIngestions) && opp.rawIngestions.length > 0) {
                const referralIngestion = opp.rawIngestions.find((ri: { reasonFlags?: string[] }) => ri.reasonFlags?.includes('USER_REFERRAL'));
                if (referralIngestion) {
                    isReferral = true;
                    referredByUsername = (referralIngestion as { createdBy?: { username?: string } }).createdBy?.username || undefined;
                }
            }

            if (!opp.rawIngestions || !Array.isArray(opp.rawIngestions) || opp.rawIngestions.length === 0) {
                return { ...opp, isReferral, referredByUsername };
            }

            return {
                ...opp,
                isReferral,
                referredByUsername,
                rawIngestions: opp.rawIngestions.map((ri: { createdBy?: unknown }) => ({
                    ...ri,
                    creator: ri.createdBy
                }))
            };
        });
    }

    public static async generateBootstrapFeed() {
        return this.withDbRetry(async () => {
            const opportunities = await prisma.opportunity.findMany({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                orderBy: { postedAt: 'desc' },
                select: this.getFeedSelectFields(),
            });

            const mappedOpportunities = this.mapFeedOpportunities(opportunities as unknown as Record<string, unknown>[]);
            return { opportunities: mappedOpportunities, timestamp: Date.now(), generatedAt: new Date().toISOString(), count: opportunities.length };
        });
    }

    public static async generateGovernmentFeed() {
        return this.withDbRetry(async () => {
            const opportunities = await prisma.opportunity.findMany({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    governmentJobDetails: { isNot: null },
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                orderBy: { postedAt: 'desc' },
                select: this.getFeedSelectFields(),
            });

            const mappedOpportunities = this.mapFeedOpportunities(opportunities as unknown as Record<string, unknown>[]);
            return { opportunities: mappedOpportunities, timestamp: Date.now(), generatedAt: new Date().toISOString(), count: opportunities.length };
        });
    }

    public static async generateExpiredFeed() {
        return this.withDbRetry(async () => {
            const opportunities = await prisma.opportunity.findMany({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    expiresAt: { 
                        lte: new Date(),
                        gt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: { postedAt: 'desc' },
                select: this.getFeedSelectFields(),
            });

            const mappedOpportunities = this.mapFeedOpportunities(opportunities as unknown as Record<string, unknown>[]);
            return { opportunities: mappedOpportunities, timestamp: Date.now(), generatedAt: new Date().toISOString(), count: opportunities.length };
        });
    }

    public static async generateCompanyShards() {
        return this.withDbRetry(async () => {
            const opportunities = await prisma.opportunity.findMany({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                orderBy: { postedAt: 'desc' },
                select: this.getFeedSelectFields(),
            });

            const mappedOpportunities = this.mapFeedOpportunities(opportunities as unknown as Record<string, unknown>[]);
            
            interface MappedFeedOpportunity {
                [key: string]: unknown;
                company?: string | null;
                isReferral: boolean;
                referredByUsername?: string;
            }
            const grouped = new Map<string, MappedFeedOpportunity[]>();
            for (const opp of mappedOpportunities as MappedFeedOpportunity[]) {
                if (!opp.company) continue;
                const key = opp.company.trim();
                const list = grouped.get(key) || [];
                list.push(opp);
                grouped.set(key, list);
            }

            if (this.companySlugMap.size === 0) {
                await this.loadCompanySlugMap();
            }

            const shards: Array<{ slug: string; data: Record<string, unknown> }> = [];
            for (const [company, jobs] of grouped.entries()) {
                const slug = this.getCompanySlug(company);
                shards.push({
                    slug,
                    data: {
                        company,
                        slug,
                        opportunities: jobs,
                        count: jobs.length,
                        timestamp: Date.now()
                    }
                });
            }
            return shards;
        });
    }

    public static async generateCategoryShards() {
        return this.withDbRetry(async () => {
            const categories = [
                { id: 'remote', where: { workMode: 'REMOTE' } },
                { id: 'internships', where: { type: 'INTERNSHIP' } },
                { id: 'walkins', where: { type: 'WALKIN' } },
                { id: 'freshers', where: { experienceMin: { lte: 0 } } },
                { id: '2026', where: { allowedPassoutYears: { has: 2026 } } },
                { id: 'trending', where: {}, orderBy: { trendingScore: 'desc' } },
            ];

            const shards: Array<{ id: string; data: Record<string, unknown> }> = [];
            for (const cat of categories) {
                const opportunities = await prisma.opportunity.findMany({
                    where: {
                        ...cat.where,
                        status: OpportunityStatus.PUBLISHED,
                        deletedAt: null
                    } as Prisma.OpportunityWhereInput,
                    orderBy: (cat as { orderBy?: Prisma.OpportunityOrderByWithRelationInput }).orderBy || { postedAt: 'desc' },
                    take: 100,
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        company: true,
                        companyLogoUrl: true,
                        locations: true,
                        type: true,
                        postedAt: true,
                        tags: true,
                        trendingScore: true,
                        allowedPassoutYears: true,
                        workMode: true
                    }
                });
                shards.push({ id: cat.id, data: { category: cat.id, opportunities, count: opportunities.length, timestamp: Date.now() } });
            }
            return shards;
        });
    }

    public static async generateSitemap() {
        return this.withDbRetry(async () => {
            const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
            const staticDate = new Date().toISOString().split('T')[0];

            const sitemaps = [
                'sitemap-jobs.xml',
                'sitemap-companies.xml',
                'sitemap-skills.xml',
                'sitemap-roles.xml',
                'sitemap-locations.xml',
                'sitemap-batches.xml'
            ];
            let indexXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            indexXml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
            sitemaps.forEach(s => {
                indexXml += `  <sitemap>\n    <loc>${baseUrl}/${s}</loc>\n    <lastmod>${staticDate}</lastmod>\n  </sitemap>\n`;
            });
            indexXml += '</sitemapindex>';
            return indexXml;
        });
    }

    public static async generateSitemapData() {
        return this.withDbRetry(async () => {
            const companies = await prisma.opportunity.findMany({
                where: { status: OpportunityStatus.PUBLISHED, deletedAt: null },
                distinct: ['company'],
                select: { company: true }
            });

            const opportunities = await prisma.opportunity.findMany({
                where: { status: OpportunityStatus.PUBLISHED, deletedAt: null },
                orderBy: { postedAt: 'desc' },
                take: 1000,
                select: {
                    id: true,
                    slug: true,
                    type: true,
                    postedAt: true,
                    updatedAt: true
                }
            });

            if (this.companySlugMap.size === 0) {
                await this.loadCompanySlugMap();
            }

            return {
                companies: companies.map(c => ({
                    name: c.company,
                    slug: this.getCompanySlug(c.company)
                })),
                opportunities: opportunities.map(opp => ({
                    id: opp.id,
                    slug: opp.slug,
                    type: opp.type,
                    postedAt: opp.postedAt,
                    updatedAt: opp.updatedAt
                })),
                timestamp: Date.now()
            };
        });
    }

    public static async generateLinksFeed() {
        return this.withDbRetry(async () => {
            const opportunities = await prisma.opportunity.findMany({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                orderBy: { postedAt: 'desc' },
                select: {
                    id: true,
                    slug: true,
                    title: true,
                    company: true,
                    type: true,
                    status: true,
                    locations: true,
                    expiresAt: true,
                    companyLogoUrl: true,
                    events: {
                        select: {
                            eventType: true,
                            eventDate: true
                        }
                    }
                }
            });
            return { opportunities, timestamp: Date.now(), count: opportunities.length };
        });
    }

    public static async generateStats() {
        return this.withDbRetry(async () => {
            const count = await prisma.opportunity.count({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
                },
            });
            return { opportunities: count, timestamp: Date.now() };
        });
    }

    public static async generateTakenUsernames(): Promise<string[]> {
        return this.withDbRetry(async () => {
            const users = await prisma.user.findMany({
                where: {
                    username: { not: null }
                },
                select: {
                    username: true
                }
            });
            return users.map(u => u.username).filter((u): u is string => u !== null);
        });
    }

    public static async generateResourcesFeed() {
        return this.withDbRetry(async () => {
            const collections = await prisma.resourceCollection.findMany({
                where: {
                    status: 'APPROVED'
                },
                include: {
                    items: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 500
            });

            const companyNames = Array.from(
                new Set(
                    collections
                        .map(c => c.company)
                        .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
                )
            );

            const companyMetadata: Record<string, { logoUrl: string | null; website: string | null }> = {};

            if (companyNames.length > 0) {
                const opportunities = await prisma.opportunity.findMany({
                    where: {
                        company: {
                            in: companyNames
                        },
                        status: 'PUBLISHED',
                        deletedAt: null
                    },
                    select: {
                        company: true,
                        companyLogoUrl: true,
                        companyWebsite: true
                    },
                    orderBy: {
                        postedAt: 'desc'
                    }
                });

                for (const name of companyNames) {
                    const match = opportunities.find(
                        o => o.company.toLowerCase() === name.toLowerCase() && o.companyLogoUrl
                    );
                    const fallback = opportunities.find(
                        o => o.company.toLowerCase() === name.toLowerCase()
                    );
                    companyMetadata[name] = {
                        logoUrl: match?.companyLogoUrl || fallback?.companyLogoUrl || null,
                        website: match?.companyWebsite || fallback?.companyWebsite || null
                    };
                }
            }

            return {
                metadata: {
                    version: '1.0',
                    updatedAt: Date.now()
                },
                resources: collections,
                companyMetadata
            };
        });
    }
}
