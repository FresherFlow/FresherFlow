import fs from 'fs';
import path from 'path';
import prisma from '../database/prisma';
import { Prisma } from '@prisma/client';
import { OpportunityStatus } from '@fresherflow/types';
import { logger } from '@fresherflow/logger';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Service to generate "Distributed Static Data Shards" for discovery.
 * Decoupled from live API for high performance and low infrastructure cost.
 *
 * DEBOUNCE: scheduleRefresh() collapses rapid admin actions (bulk publish,
 * delete, expire) into a single DB query + R2 upload, saving Neon compute hours.
 * Tune via FEED_REFRESH_DEBOUNCE_MS env var (default: 5000ms).
 */
export class StaticFeedService {
    private static refreshTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Schedules a debounced feed refresh.
     * Multiple calls within the debounce window collapse into one refresh.
     * Use this from all admin action routes (publish/delete/expire/reject/spam/bulk).
     * Direct refresh() is reserved for cron/manual triggers.
     */
    static scheduleRefresh() {
        const debounceMs = parseInt(process.env.FEED_REFRESH_DEBOUNCE_MS || '5000', 10);
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = null;
            void this.refresh();
        }, debounceMs);
    }
    private static readonly PUBLIC_ROOT = path.join(process.cwd(), 'public');
    private static readonly BOOTSTRAP_PATH = path.join(this.PUBLIC_ROOT, 'bootstrap-feed.min.json');
    private static readonly COMPANIES_DIR = path.join(this.PUBLIC_ROOT, 'companies');
    private static readonly CATEGORIES_DIR = path.join(this.PUBLIC_ROOT, 'categories');
    private static readonly STATS_PATH = path.join(this.PUBLIC_ROOT, 'stats.json');
    private static readonly SITEMAP_PATH = path.join(this.PUBLIC_ROOT, 'sitemap.xml');
    private static readonly USERNAMES_PATH = path.join(this.PUBLIC_ROOT, 'taken-usernames.min.json');
    private static readonly SITEMAP_DATA_PATH = path.join(this.PUBLIC_ROOT, 'sitemap-data.json');

    /**
     * Slugify a string for use as a filename/path.
     */
    private static slugify(text: string): string {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
    }

    /**
     * Executes a database query operation with automatic retries for Neon database cold-starts.
     */
    private static async withDbRetry<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
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
                logger.warn(`[StaticFeedService] Database connection issue or cold-start detected. Retrying in ${delay}ms... (${retries} retries left)`, { error: errorMsg });
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.withDbRetry(operation, retries - 1, delay * 2);
            }
            throw error;
        }
    }

    static readonly EXPIRED_FEED_PATH = path.join(this.PUBLIC_ROOT, 'expired-feed.min.json');

    /**
     * 1. MASTER DISCOVERY FEED (All active unexpired opportunities)
     * Select includes all fields needed by web (SEO/display) and mobile (match scoring, filtering).
     * Internal-only fields (adminId, postedByUserId, verificationFailures, etc.) are excluded.
     */
    static async generateBootstrapFeed() {
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

            const mappedOpportunities = this.mapFeedOpportunities(opportunities);
            return { opportunities: mappedOpportunities, timestamp: Date.now(), count: opportunities.length };
        });
    }

    /**
     * EXPIRED DISCOVERY FEED (Opportunities expired in the last 45 days)
     * Used by detail pages to display the "Expired" state instead of 404ing.
     */
    static async generateExpiredFeed() {
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

            const mappedOpportunities = this.mapFeedOpportunities(opportunities);
            return { opportunities: mappedOpportunities, timestamp: Date.now(), count: opportunities.length };
        });
    }

    private static getFeedSelectFields() {
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

            // Timestamps
            postedAt: true,
            publishedAt: true,
            expiresAt: true,

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

    private static mapFeedOpportunities(opportunities: Record<string, unknown>[]) {
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

    /**
     * 2. COMPANY SHARDS
     */
    static async generateCompanyShards() {
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

            const mappedOpportunities = this.mapFeedOpportunities(opportunities);
            
            // Group in-memory
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

            const shards: Array<{ slug: string; data: Record<string, unknown> }> = [];
            for (const [company, jobs] of grouped.entries()) {
                const slug = this.slugify(company);
                shards.push({
                    slug,
                    data: {
                        company,
                        opportunities: jobs,
                        count: jobs.length,
                        timestamp: Date.now()
                    }
                });
            }
            return shards;
        });
    }

    /**
     * 3. CATEGORY SHARDS
     */
    static async generateCategoryShards() {
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

    /**
     * 4. SITEMAP
     */
    static async generateSitemap() {
        return this.withDbRetry(async () => {
            const baseUrl = (process.env.FRONTEND_URL || 'https://fresherflow.in').replace(/\/+$/, '');
            const now = new Date().toISOString();

            const staticRoutes = ['', '/opportunities', '/jobs', '/internships', '/walk-ins'];

            const companies = await prisma.opportunity.findMany({
                where: { status: OpportunityStatus.PUBLISHED, deletedAt: null },
                distinct: ['company'],
                select: { company: true }
            });

            const opportunities = await prisma.opportunity.findMany({
                where: { status: OpportunityStatus.PUBLISHED, deletedAt: null },
                orderBy: { postedAt: 'desc' },
                take: 500, // More for sitemap
                select: { id: true, slug: true, type: true }
            });

            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

            staticRoutes.forEach(r => xml += `  <url><loc>${baseUrl}${r}</loc><lastmod>${now}</lastmod></url>\n`);
            companies.forEach(c => xml += `  <url><loc>${baseUrl}/companies/${this.slugify(c.company)}</loc><changefreq>daily</changefreq></url>\n`);
            opportunities.forEach(opp => {
                const slugOrId = opp.slug || opp.id;
                const prefix = opp.type === 'INTERNSHIP' ? '/internships/' : opp.type === 'WALKIN' ? '/walk-ins/details/' : '/jobs/';
                xml += `  <url><loc>${baseUrl}${prefix}${encodeURIComponent(slugOrId)}</loc><changefreq>weekly</changefreq></url>\n`;
            });

            xml += '</urlset>';
            return xml;
        });
    }

    /**
     * 4b. SITEMAP JSON DATA
     */
    static async generateSitemapData() {
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

            return {
                companies: companies.map(c => ({
                    name: c.company,
                    slug: this.slugify(c.company)
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

    /**
     * 5. LANDING PAGE STATS (LPS)
     */
    static async generateStats() {
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

    /**
     * 6. OCCUPIED USERNAMES SHARD
     */
    static async generateTakenUsernames(): Promise<string[]> {
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

    /**
     * Upload regenerated content directly to Cloudflare R2 bucket.
     */
    private static async uploadToR2(key: string, body: string, contentType: string) {
        const endpoint = process.env.R2_ENDPOINT;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME || 'fresherflow-cdn';

        if (!endpoint || !accessKeyId || !secretAccessKey) {
            logger.warn(`[StaticFeedService] Skipping R2 upload for ${key} - R2 credentials not fully configured in environment.`);
            return;
        }

        try {
            const s3 = new S3Client({
                region: 'auto',
                endpoint,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });

            await s3.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: body,
                    ContentType: contentType,
                    CacheControl: key === 'feed-version.json' ? 'no-cache, no-store, must-revalidate' : undefined,
                })
            );
            logger.info(`[StaticFeedService] Successfully uploaded to R2: ${key}`);
        } catch (error) {
            logger.error(`[StaticFeedService] Failed to upload ${key} to R2`, error);
        }
    }

    /**
     * REFRESH USERNAMES ALONE
     */
    static async refreshUsernames() {
        try {
            if (!fs.existsSync(this.PUBLIC_ROOT)) {
                fs.mkdirSync(this.PUBLIC_ROOT, { recursive: true });
            }
            const usernames = await this.generateTakenUsernames();
            const body = JSON.stringify(usernames);
            fs.writeFileSync(this.USERNAMES_PATH, body);
            logger.info('[StaticFeedService] Occupied usernames list updated', { count: usernames.length });

            // Upload to Cloudflare R2
            await this.uploadToR2('taken-usernames.min.json', body, 'application/json');
        } catch (error) {
            logger.error('[StaticFeedService] Failed to regenerate occupied usernames', error);
        }
    }

    /**
     * MASTER REFRESH
     */
    static async refresh() {
        try {
            logger.info('Starting full static asset regeneration...');

            // 1. Ensure dirs
            [this.PUBLIC_ROOT, this.COMPANIES_DIR].forEach(d => {
                if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
            });

            // 2. Generate data
            const bootstrap = await this.generateBootstrapFeed();
            const expired = await this.generateExpiredFeed();
            const companyShards = await this.generateCompanyShards();
            // const categoryShards = await this.generateCategoryShards();
            const stats = await this.generateStats();
            const sitemap = await this.generateSitemap();
            const sitemapData = await this.generateSitemapData();
            const usernames = await this.generateTakenUsernames();

            // 3. Write files & upload to R2
            const bootstrapBody = JSON.stringify(bootstrap);
            fs.writeFileSync(this.BOOTSTRAP_PATH, bootstrapBody);
            await this.uploadToR2('bootstrap-feed.min.json', bootstrapBody, 'application/json');

            const expiredBody = JSON.stringify(expired);
            fs.writeFileSync(this.EXPIRED_FEED_PATH, expiredBody);
            await this.uploadToR2('expired-feed.min.json', expiredBody, 'application/json');

            // Generate and upload dynamic feed-version.json cache buster
            const feedVersion = Date.now().toString();
            const versionBody = JSON.stringify({ version: feedVersion });
            fs.writeFileSync(path.join(this.PUBLIC_ROOT, 'feed-version.json'), versionBody);
            await this.uploadToR2('feed-version.json', versionBody, 'application/json');

            const statsBody = JSON.stringify(stats);
            fs.writeFileSync(this.STATS_PATH, statsBody);
            await this.uploadToR2('stats.json', statsBody, 'application/json');

            fs.writeFileSync(this.SITEMAP_PATH, sitemap);
            await this.uploadToR2('sitemap.xml', sitemap, 'application/xml');

            const sitemapDataBody = JSON.stringify(sitemapData);
            fs.writeFileSync(this.SITEMAP_DATA_PATH, sitemapDataBody);
            await this.uploadToR2('sitemap-data.json', sitemapDataBody, 'application/json');

            const usernamesBody = JSON.stringify(usernames);
            fs.writeFileSync(this.USERNAMES_PATH, usernamesBody);
            await this.uploadToR2('taken-usernames.min.json', usernamesBody, 'application/json');

            for (const s of companyShards) {
                const body = JSON.stringify(s.data);
                fs.writeFileSync(path.join(this.COMPANIES_DIR, `${s.slug}.json`), body);
                await this.uploadToR2(`companies/${s.slug}.json`, body, 'application/json');
            }

            /*
            for (const s of categoryShards) {
                const body = JSON.stringify(s.data);
                fs.writeFileSync(path.join(this.CATEGORIES_DIR, `${s.id}.json`), body);
                await this.uploadToR2(`categories/${s.id}.json`, body, 'application/json');
            }
            */

            logger.info('Static shards regenerated successfully', {
                companies: companyShards.length,
                // categories: categoryShards.length,
                jobsInBootstrap: bootstrap.opportunities.length,
                usernamesCount: usernames.length
            });
        } catch (error) {
            logger.error('Failed to regenerate static shards', error);
        }
    }
}
