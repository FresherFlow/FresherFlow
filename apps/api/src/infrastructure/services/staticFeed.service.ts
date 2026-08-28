import path from 'path';
import prisma from '../database/prisma';
import { OpportunityStatus } from '@fresherflow/types';
import { INDIAN_CITIES } from '@fresherflow/constants';
import { logger } from '@fresherflow/utils';
import { getPublicSiteUrl } from '../../utils/runtimeConfig';
import { StorageService } from './storage.service';
import { FeedGeneratorService } from './feedGenerator.service';

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

    private static get PUBLIC_ROOT() { return StorageService.getPublicRoot(); }
    private static get BOOTSTRAP_PATH() { return path.join(this.PUBLIC_ROOT, 'bootstrap-feed.min.json'); }
    private static get FEED_INDEX_PATH() { return path.join(this.PUBLIC_ROOT, 'feed-index.json'); }
    private static get FEED_DIR() { return path.join(this.PUBLIC_ROOT, 'feed'); }
    private static get COMPANIES_DIR() { return path.join(this.PUBLIC_ROOT, 'companies'); }
    private static get CATEGORIES_DIR() { return path.join(this.PUBLIC_ROOT, 'categories'); }
    private static get STATS_PATH() { return path.join(this.PUBLIC_ROOT, 'stats.json'); }
    private static get SITEMAP_PATH() { return path.join(this.PUBLIC_ROOT, 'sitemap.xml'); }
    private static get USERNAMES_PATH() { return path.join(this.PUBLIC_ROOT, 'taken-usernames.min.json'); }
    private static get SITEMAP_DATA_PATH() { return path.join(this.PUBLIC_ROOT, 'sitemap-data.json'); }
    private static get LINKS_PATH() { return path.join(this.PUBLIC_ROOT, 'links.min.json'); }
    private static get RESOURCES_PATH() { return path.join(this.PUBLIC_ROOT, 'resources-feed.json'); }
    private static get GOVERNMENT_PATH() { return path.join(this.PUBLIC_ROOT, 'government-feed.json'); }
    private static get WALKINS_PATH() { return path.join(this.PUBLIC_ROOT, 'walkins-feed.json'); }
    private static get SYLLABUS_PATH() { return path.join(this.PUBLIC_ROOT, 'syllabus.json'); }
    private static get GENERATED_HUBS_PATH() { return path.join(this.PUBLIC_ROOT, 'generated-hubs.json'); }
    private static get JOBS_DIR() { return path.join(this.PUBLIC_ROOT, 'jobs'); }
    public static get EXPIRED_FEED_PATH() { return path.join(this.PUBLIC_ROOT, 'expired-feed.min.json'); }

    // Retain delegates for backwards compatibility
    static async generateBootstrapFeed() {
        return FeedGeneratorService.generateBootstrapFeed();
    }

    static async generateWalkinFeed() {
        return FeedGeneratorService.generateWalkinFeed();
    }

    static async generateGovernmentFeed() {
        return FeedGeneratorService.generateGovernmentFeed();
    }

    static async generateExpiredFeed() {
        return FeedGeneratorService.generateExpiredFeed();
    }

    static async generateCompanyShards() {
        return FeedGeneratorService.generateCompanyShards();
    }

    static async generateCategoryShards() {
        return FeedGeneratorService.generateCategoryShards();
    }

    static async generateSitemap() {
        return FeedGeneratorService.generateSitemap();
    }

    static async generateSitemapData() {
        return FeedGeneratorService.generateSitemapData();
    }

    static async generateLinksFeed() {
        return FeedGeneratorService.generateLinksFeed();
    }

    static async generateStats() {
        return FeedGeneratorService.generateStats();
    }

    static async generateTakenUsernames(): Promise<string[]> {
        return FeedGeneratorService.generateTakenUsernames();
    }

    static async generateResourcesFeed() {
        return FeedGeneratorService.generateResourcesFeed();
    }



    /**
     * REFRESH USERNAMES ALONE
     */
    static async refreshUsernames() {
        try {
            StorageService.ensureDirectoryExists(this.PUBLIC_ROOT);
            const usernames = await FeedGeneratorService.generateTakenUsernames();
            const body = JSON.stringify(usernames);
            StorageService.writeLocalFile(this.USERNAMES_PATH, body);
            logger.info('[StaticFeedService] Occupied usernames list updated', { count: usernames.length });

            // Upload to Cloudflare R2
            await StorageService.uploadToR2('taken-usernames.min.json', body, 'application/json');
        } catch (error) {
            logger.error('[StaticFeedService] Failed to regenerate occupied usernames', error);
        }
    }

    /**
     * MASTER REFRESH (Optimized to prevent OOM errors on 512MB RAM server tier)
     */
    static async refresh(target: string = 'all') {
        try {
            logger.info(`Starting static asset regeneration (Target: ${target})...`);

            // Load companies.json to map company names to their custom slugs
            await FeedGeneratorService.loadCompanySlugMap();

            // 1. Ensure dirs
            [this.PUBLIC_ROOT, this.COMPANIES_DIR].forEach(d => {
                StorageService.ensureDirectoryExists(d);
            });

            // 2. Fetch all published opportunities once (Consolidated Query)
            const allOpportunities = await FeedGeneratorService.withDbRetry(async () => {
                return prisma.opportunity.findMany({
                    where: {
                        status: OpportunityStatus.PUBLISHED,
                        deletedAt: null,
                    },
                    select: FeedGeneratorService.getFeedSelectFields(),
                    orderBy: { postedAt: 'desc' },
                });
            });

            const allMapped = FeedGeneratorService.mapFeedOpportunities(allOpportunities as unknown as Record<string, unknown>[]) as unknown as Array<Record<string, unknown> & { expiresAt?: string | Date | null }>;
            const now = new Date();

            // 3. Filter Active/Unexpired Opportunities
            const activeMapped = allMapped.filter(opp => {
                if (!opp.expiresAt) return true;
                const exp = new Date(opp.expiresAt as string | Date);
                return exp > now;
            });

            // 4. Generate & Upload Master Bootstrap Feed & Daily Date-Based Feeds
            if (target === 'all' || target === 'bootstrap') {
                const bootstrap = {
                    opportunities: activeMapped,
                    timestamp: Date.now(),
                    generatedAt: now.toISOString(),
                    count: activeMapped.length
                };
                const bootstrapBody = JSON.stringify(bootstrap);
                StorageService.writeLocalFile(this.BOOTSTRAP_PATH, bootstrapBody);
                await StorageService.uploadToR2('bootstrap-feed.min.json', bootstrapBody, 'application/json');

                // 4b. Lightweight feed index — card-rendering fields only.
                // ~700 bytes/job vs ~2.5KB/job in the full bootstrap.
                // Web /jobs pages fetch this instead of the full feed.
                // Mobile and detail pages continue using the full bootstrap.
                const indexFields = [
                    'id', 'slug', 'type', 'status', 'title', 'company', 'companyWebsite', 'companyLogoUrl',
                    'locations', 'workMode', 'salaryMin', 'salaryMax', 'salaryRange', 'salaryPeriod',
                    'stipend', 'incentives', 'employmentType', 'jobFunction',
                    'requiredSkills', 'tags',
                    'allowedDegrees', 'allowedCourses', 'allowedSpecializations',
                    'allowedPassoutYears', 'passoutYearMin', 'passoutYearMax',
                    'experienceMin', 'experienceMax',
                    'postedAt', 'publishedAt', 'expiresAt', 'updatedAt',
                    'applyLink', 'sourceLink',
                    'walkInDetails', 'governmentJobDetails',
                    'isReferral', 'referredByUsername'
                ];
                const indexOpps = activeMapped.map(opp => {
                    const light: Record<string, unknown> = {};
                    for (const key of indexFields) {
                        const val = opp[key];
                        if (val !== undefined && val !== null) {
                            if (Array.isArray(val) && val.length === 0) continue;
                            light[key] = val;
                        }
                    }
                    return light;
                });
                const feedIndex = {
                    opportunities: indexOpps,
                    timestamp: Date.now(),
                    generatedAt: now.toISOString(),
                    count: indexOpps.length
                };
                const indexBody = JSON.stringify(feedIndex);
                StorageService.writeLocalFile(this.FEED_INDEX_PATH, indexBody);
                await StorageService.uploadToR2('feed-index.json', indexBody, 'application/json');
            }

            // 5. Generate & Upload Government Feed
            if (target === 'all' || target === 'govt') {
                const governmentMapped = activeMapped.filter(opp => opp.type === 'GOVERNMENT' || Boolean(opp.governmentJobDetails));
                const government = {
                    opportunities: governmentMapped,
                    timestamp: Date.now(),
                    generatedAt: now.toISOString(),
                    count: governmentMapped.length
                };
                const governmentBody = JSON.stringify(government);
                StorageService.writeLocalFile(this.GOVERNMENT_PATH, governmentBody);
                await StorageService.uploadToR2('government-feed.json', governmentBody, 'application/json');
            }

            // 5b. Generate & Upload Walk-ins Feed (including Hyderabad Tech Cluster Map Feed)
            if (target === 'all' || target === 'walkin' || target === 'bootstrap') {
                const walkinMapped = activeMapped.filter(opp => opp.type === 'WALKIN' || Boolean(opp.walkInDetails));
                const walkins = {
                    opportunities: walkinMapped,
                    timestamp: Date.now(),
                    generatedAt: now.toISOString(),
                    count: walkinMapped.length
                };
                const walkinsBody = JSON.stringify(walkins);
                StorageService.writeLocalFile(this.WALKINS_PATH, walkinsBody);
                await StorageService.uploadToR2('walkins-feed.json', walkinsBody, 'application/json');
                await StorageService.uploadToR2('feeds/walkins.json', walkinsBody, 'application/json');
            }

            // 6. Generate & Upload Expired Feed (Past 45 Days)
            if (target === 'all' || target === 'expired' || target === 'bootstrap' || target === 'govt') {
                const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
                const expiredMapped = allMapped.filter(opp => {
                    if (!opp.expiresAt) return false;
                    const exp = new Date(opp.expiresAt as string | Date);
                    return exp <= now && exp > fortyFiveDaysAgo;
                });
                const expired = {
                    opportunities: expiredMapped,
                    timestamp: Date.now(),
                    generatedAt: now.toISOString(),
                    count: expiredMapped.length
                };
                const expiredBody = JSON.stringify(expired);
                StorageService.writeLocalFile(this.EXPIRED_FEED_PATH, expiredBody);
                await StorageService.uploadToR2('expired-feed.min.json', expiredBody, 'application/json');
            }

            // 7. Sync syllabus.json from R2
            if (target === 'all' || target === 'govt') {
                try {
                    const syllabusBody = await StorageService.fetchFromR2('syllabus.json');
                    if (syllabusBody) {
                        StorageService.writeLocalFile(this.SYLLABUS_PATH, syllabusBody);
                    } else {
                        const localSyllabus = StorageService.readLocalFile(this.SYLLABUS_PATH);
                        if (localSyllabus) {
                            await StorageService.uploadToR2('syllabus.json', localSyllabus, 'application/json');
                        }
                    }
                } catch (err) {
                    logger.error('[StaticFeedService] Failed to sync syllabus.json from R2', err);
                }
            }

            // 8. Generate and upload dynamic feed-version.json cache buster
            const feedVersion = Date.now().toString();
            const versionBody = JSON.stringify({ version: feedVersion });
            StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'feed-version.json'), versionBody);
            await StorageService.uploadToR2('feed-version.json', versionBody, 'application/json');

            // 9. Generate & Upload Stats
            if (target === 'all' || target === 'bootstrap') {
                const uniqueCompanies = new Set(
                    activeMapped.map(o => (o as { company?: string }).company).filter(Boolean)
                );
                const stats = {
                    opportunities: activeMapped.length,
                    companies: uniqueCompanies.size,
                    timestamp: Date.now()
                };
                const statsBody = JSON.stringify(stats);
                StorageService.writeLocalFile(this.STATS_PATH, statsBody);
                await StorageService.uploadToR2('stats.json', statsBody, 'application/json');
            }

            // 10. Generate & Upload Sitemap XML and JSON Data
            if (target === 'all' || target === 'sitemap' || target === 'bootstrap' || target === 'govt') {
                const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
                const sitemapOpps = (allMapped as Record<string, unknown>[]).filter(opp => {
                    if (!opp.expiresAt) return true;
                    const exp = new Date(opp.expiresAt as string | Date);
                    return exp > fortyFiveDaysAgo;
                });
                const companiesCounts = new Map<string, number>();
                sitemapOpps.forEach((opp) => {
                    if (opp.company && typeof opp.company === 'string') {
                        companiesCounts.set(opp.company, (companiesCounts.get(opp.company) || 0) + 1);
                    }
                });

                const baseUrl = getPublicSiteUrl();
                const staticDate = new Date().toISOString().split('T')[0];
                const staticRoutes = [
                    '',
                    '/jobs',
                    '/jobs/internships',
                    '/jobs/walkins',
                    '/govt',
                    '/about',
                    '/blog',
                    '/contact',
                    '/privacy',
                    '/terms',
                    '/app'
                ];

                // 1. Companies (Active opportunities only, count >= 1 - matches web companies/[slug])
                const activeCompaniesCounts = new Map<string, number>();
                activeMapped.forEach((opp) => {
                    if (opp.company && typeof opp.company === 'string') {
                        activeCompaniesCounts.set(opp.company, (activeCompaniesCounts.get(opp.company) || 0) + 1);
                    }
                });
                const validCompanies = Array.from(activeCompaniesCounts.entries())
                    .filter(([_, count]) => count >= 1)
                    .map(([c]) => c);

                // 2. Skills (Active opportunities only, count >= 5 - matches web SKILL_MIN_JOBS = 5 & dynamicParams = false)
                const activeSkillsCounts = new Map<string, number>();
                activeMapped.forEach(opp => {
                    ((opp.requiredSkills as string[]) || []).forEach(s => {
                        if (s) {
                            const slug = FeedGeneratorService.slugify(s);
                            if (slug) {
                                activeSkillsCounts.set(slug, (activeSkillsCounts.get(slug) || 0) + 1);
                            }
                        }
                    });
                });
                const validSkills = Array.from(activeSkillsCounts.entries())
                    .filter(([_, count]) => count >= 5)
                    .map(([s]) => s);

                // 3. Roles (Active opportunities only, matches web ROLE_OVERRIDES & ROLE_MIN_JOBS = 5)
                const ROLE_OVERRIDES: Record<string, { label: string; keywords: string[] }> = {
                    'software-engineer': {
                        label: 'Software Engineer',
                        keywords: ['software engineer', 'software developer', 'sde', 'full stack', 'backend developer', 'frontend developer', 'programmer', 'developer'],
                    },
                    'data-analyst': {
                        label: 'Data Analyst',
                        keywords: ['data analyst', 'bi analyst', 'data analytics', 'data scientist', 'ml engineer'],
                    },
                    'business-analyst': {
                        label: 'Business Analyst',
                        keywords: ['business analyst', 'product analyst', 'consultant', 'ba '],
                    },
                    'frontend-developer': {
                        label: 'Frontend Developer',
                        keywords: ['frontend developer', 'frontend engineer', 'ui developer', 'web developer'],
                    },
                    'test-engineer': {
                        label: 'Test Engineer',
                        keywords: ['test engineer', 'qa', 'quality assurance', 'sdet', 'automation engineer', 'tester'],
                    },
                };

                const activeRolesCounts = new Map<string, number>();
                for (const opp of activeMapped) {
                    const titleLower = ((opp.title as string) || '').toLowerCase();
                    const jfSlug = opp.jobFunction ? FeedGeneratorService.slugify(opp.jobFunction as string) : null;

                    for (const [slug, roleInfo] of Object.entries(ROLE_OVERRIDES)) {
                        if (jfSlug === slug || roleInfo.keywords.some(kw => titleLower.includes(kw))) {
                            activeRolesCounts.set(slug, (activeRolesCounts.get(slug) || 0) + 1);
                        }
                    }
                    if (jfSlug && !ROLE_OVERRIDES[jfSlug]) {
                        activeRolesCounts.set(jfSlug, (activeRolesCounts.get(jfSlug) || 0) + 1);
                    }
                }
                const validRoles = Array.from(new Set([
                    ...Object.keys(ROLE_OVERRIDES).filter(r => (activeRolesCounts.get(r) || 0) > 0),
                    ...Array.from(activeRolesCounts.entries()).filter(([_, count]) => count >= 5).map(([r]) => r)
                ]));

                // 4. Locations (Active opportunities only, canonical location mapping & LOCATION_MIN_JOBS = 3)
                const VALID_LOCATIONS_MAP: Record<string, string[]> = {
                    'bangalore': ['bangalore', 'bengaluru'],
                    'hyderabad': ['hyderabad'],
                    'pune': ['pune'],
                    'chennai': ['chennai'],
                    'mumbai': ['mumbai'],
                    'delhi-ncr': ['delhi', 'noida', 'gurugram', 'ncr', 'gurgaon'],
                    'remote': ['remote', 'work from home', 'wfh', 'telecommute']
                };
                const BLOCKED_LOCATIONS = new Set([
                    'pan india', 'india', 'remote', 'work from home', 'wfh',
                    'multiple locations', 'various locations', 'anywhere', 'worldwide',
                    'across india', 'all india', 'multiple cities',
                ]);
                const getCanonicalLoc = (loc: string): string | null => {
                    const lower = loc.toLowerCase().trim();
                    for (const [canonicalSlug, aliases] of Object.entries(VALID_LOCATIONS_MAP)) {
                        if (aliases.some(alias => lower.includes(alias))) return canonicalSlug;
                    }
                    return null;
                };

                const activeLocationsCounts = new Map<string, number>();
                for (const opp of activeMapped) {
                    if (opp.workMode === 'REMOTE') {
                        activeLocationsCounts.set('remote', (activeLocationsCounts.get('remote') || 0) + 1);
                    }
                    for (const loc of ((opp.locations as string[]) || [])) {
                        if (!loc) continue;
                        const key = loc.trim();
                        const lLower = key.toLowerCase();
                        if (BLOCKED_LOCATIONS.has(lLower) || key.includes(',') || key.includes('(') || key.length > 40 || key.length < 2) continue;
                        const rawSlug = FeedGeneratorService.slugify(key);
                        const canonical = getCanonicalLoc(rawSlug) || rawSlug;
                        activeLocationsCounts.set(canonical, (activeLocationsCounts.get(canonical) || 0) + 1);
                    }
                }
                const validLocations = Array.from(activeLocationsCounts.entries())
                    .filter(([_, count]) => count >= 3)
                    .map(([l]) => l);

                // 5. Batches (Active opportunities only, count >= 3 & valid years)
                const activeBatchesCounts = new Map<number, number>();
                activeMapped.forEach(opp => {
                    ((opp.allowedPassoutYears as number[]) || []).forEach(y => {
                        if (typeof y === 'number' && y >= 2015 && y <= 2035) {
                            activeBatchesCounts.set(y, (activeBatchesCounts.get(y) || 0) + 1);
                        }
                    });
                });
                const validBatches = Array.from(activeBatchesCounts.entries())
                    .filter(([_, count]) => count >= 3)
                    .map(([b]) => b);

                // 1. sitemap-jobs.xml
                let jobsXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                jobsXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
                staticRoutes.forEach(r => jobsXml += `  <url><loc>${baseUrl}${r}</loc><lastmod>${staticDate}</lastmod></url>\n`);
                sitemapOpps.forEach(opp => {
                    const slugOrId = (opp.slug || opp.id) as string;
                    const rawDate = (opp.updatedAt || opp.postedAt) as string | Date | undefined;
                    const dateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : staticDate;
                    const prefix = opp.type === 'GOVERNMENT' ? 'govt' : 'jobs';
                    jobsXml += `  <url><loc>${baseUrl}/${prefix}/${encodeURIComponent(slugOrId)}</loc><lastmod>${dateStr}</lastmod><changefreq>weekly</changefreq></url>\n`;
                });
                jobsXml += '</urlset>';

                // 2. sitemap-companies.xml
                let companiesXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                companiesXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
                validCompanies.forEach(c => companiesXml += `  <url><loc>${baseUrl}/companies/${FeedGeneratorService.getCompanySlug(c)}</loc><lastmod>${staticDate}</lastmod><changefreq>daily</changefreq></url>\n`);
                companiesXml += '</urlset>';

                // 3. sitemap-skills.xml
                let skillsXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                skillsXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
                validSkills.forEach(s => skillsXml += `  <url><loc>${baseUrl}/skills/${s}</loc><lastmod>${staticDate}</lastmod><changefreq>daily</changefreq></url>\n`);
                skillsXml += '</urlset>';

                // 4. sitemap-roles.xml
                let rolesXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                rolesXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
                validRoles.forEach(r => rolesXml += `  <url><loc>${baseUrl}/roles/${r}</loc><lastmod>${staticDate}</lastmod><changefreq>daily</changefreq></url>\n`);
                rolesXml += '</urlset>';

                // 5. sitemap-locations.xml
                let locationsXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                locationsXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
                validLocations.forEach(l => locationsXml += `  <url><loc>${baseUrl}/locations/${l}</loc><lastmod>${staticDate}</lastmod><changefreq>daily</changefreq></url>\n`);
                locationsXml += '</urlset>';

                // 6. sitemap-batches.xml
                let batchesXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                batchesXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
                validBatches.forEach(b => batchesXml += `  <url><loc>${baseUrl}/batch/${b}</loc><lastmod>${staticDate}</lastmod><changefreq>daily</changefreq></url>\n`);
                batchesXml += '</urlset>';

                // 7. sitemap-walkins.xml
                let walkinsXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                walkinsXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
                walkinsXml += `  <url><loc>${baseUrl}/jobs/walkins</loc><lastmod>${staticDate}</lastmod><changefreq>daily</changefreq></url>\n`;
                const walkinOpps = activeMapped.filter(opp => opp.type === 'WALKIN');
                walkinOpps.forEach(opp => {
                    const slugOrId = (opp.slug || opp.id) as string;
                    const rawDate = (opp.updatedAt || opp.postedAt) as string | Date | undefined;
                    const dateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : staticDate;
                    walkinsXml += `  <url><loc>${baseUrl}/jobs/${encodeURIComponent(slugOrId)}</loc><lastmod>${dateStr}</lastmod><changefreq>daily</changefreq></url>\n`;
                });
                walkinsXml += '</urlset>';

                // 8. sitemap-govt.xml
                let govtXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                govtXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
                govtXml += `  <url><loc>${baseUrl}/govt</loc><lastmod>${staticDate}</lastmod><changefreq>daily</changefreq></url>\n`;
                const govtOpps = sitemapOpps.filter(opp => opp.type === 'GOVERNMENT' || Boolean(opp.governmentJobDetails));
                govtOpps.forEach(opp => {
                    const slugOrId = (opp.slug || opp.id) as string;
                    const rawDate = (opp.updatedAt || opp.postedAt) as string | Date | undefined;
                    const dateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : staticDate;
                    govtXml += `  <url><loc>${baseUrl}/govt/${encodeURIComponent(slugOrId)}</loc><lastmod>${dateStr}</lastmod><changefreq>weekly</changefreq></url>\n`;
                });
                govtXml += '</urlset>';

                // 9. sitemap-index.xml
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

                // Write local files
                StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'sitemap-index.xml'), indexXml);
                StorageService.writeLocalFile(this.SITEMAP_PATH, indexXml); // Write to sitemap.xml as index sitemap
                StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'sitemap-jobs.xml'), jobsXml);
                StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'sitemap-walkins.xml'), walkinsXml);
                StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'sitemap-govt.xml'), govtXml);
                StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'sitemap-companies.xml'), companiesXml);
                StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'sitemap-skills.xml'), skillsXml);
                StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'sitemap-roles.xml'), rolesXml);
                StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'sitemap-locations.xml'), locationsXml);
                StorageService.writeLocalFile(path.join(this.PUBLIC_ROOT, 'sitemap-batches.xml'), batchesXml);

                // Upload to R2
                await StorageService.uploadToR2('sitemap-index.xml', indexXml, 'application/xml');
                await StorageService.uploadToR2('sitemap.xml', indexXml, 'application/xml');
                await StorageService.uploadToR2('sitemap-jobs.xml', jobsXml, 'application/xml');
                await StorageService.uploadToR2('sitemap-walkins.xml', walkinsXml, 'application/xml');
                await StorageService.uploadToR2('sitemap-govt.xml', govtXml, 'application/xml');
                await StorageService.uploadToR2('sitemap-companies.xml', companiesXml, 'application/xml');
                await StorageService.uploadToR2('sitemap-skills.xml', skillsXml, 'application/xml');
                await StorageService.uploadToR2('sitemap-roles.xml', rolesXml, 'application/xml');
                await StorageService.uploadToR2('sitemap-locations.xml', locationsXml, 'application/xml');
                await StorageService.uploadToR2('sitemap-batches.xml', batchesXml, 'application/xml');

                const sitemapData = {
                    companies: validCompanies.map(name => ({
                        name,
                        slug: FeedGeneratorService.getCompanySlug(name)
                    })),
                    opportunities: sitemapOpps.map(opp => ({
                        id: opp.id,
                        slug: opp.slug,
                        type: opp.type,
                        postedAt: opp.postedAt,
                        updatedAt: opp.updatedAt
                    })),
                    timestamp: Date.now()
                };
                const sitemapDataBody = JSON.stringify(sitemapData);
                StorageService.writeLocalFile(this.SITEMAP_DATA_PATH, sitemapDataBody);
                await StorageService.uploadToR2('sitemap-data.json', sitemapDataBody, 'application/json');

                // Dynamic Hub static OG Image Generation with R2 cache check!
                try {
                    logger.info('[StaticFeedService] Checking and generating static OG images for hubs...');
                    let cache: {
                        companies: string[];
                        locations: string[];
                        skills: string[];
                        batches: string[];
                        roles: string[];
                    } = { companies: [], locations: [], skills: [], batches: [], roles: [] };

                    try {
                        const localCache = StorageService.readLocalFile(this.GENERATED_HUBS_PATH) || await StorageService.fetchFromR2('generated-hubs.json');
                        if (localCache) {
                            cache = JSON.parse(localCache);
                            if (!cache.companies) cache.companies = [];
                            if (!cache.locations) cache.locations = [];
                            if (!cache.skills) cache.skills = [];
                            if (!cache.batches) cache.batches = [];
                            if (!cache.roles) cache.roles = [];
                        }
                    } catch (err) {
                        logger.warn('[StaticFeedService] Failed to load generated-hubs.json cache, starting fresh', err);
                    }

                    const { generateAndUploadHubOgImage } = await import('./ogImage.service');

                    // 1. Companies OG
                    for (const company of validCompanies) {
                        const slug = FeedGeneratorService.getCompanySlug(company);
                        if (!slug) continue;
                        if (!cache.companies.includes(slug)) {
                            // logger.info(`[StaticFeedService] Generating OG card for company: ${company}`);
                            // await generateAndUploadHubOgImage('company', company, slug);
                            cache.companies.push(slug);
                        }
                    }

                    // 2. Locations OG
                    for (const loc of validLocations) {
                        const slug = FeedGeneratorService.slugify(loc);
                        if (!slug) continue;
                        if (!cache.locations.includes(slug)) {
                            // logger.info(`[StaticFeedService] Generating OG card for location: ${loc}`);
                            // await generateAndUploadHubOgImage('location', loc, slug);
                            cache.locations.push(slug);
                        }
                    }

                    // 3. Skills OG
                    for (const skill of validSkills) {
                        const slug = FeedGeneratorService.slugify(skill);
                        if (!slug) continue;
                        if (!cache.skills.includes(slug)) {
                            const label = skill.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            // logger.info(`[StaticFeedService] Generating OG card for skill: ${label}`);
                            // await generateAndUploadHubOgImage('skill', label, slug);
                            cache.skills.push(slug);
                        }
                    }

                    // 4. Batches OG
                    for (const year of validBatches) {
                        const slug = year.toString();
                        if (!cache.batches.includes(slug)) {
                            // logger.info(`[StaticFeedService] Generating OG card for batch: ${year}`);
                            // await generateAndUploadHubOgImage('batch', year.toString(), slug);
                            cache.batches.push(slug);
                        }
                    }

                    // 5. Roles OG
                    for (const role of validRoles) {
                        const slug = FeedGeneratorService.slugify(role);
                        if (!slug) continue;
                        if (!cache.roles.includes(slug)) {
                            const label = role.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            // logger.info(`[StaticFeedService] Generating OG card for role: ${label}`);
                            // await generateAndUploadHubOgImage('role', label, slug);
                            cache.roles.push(slug);
                        }
                    }

                    // Save updated cache
                    const cacheBody = JSON.stringify(cache);
                    StorageService.writeLocalFile(this.GENERATED_HUBS_PATH, cacheBody);
                    await StorageService.uploadToR2('generated-hubs.json', cacheBody, 'application/json');
                    logger.info('[StaticFeedService] Static OG cards generated and cache updated successfully!');
                } catch (err) {
                    logger.error('[StaticFeedService] Failed in static OG generation pipeline', err);
                }
            }

            // 11. Generate & Upload Taken Usernames
            let usernamesLength = 0;
            if (target === 'all' || target === 'bootstrap') {
                const usernames = await FeedGeneratorService.generateTakenUsernames();
                usernamesLength = usernames.length;
                const usernamesBody = JSON.stringify(usernames);
                StorageService.writeLocalFile(this.USERNAMES_PATH, usernamesBody);
                await StorageService.uploadToR2('taken-usernames.min.json', usernamesBody, 'application/json');
            }

            // 12. Generate & Upload Links Feed
            if (target === 'all' || target === 'bootstrap') {
                const linksOpps = activeMapped.map(opp => ({
                    id: opp.id,
                    slug: opp.slug,
                    title: opp.title,
                    company: opp.company,
                    type: opp.type,
                    status: opp.status,
                    locations: opp.locations,
                    expiresAt: opp.expiresAt,
                    companyLogoUrl: opp.companyLogoUrl,
                    events: opp.events
                }));
                const linksFeed = { opportunities: linksOpps, timestamp: Date.now(), count: linksOpps.length };
                const linksBody = JSON.stringify(linksFeed);
                StorageService.writeLocalFile(this.LINKS_PATH, linksBody);
                await StorageService.uploadToR2('links.min.json', linksBody, 'application/json');
            }

            // 13. Generate & Upload Resources Feed
            if (target === 'all' || target === 'resources') {
                const resourcesFeed = await FeedGeneratorService.generateResourcesFeed();
                const resourcesBody = JSON.stringify(resourcesFeed);
                StorageService.writeLocalFile(this.RESOURCES_PATH, resourcesBody);
                await StorageService.uploadToR2('resources-feed.json', resourcesBody, 'application/json');
            }

            // 14. Group & Upload Company Shards sequentially (garbage collect references)
            let companyShardsCount = 0;
            if (target === 'all' || target === 'companies' || target === 'bootstrap' || target === 'govt') {
                const groupedCompanies = new Map<string, typeof activeMapped>();
                for (const opp of activeMapped) {
                    if (!opp.company) continue;
                    const key = (opp.company as string).trim();
                    const list = groupedCompanies.get(key) || [];
                    list.push(opp);
                    groupedCompanies.set(key, list);
                }

                companyShardsCount = groupedCompanies.size;
                for (const [company, jobs] of groupedCompanies.entries()) {
                    const slug = FeedGeneratorService.getCompanySlug(company);
                    const shardData = {
                        company,
                        slug,
                        opportunities: jobs,
                        count: jobs.length,
                        timestamp: Date.now()
                    };
                    const body = JSON.stringify(shardData);
                    StorageService.writeLocalFile(path.join(this.COMPANIES_DIR, `${slug}.json`), body);
                    // TODO: company shards R2 upload disabled - not used by any consumer
                    // await StorageService.uploadToR2(`companies/${slug}.json`, body, 'application/json');
                }
            }

            // 15. Generate & Upload Individual Job Shards (api/jobs/{id}.json)
            if (target === 'all' || target === 'bootstrap' || target === 'jobs') {
                StorageService.ensureDirectoryExists(this.JOBS_DIR);
                for (const opp of allMapped) {
                    const jobBody = JSON.stringify(opp);
                    const id = (opp as { id?: string }).id;
                    if (id) {
                        StorageService.writeLocalFile(path.join(this.JOBS_DIR, `${id}.json`), jobBody);
                        await StorageService.uploadToR2(`api/jobs/${id}.json`, jobBody, 'application/json');
                        await StorageService.uploadToR2(`jobs/${id}.json`, jobBody, 'application/json');
                    }
                }
            }

            logger.info('Static shards regenerated successfully', {
                target,
                companies: companyShardsCount,
                jobsInBootstrap: activeMapped.length,
                usernamesCount: usernamesLength
            });
        } catch (error) {
            logger.error('Failed to regenerate static shards', error);
        }
    }

    /**
     * Upload an individual job JSON directly to R2 (atomic update on publish/edit)
     */
    static async uploadSingleJob(opportunity: Record<string, unknown>): Promise<void> {
        try {
            const mapped = FeedGeneratorService.mapFeedOpportunities([opportunity])[0];
            const jobBody = JSON.stringify(mapped);
            const id = (opportunity as { id?: string }).id;

            StorageService.ensureDirectoryExists(this.JOBS_DIR);
            if (id) {
                StorageService.writeLocalFile(path.join(this.JOBS_DIR, `${id}.json`), jobBody);
                await StorageService.uploadToR2(`api/jobs/${id}.json`, jobBody, 'application/json');
                await StorageService.uploadToR2(`jobs/${id}.json`, jobBody, 'application/json');
            }
        } catch (error) {
            logger.error('[StaticFeedService] Failed to upload single job JSON to R2', error);
        }
    }
}
