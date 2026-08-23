import {
    AtsJob,
    sleep,
    SCRAPER_REGISTRY,
    ScraperInputDto,
    toAtsJob,
    COMPANY_PROVIDER_SET,
    PLUGIN_REGISTRY
} from '@fresherflow/plugins';

import { isPotentialFresherJob, isLocationIndiaOrRemote, scoreJobDescription, isSeniorJob } from '@fresherflow/utils';
import { normalizeUrl } from '../utils/url.js';

export interface AtsRegistry {
    [key: string]: Record<string, string> | undefined;
}

export async function withConcurrency<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results: T[] = [];
    const queue = [...tasks];

    async function worker() {
        while (queue.length > 0) {
            const task = queue.shift()!;
            try {
                results.push(await task());
            } catch (err: any) {
                console.warn(`Worker task crashed: ${err.message}`);
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
    return results;
}

/**
 * Run a single ATS provider across its registered companies.
 * Uses IScraper.scrape() with ScraperInputDto — same as ever-jobs.
 */
async function runProvider(
    name: string,
    slug: string,
    companies: Record<string, string>,
    stats: any,
    knownLinks: Set<string>,
    visitedSet: Set<string>
): Promise<AtsJob[]> {
    const allEntries = Object.entries(companies);
    if (allEntries.length === 0) return [];

    // Cap companies per provider per discovery run to 100 to prevent multi-hour crawls
    const entries = allEntries.slice(0, 100);
    console.log(`\nStarting ${name} adapter (${entries.length} companies)...`);

    const scraper = SCRAPER_REGISTRY[slug];
    if (!scraper) {
        console.warn(`  -> ${name}: no scraper in SCRAPER_REGISTRY for key "${slug}", skipping`);
        return [];
    }

    const allJobs: AtsJob[] = [];
    let totalRaw = 0, totalPassedFilter = 0, totalPassedScorer = 0;
    let consecutive429 = 0;
    let circuitBroken = false;

    // Build tasks - one per company
    const tasks = entries.map(([companyId, companyName]) => async (): Promise<AtsJob[]> => {
        if (circuitBroken) return [];
        try {
            const proxies = process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',').map(p => p.trim()).filter(Boolean) : undefined;
            const input = new ScraperInputDto({
                companySlug: companyId,
                searchTerm: 'fresher intern "entry level" "new grad" apprentice junior associate trainee campus graduate "early career" SDE',
                location: 'India',
                resultsWanted: 50,
                requestTimeout: 4, // 4-second timeout per company
                descriptionFormat: 'PLAIN' as any,
                proxies,
            });

            const response = await scraper.scrape(input);
            consecutive429 = 0; // Reset on success

            const jobs = response?.jobs ?? [];
            totalRaw += jobs.length;

            // Convert JobPostDto[] → AtsJob[] using shared converter
            const atsJobs = jobs.map(j => toAtsJob(j, slug, companyName, 'ATS'));

            // Filter: fresher + India/remote + experience check
            const fresherJobs = atsJobs.filter((j: AtsJob) => {
                if (!isPotentialFresherJob(j.title)) return false;
                if (!isLocationIndiaOrRemote(j.location || '', j.title)) return false;
                if (j.experienceYears !== undefined && j.experienceYears !== null && j.experienceYears > 2) return false;
                if (j.experienceRange) {
                    const match = j.experienceRange.match(/(\d+)/);
                    if (match && parseInt(match[1], 10) > 2) return false;
                }
                return true;
            });
            totalPassedFilter += fresherJobs.length;

            // Dedup against known links
            const validJobs = fresherJobs.filter(job => {
                const normalizedLink = normalizeUrl(job.applyLink);
                return !knownLinks.has(normalizedLink) && !visitedSet.has(normalizedLink);
            });

            const finalJobs: AtsJob[] = [];
            let rejectedCount = 0;
            for (const job of validJobs) {
                if (job.description) {
                    const scoreResult = scoreJobDescription(job.title, job.description);
                    if (scoreResult.verdict === 'REJECT') {
                        rejectedCount++;
                        continue;
                    }
                }
                finalJobs.push(job);
            }
            totalPassedScorer += finalJobs.length;

            if (finalJobs.length > 0) {
                console.log(`  -> ${companyName}: ${jobs.length} total, ${fresherJobs.length} fresher, ${finalJobs.length} passed scorer`);
            }
            return finalJobs;
        } catch (err: any) {
            const isRateLimit = err.message?.includes('429') || err.message?.includes('rate-limit') || err.message?.includes('Too Many Requests');
            if (isRateLimit) {
                consecutive429++;
                if (consecutive429 >= 3) {
                    circuitBroken = true;
                    console.log(`  -> ⚠️ ${name} rate-limit circuit breaker triggered (3 consecutive 429s). Moving to next provider.`);
                }
            }
            return [];
        }
    });

    // Run with high concurrency (8) to finish rapidly
    const results = await withConcurrency(tasks, 8);
    for (const r of results) allJobs.push(...r);

    stats.ats_raw[name] = totalRaw;
    stats.ats_passed_filter[name] = totalPassedFilter;
    stats.ats_passed_scorer[name] = totalPassedScorer;

    return allJobs;
}

/**
 * Main discovery entry point.
 * Loads company slugs from CDN registry and runs all providers with a 60s timeout per provider.
 */
export async function runAtsDiscovery(
    registry: AtsRegistry,
    stats: any,
    knownLinks: Set<string>,
    visitedApplyLinks: string[]
): Promise<AtsJob[]> {
    console.log(`\n--- Starting ATS Direct Discovery (parallel, 60s timeout per provider) ---`);
    const visitedSet = new Set(visitedApplyLinks);

    const providerFilter = process.env.ATS_PROVIDER?.toLowerCase().trim();
    const activeProviders = Object.entries(registry).filter(([key, data]) => {
        if (!data || Object.keys(data).length === 0) return false;
        if (providerFilter && key.toLowerCase() !== providerFilter) return false;
        return SCRAPER_REGISTRY[key] !== undefined;
    });

    console.log(`  Running ${activeProviders.length} providers in parallel...`);

    // Run all providers concurrently with a 60-second timeout per provider
    const providerSettled = await Promise.allSettled(
        activeProviders.map(([key, data]) => {
            const providerTask = runProvider(key, key, data!, stats, knownLinks, visitedSet);
            const timeoutTask = new Promise<AtsJob[]>((resolve) =>
                setTimeout(() => {
                    console.log(`  ⏱️ Provider ${key} reached 60s timeout, moving on.`);
                    resolve([]);
                }, 60000)
            );
            return Promise.race([providerTask, timeoutTask]);
        })
    );

    const allJobs: AtsJob[] = [];
    for (const result of providerSettled) {
        if (result.status === 'fulfilled') {
            allJobs.push(...result.value);
        }
    }
    console.log(`\n--- ATS Discovery Finished. Total roles found: ${allJobs.length} ---`);
    return allJobs;
}

/**
 * Runs direct company scrapers for top tech employers (Google, Amazon, Microsoft, IBM, Apple, Uber, Stripe, Meta, Nvidia).
 */
export async function runDirectCompanyDiscovery(
    knownLinks: Set<string>,
    visitedApplyLinks: string[]
): Promise<AtsJob[]> {
    console.log(`\n--- Starting Direct Company Scrapers (Google, Amazon, Microsoft, IBM, Apple, Uber, Stripe, Meta, Nvidia) ---`);
    const visitedSet = new Set(visitedApplyLinks);
    const companyKeys = Array.from(COMPANY_PROVIDER_SET);

    const tasks = companyKeys.map((key) => async () => {
        try {
            console.log(`  -> Scraping ${key}...`);
            const adapter = PLUGIN_REGISTRY[key];
            if (!adapter) return [];

            const jobs = await adapter.fetchJobs(key, key.toUpperCase());
            const fresherJobs = jobs.filter(job => {
                if (!job.title || job.title === 'Unknown Title') return false;
                if (!isLocationIndiaOrRemote(job.location || '', job.title)) return false;
                if (isSeniorJob(`${job.title} ${job.description || ''}`)) return false;
                return true;
            });

            const finalJobs = fresherJobs.filter(job => {
                const norm = normalizeUrl(job.applyLink);
                return !knownLinks.has(norm) && !visitedSet.has(norm);
            });

            console.log(`     ✅ ${key}: Scraped ${jobs.length} jobs, ${finalJobs.length} eligible fresher jobs`);
            return finalJobs;
        } catch (e: any) {
            console.warn(`     ⚠️ ${key} scrape notice: ${e.message}`);
            return [];
        }
    });

    const results = await withConcurrency(tasks, 4);
    const allCompanyJobs: AtsJob[] = [];
    for (const r of results) allCompanyJobs.push(...r);

    console.log(`\n--- Direct Company Scrapers Finished. Total roles: ${allCompanyJobs.length} ---`);
    return allCompanyJobs;
}

