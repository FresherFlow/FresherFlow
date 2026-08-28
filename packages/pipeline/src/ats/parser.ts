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
    const entries = Object.entries(companies);
    if (entries.length === 0) return [];

    const partitionCount = parseInt(process.env.ATS_PARTITION_COUNT || '4', 10);
    let partitionIndex = 0;
    if (process.env.ATS_PARTITION_INDEX !== undefined) {
        partitionIndex = parseInt(process.env.ATS_PARTITION_INDEX, 10);
    } else if (partitionCount === 4) {
        // Scheduled crons are at: 04:30, 08:30, 12:30, 16:30 UTC
        const hour = new Date().getUTCHours();
        if (hour >= 2 && hour < 7) partitionIndex = 0;
        else if (hour >= 7 && hour < 11) partitionIndex = 1;
        else if (hour >= 11 && hour < 15) partitionIndex = 2;
        else partitionIndex = 3;
    } else {
        const hour = new Date().getUTCHours();
        partitionIndex = Math.floor((hour / 24) * partitionCount) % partitionCount;
    }

    const shouldPartition = process.env.ATS_PARTITION_ENABLED === 'true' || process.env.CI === 'true';
    const targetEntries = shouldPartition
        ? entries.filter((_, idx) => (idx % partitionCount) === partitionIndex)
        : entries;

    console.log(`\nStarting ${name} adapter (${targetEntries.length}/${entries.length} companies${shouldPartition ? ` [partition ${partitionIndex + 1}/${partitionCount}]` : ''})...`);

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
    const tasks = targetEntries.map(([companyId, companyName]) => async (): Promise<AtsJob[]> => {
        if (circuitBroken) return [];
        try {
            const proxies = process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',').map(p => p.trim()).filter(Boolean) : undefined;
            const input = new ScraperInputDto({
                companySlug: companyId,
                location: 'India',
                resultsWanted: 50,
                requestTimeout: 3, // 3-second fast timeout per company
                descriptionFormat: 'PLAIN' as any,
                proxies,
            });

            const response = await scraper.scrape(input);
            consecutive429 = 0; // Reset on success

            const jobs = response?.jobs ?? [];
            totalRaw += jobs.length;

            // Convert JobPostDto[] → AtsJob[] using shared converter
            const atsJobs = jobs.map(j => toAtsJob(j, slug, companyName, 'ATS'));

            // Title-first fast filter: fresher + India/remote + not senior
            const fresherJobs = atsJobs.filter((j: AtsJob) => {
                if (!j.title || j.title === 'Unknown Title') return false;
                if (isSeniorJob(`${j.title} ${j.description || ''}`)) return false;
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
            for (const job of validJobs) {
                if (job.description) {
                    const scoreResult = scoreJobDescription(job.title, job.description);
                    if (scoreResult.verdict === 'REJECT') continue;
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

    // Run with high concurrency (20) to process hundreds of companies rapidly
    const results = await withConcurrency(tasks, 20);
    for (const r of results) allJobs.push(...r);

    stats.ats_raw[name] = totalRaw;
    stats.ats_passed_filter[name] = totalPassedFilter;
    stats.ats_passed_scorer[name] = totalPassedScorer;

    return allJobs;
}

/**
 * Main discovery entry point.
 * Loads company slugs from CDN registry and runs all providers with a 300s timeout per provider.
 */
export async function runAtsDiscovery(
    registry: AtsRegistry,
    stats: any,
    knownLinks: Set<string>,
    visitedApplyLinks: string[]
): Promise<AtsJob[]> {
    console.log(`\n--- Starting ATS Direct Discovery (parallel, 300s max per provider) ---`);
    const visitedSet = new Set(visitedApplyLinks);

    const providerFilter = process.env.ATS_PROVIDER?.toLowerCase().trim();
    const activeProviders = Object.entries(registry).filter(([key, data]) => {
        if (!data || Object.keys(data).length === 0) return false;
        if (providerFilter && key.toLowerCase() !== providerFilter) return false;
        return SCRAPER_REGISTRY[key] !== undefined;
    });

    console.log(`  Running ${activeProviders.length} providers in parallel...`);

    // Run all providers concurrently with a 300-second timeout per provider
    const providerSettled = await Promise.allSettled(
        activeProviders.map(([key, data]) => {
            const providerTask = runProvider(key, key, data!, stats, knownLinks, visitedSet);
            const timeoutTask = new Promise<AtsJob[]>((resolve) =>
                setTimeout(() => {
                    console.log(`  ⏱️ Provider ${key} reached 300s timeout, moving on.`);
                    resolve([]);
                }, 300000)
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

