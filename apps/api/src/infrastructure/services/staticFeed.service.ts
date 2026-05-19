import fs from 'fs';
import path from 'path';
import prisma from '../database/prisma';
import { Prisma } from '@prisma/client';
import { OpportunityStatus } from '@fresherflow/types';
import { logger } from '@fresherflow/logger';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Service to generate "Distributed Static Data Shards" for discovery.
 * decoupled from live API for high performance and low infrastructure cost.
 */
export class StaticFeedService {
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

    /**
     * 1. MASTER DISCOVERY FEED (All active unexpired opportunities)
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
                select: {
                    id: true,
                    slug: true,
                    title: true,
                    company: true,
                    companyLogoUrl: true,
                    locations: true,
                    type: true,
                    workMode: true,
                    postedAt: true,
                    tags: true,
                    allowedPassoutYears: true,
                    trendingScore: true,
                    expiresAt: true
                },
            });

            return { opportunities, timestamp: Date.now(), count: opportunities.length };
        });
    }

    /**
     * 2. COMPANY SHARDS
     */
    static async generateCompanyShards() {
        return this.withDbRetry(async () => {
            const companies = await prisma.opportunity.groupBy({
                by: ['company'],
                where: { status: OpportunityStatus.PUBLISHED, deletedAt: null },
            });

            const shards: Array<{ slug: string; data: Record<string, unknown> }> = [];
            for (const { company } of companies) {
                const slug = this.slugify(company);
                const opportunities = await prisma.opportunity.findMany({
                    where: { company, status: OpportunityStatus.PUBLISHED, deletedAt: null },
                    orderBy: { postedAt: 'desc' },
                    take: 100, // Top 100 per company is enough for static shard
                    select: { id: true, slug: true, title: true, locations: true, type: true, postedAt: true, tags: true }
                });

                shards.push({ slug, data: { company, opportunities, count: opportunities.length, timestamp: Date.now() } });
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
            [this.PUBLIC_ROOT, this.COMPANIES_DIR, this.CATEGORIES_DIR].forEach(d => {
                if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
            });

            // 2. Generate data
            const bootstrap = await this.generateBootstrapFeed();
            const companyShards = await this.generateCompanyShards();
            const categoryShards = await this.generateCategoryShards();
            const stats = await this.generateStats();
            const sitemap = await this.generateSitemap();
            const sitemapData = await this.generateSitemapData();
            const usernames = await this.generateTakenUsernames();

            // 3. Write files & upload to R2
            const bootstrapBody = JSON.stringify(bootstrap);
            fs.writeFileSync(this.BOOTSTRAP_PATH, bootstrapBody);
            await this.uploadToR2('bootstrap-feed.min.json', bootstrapBody, 'application/json');

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

            for (const s of categoryShards) {
                const body = JSON.stringify(s.data);
                fs.writeFileSync(path.join(this.CATEGORIES_DIR, `${s.id}.json`), body);
                await this.uploadToR2(`categories/${s.id}.json`, body, 'application/json');
            }

            logger.info('Static shards regenerated successfully', {
                companies: companyShards.length,
                categories: categoryShards.length,
                jobsInBootstrap: bootstrap.opportunities.length,
                usernamesCount: usernames.length
            });
        } catch (error) {
            logger.error('Failed to regenerate static shards', error);
        }
    }
}
