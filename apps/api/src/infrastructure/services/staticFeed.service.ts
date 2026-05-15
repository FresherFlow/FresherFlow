import fs from 'fs';
import path from 'path';
import prisma from '../database/prisma';
import { OpportunityStatus } from '@fresherflow/types';
import { logger } from '@fresherflow/logger';

/**
 * Service to generate "Distributed Static Data Shards" for discovery.
 * decoupled from live API for high performance and low infrastructure cost.
 */
export class StaticFeedService {
    private static readonly PUBLIC_ROOT = path.join(process.cwd(), 'public');
    private static readonly BOOTSTRAP_PATH = path.join(this.PUBLIC_ROOT, 'bootstrap-feed.min.json');
    private static readonly COMPANIES_DIR = path.join(this.PUBLIC_ROOT, 'companies');
    private static readonly CATEGORIES_DIR = path.join(this.PUBLIC_ROOT, 'categories');
    private static readonly SITEMAP_PATH = path.join(this.PUBLIC_ROOT, 'sitemap.xml');

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
     * 1. BOOTSTRAP FEED (Top 40 latest)
     */
    static async generateBootstrapFeed() {
        const opportunities = await prisma.opportunity.findMany({
            where: { status: OpportunityStatus.PUBLISHED, deletedAt: null },
            orderBy: { postedAt: 'desc' },
            take: 40,
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
            },
        });

        return { opportunities, timestamp: Date.now(), count: opportunities.length };
    }

    /**
     * 2. COMPANY SHARDS
     */
    static async generateCompanyShards() {
        const companies = await prisma.opportunity.groupBy({
            by: ['company'],
            where: { status: OpportunityStatus.PUBLISHED, deletedAt: null },
        });

        const shards: Array<{ slug: string; data: any }> = [];
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
    }

    /**
     * 3. CATEGORY SHARDS
     */
    static async generateCategoryShards() {
        const categories = [
            { id: 'remote', where: { workMode: 'REMOTE' } },
            { id: 'internships', where: { type: 'INTERNSHIP' } },
            { id: 'walkins', where: { type: 'WALKIN' } },
            { id: 'freshers', where: { experienceMin: { lte: 0 } } },
        ];

        const shards: Array<{ id: string; data: any }> = [];
        for (const cat of categories) {
            const opportunities = await prisma.opportunity.findMany({
                where: { 
                    ...cat.where, 
                    status: OpportunityStatus.PUBLISHED, 
                    deletedAt: null 
                } as any,
                orderBy: { postedAt: 'desc' },
                take: 100,
                select: { id: true, slug: true, title: true, company: true, locations: true, type: true, postedAt: true }
            });
            shards.push({ id: cat.id, data: { category: cat.id, opportunities, count: opportunities.length, timestamp: Date.now() } });
        }
        return shards;
    }

    /**
     * 4. SITEMAP
     */
    static async generateSitemap() {
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
            const sitemap = await this.generateSitemap();

            // 3. Write files
            fs.writeFileSync(this.BOOTSTRAP_PATH, JSON.stringify(bootstrap));
            fs.writeFileSync(this.SITEMAP_PATH, sitemap);

            companyShards.forEach(s => {
                fs.writeFileSync(path.join(this.COMPANIES_DIR, `${s.slug}.json`), JSON.stringify(s.data));
            });

            categoryShards.forEach(s => {
                fs.writeFileSync(path.join(this.CATEGORIES_DIR, `${s.id}.json`), JSON.stringify(s.data));
            });

            logger.info('Static shards regenerated successfully', {
                companies: companyShards.length,
                categories: categoryShards.length,
                jobsInBootstrap: bootstrap.opportunities.length
            });
        } catch (error) {
            logger.error('Failed to regenerate static shards', error);
        }
    }
}
