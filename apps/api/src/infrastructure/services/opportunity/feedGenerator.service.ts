import prisma from '../../database/prisma';
import { Prisma } from '@prisma/client';
import { OpportunityStatus, RecruitmentMethod, Sector, EmploymentType } from '@fresherflow/types';
import { logger } from '@fresherflow/utils';
import { StorageService } from '../platform/storage.service';

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
            category: true,
            recruitmentMethod: true,
            // Needed by every government predicate. Without it the CDN snapshot
            // had no way to tell a govt listing from a private one, so
            // sitemap-govt.xml and the /govt/ URL prefix could not be built.
            sector: true,
            status: true,

            // Display
            title: true,
            company: true,
            companyWebsite: true,
            companyLogoUrl: true,
            companyStage: true,
            companySize: true,
            companyIndustry: true,
            companyTopics: true,
            // `companyId` used to be selected here but the column does not
            // exist on Opportunity - the company is a plain string, and the
            // relation is `organizationId`. The stale select made Prisma
            // reject the whole query, so every feed route that used this
            // select returned 500.
            description: true,
            jobFunction: true,
            employmentTypes: true,
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
            driveDetails: true,
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
                    OR: [
                        { sector: Sector.GOVERNMENT },
                        { governmentJobDetails: { isNot: null } }
                    ],
                    AND: [
                        {
                            OR: [
                                { expiresAt: null },
                                { expiresAt: { gt: new Date() } }
                            ]
                        }
                    ]
                },
                orderBy: { postedAt: 'desc' },
                select: this.getFeedSelectFields(),
            });

            const mappedOpportunities = this.mapFeedOpportunities(opportunities as unknown as Record<string, unknown>[]);
            return { opportunities: mappedOpportunities, timestamp: Date.now(), generatedAt: new Date().toISOString(), count: opportunities.length };
        });
    }

    public static async generateWalkinFeed() {
        return this.withDbRetry(async () => {
            const opportunities = await prisma.opportunity.findMany({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    OR: [
                        { recruitmentMethod: RecruitmentMethod.WALK_IN },
                        { driveDetails: { isNot: null } }
                    ],
                    AND: [
                        {
                            OR: [
                                { expiresAt: null },
                                { expiresAt: { gt: new Date() } }
                            ]
                        },
                        // Same rule as the feed index: a drive with
                        // DriveDetails must still have a future date. `null`
                        // alone is not enough to pass, because a drive whose
                        // last date has passed also has `nextDriveAt = null` -
                        // that is the case this rule exists to catch. Only a
                        // listing with no DriveDetails at all passes.
                        {
                            OR: [
                                { nextDriveAt: { gte: new Date() } },
                                { AND: [{ nextDriveAt: null }, { driveDetails: null }] }
                            ]
                        }
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

    /**
     * Lightweight feed-index fields — card-rendering only (~700 bytes/job).
     * Shared with StaticFeedService so the CDN snapshot and the FEED_SOURCE=db
     * route project identical fields and cannot drift.
     */
    public static readonly FEED_INDEX_FIELDS: readonly string[] = [
        'id', 'slug', 'type', 'status', 'title', 'company', 'companyWebsite', 'companyLogoUrl',
        'companyStage', 'companySize', 'companyIndustry', 'companyTopics',
        'locations', 'workMode', 'salaryMin', 'salaryMax', 'salaryRange', 'salaryPeriod',
        'stipend', 'incentives', 'employmentTypes', 'jobFunction',
        'requiredSkills', 'tags',
        'allowedDegrees', 'allowedCourses', 'allowedSpecializations',
        'allowedPassoutYears', 'passoutYearMin', 'passoutYearMax',
        'experienceMin', 'experienceMax',
        'postedAt', 'publishedAt', 'expiresAt', 'updatedAt',
        'applyLink', 'sourceLink',
        'driveDetails', 'governmentJobDetails',
        'isReferral', 'referredByUsername'
    ];

    public static projectFeedIndex(opportunities: Record<string, unknown>[]): Record<string, unknown>[] {
        return opportunities.map((opp) => {
            const light: Record<string, unknown> = {};
            for (const key of this.FEED_INDEX_FIELDS) {
                const val = opp[key];
                if (val !== undefined && val !== null) {
                    if (Array.isArray(val) && val.length === 0) continue;
                    light[key] = val;
                }
            }
            return light;
        });
    }

    public static async generateFeedIndex() {
        return this.withDbRetry(async () => {
            const opportunities = await prisma.opportunity.findMany({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ],
                    // A drive is only worth listing while it still has a date
                    // to attend. `nextDriveAt` is null both for listings with
                    // no DriveDetails and for drives whose last date has
                    // passed, so `null` on its own cannot mean "no drive" -
                    // that is exactly the row being filtered out here. A row
                    // without DriveDetails is the only safe pass.
                    AND: [
                        {
                            OR: [
                                { nextDriveAt: { gte: new Date() } },
                                { AND: [{ nextDriveAt: null }, { driveDetails: null }] }
                            ]
                        }
                    ]
                },
                orderBy: { postedAt: 'desc' },
                select: this.getFeedSelectFields(),
            });

            const mapped = this.mapFeedOpportunities(opportunities as unknown as Record<string, unknown>[]);
            const indexOpps = this.projectFeedIndex(mapped);
            return { opportunities: indexOpps, timestamp: Date.now(), generatedAt: new Date().toISOString(), count: indexOpps.length };
        });
    }

    /**
     * A single opportunity JSON, matching the CDN's jobs/{id}.json shard.
     * Accepts a uuid or a slug. Published-but-expired rows are included so a
     * recently expired detail page still resolves, exactly like the CDN shard.
     */
    public static async generateOpportunityDetail(idOrSlug: string) {
        return this.withDbRetry(async () => {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
            const opportunity = await prisma.opportunity.findFirst({
                where: {
                    ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }),
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                },
                select: this.getFeedSelectFields(),
            });

            if (!opportunity) return null;
            return this.mapFeedOpportunities([opportunity as unknown as Record<string, unknown>])[0] ?? null;
        });
    }

    /**
     * companies.json — the company directory the web filters read.
     * Derived from live opportunities so db mode needs no CDN artifact.
     * Shape: [{ name, url, logo_url, slug }] (matches CompanyMetadata in web).
     */
    public static async generateCompaniesMetadata() {
        return this.withDbRetry(async () => {
            const rows = await prisma.opportunity.findMany({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                select: { company: true, companyWebsite: true, companyLogoUrl: true },
            });

            const byName = new Map<string, { name: string; url: string | null; logo_url: string | null; slug: string }>();
            for (const row of rows) {
                const name = row.company?.trim();
                if (!name) continue;
                const key = name.toLowerCase();
                const existing = byName.get(key);
                if (existing) {
                    if (!existing.url && row.companyWebsite) existing.url = row.companyWebsite.trim();
                    if (!existing.logo_url && row.companyLogoUrl) existing.logo_url = row.companyLogoUrl.trim();
                } else {
                    byName.set(key, {
                        name,
                        url: row.companyWebsite?.trim() ?? null,
                        logo_url: row.companyLogoUrl?.trim() ?? null,
                        slug: this.getCompanySlug(name),
                    });
                }
            }

            return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
        });
    }

    /**
     * skills.json — distinct skills across live opportunities (admin uses it).
     */
    public static async generateSkillsMetadata() {
        return this.withDbRetry(async () => {
            const rows = await prisma.opportunity.findMany({
                where: {
                    status: OpportunityStatus.PUBLISHED,
                    deletedAt: null,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                select: { requiredSkills: true },
            });

            const byKey = new Map<string, string>();
            for (const row of rows) {
                for (const raw of row.requiredSkills ?? []) {
                    const skill = raw?.trim();
                    if (!skill) continue;
                    const key = skill.toLowerCase();
                    if (!byKey.has(key)) byKey.set(key, skill);
                }
            }

            return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
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
                        category: true,
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
                'sitemap-walkins.xml',
                'sitemap-govt.xml',
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

            // Paginate rather than `take: 1000`. A hard cap silently dropped every
            // listing older than the newest 1000 from the sitemap, so those pages
            // were never submitted to search engines and drifted out of the index.
            // Sitemaps are capped at 50,000 URLs per file upstream, so batching on
            // the stable (postedAt, id) ordering keeps this correct and resumable.
            const SITEMAP_PAGE_SIZE = 1000;
            const sitemapOpportunities: Array<{
                id: string;
                slug: string | null;
                category: unknown;
                postedAt: Date | null;
                updatedAt: Date;
            }> = [];
            let cursor: { id: string; postedAt: Date | null } | undefined;
            const seenIds = new Set<string>();

            // Hard stop so a bug in the loop cannot spin forever.
            for (let page = 0; page < 50; page++) {
                const batch = await prisma.opportunity.findMany({
                    where: { status: OpportunityStatus.PUBLISHED, deletedAt: null },
                    orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
                    take: SITEMAP_PAGE_SIZE,
                    ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
                    select: {
                        id: true,
                        slug: true,
                        category: true,
                        postedAt: true,
                        updatedAt: true
                    }
                });

                if (batch.length === 0) break;

                for (const row of batch) {
                    if (seenIds.has(row.id)) continue;
                    seenIds.add(row.id);
                    sitemapOpportunities.push(row);
                }

                if (batch.length < SITEMAP_PAGE_SIZE) break;
                cursor = { id: batch[batch.length - 1].id, postedAt: batch[batch.length - 1].postedAt };
            }

            const opportunities = sitemapOpportunities;

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
                    category: opp.category,
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
                    category: true,
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

    /**
     * Feed counts manifest. `opportunities` is the live total (consumed by the
     * landing stats); the breakdown powers the sidebar nav badges. Each filter
     * mirrors the matching feed generator so the number equals what that link shows.
     */
    public static readonly GOVT_CATEGORY_LABELS = [
        'UPSC', 'SSC', 'Banking', 'Railways', 'State PSC',
        'Defence', 'Teaching', 'Police', 'Engineering', 'Nursing',
    ] as const;

    public static async generateStats() {
        return this.withDbRetry(async () => {
            const isLive: Prisma.OpportunityWhereInput = {
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            };
            const withFilter = (extra: Prisma.OpportunityWhereInput): Prisma.OpportunityWhereInput => ({
                AND: [isLive, extra],
            });

            const [opportunities, internships, remote, walkins, government, companyRows] = await Promise.all([
                prisma.opportunity.count({ where: isLive }),
                prisma.opportunity.count({ where: withFilter({ employmentTypes: { has: EmploymentType.INTERNSHIP } }) }),
                prisma.opportunity.count({ where: withFilter({ workMode: 'REMOTE' } as Prisma.OpportunityWhereInput) }),
                prisma.opportunity.count({ where: withFilter({ OR: [{ recruitmentMethod: RecruitmentMethod.WALK_IN }, { driveDetails: { isNot: null } }] }) }),
                prisma.opportunity.count({ where: withFilter({ OR: [{ sector: Sector.GOVERNMENT }, { governmentJobDetails: { isNot: null } }] }) }),
                prisma.opportunity.findMany({ where: isLive, distinct: ['company'], select: { company: true } }),
            ]);

            const companies = companyRows.filter((row) => row.company && row.company.trim() !== '').length;

            // Government sub-categories. Labels are identical to the
            // GOVT_CATEGORIES labels the sidebar links use, so the count and the
            // link it decorates can never disagree on naming.
            const govtCategoryCounts = Object.fromEntries(
                await Promise.all(
                    FeedGeneratorService.GOVT_CATEGORY_LABELS.map(async (label) => [
                        label,
                        await prisma.opportunity.count({
                            where: withFilter({ governmentJobDetails: { govtCategory: label } }),
                        }),
                    ] as const)
                )
            );

            return { opportunities, internships, remote, walkins, government, companies, govtCategories: govtCategoryCounts, timestamp: Date.now() };
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
                new Set<string>(
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
