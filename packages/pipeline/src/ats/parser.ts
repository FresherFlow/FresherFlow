import {
    AtsJob,
    sleep,
    SCRAPER_REGISTRY,
    ScraperInputDto,
    toAtsJob,
} from '@fresherflow/plugins';

import { isPotentialFresherJob, isLocationIndiaOrRemote, scoreJobDescription } from '@fresherflow/domain';
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

    console.log(`\nStarting ${name} adapter (${entries.length} companies)...`);

    const scraper = SCRAPER_REGISTRY[slug];
    if (!scraper) {
        console.warn(`  -> ${name}: no scraper in SCRAPER_REGISTRY for key "${slug}", skipping`);
        return [];
    }

    const allJobs: AtsJob[] = [];
    let totalRaw = 0, totalPassedFilter = 0, totalPassedScorer = 0;

    // Build tasks - one per company
    const tasks = entries.map(([companyId, companyName]) => async (): Promise<AtsJob[]> => {
        try {
            const proxies = process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',').map(p => p.trim()).filter(Boolean) : undefined;                // ScraperInputDto - same pattern as ever-jobs JobsService
                const input = new ScraperInputDto({
                    companySlug: companyId,
                    searchTerm: 'fresher intern "entry level" "new grad" apprentice junior associate trainee campus graduate "early career" SDE',
                    location: 'India',
                    resultsWanted: 50,
                    descriptionFormat: 'PLAIN' as any,
                    proxies,
                });

            const response = await scraper.scrape(input);
            const jobs = response?.jobs ?? [];
            totalRaw += jobs.length;

            // Convert JobPostDto[] → AtsJob[] using shared converter
            const atsJobs = jobs.map(j => toAtsJob(j, slug, companyName, 'ATS'));

            // Filter: fresher + India/remote + experience check
            const fresherJobs = atsJobs.filter((j: AtsJob) => {
                if (!isPotentialFresherJob(j.title)) return false;
                if (!isLocationIndiaOrRemote(j.location || '', j.title)) return false;
                // Skip jobs with experience > 2 years (fresher gate matches processor Zod schema)
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

            // Score — but only if descriptions are per-job (not company-level duplicates)
            let rejectedCount = 0;
            let boilerplateSkipped = 0;
            const finalJobs: AtsJob[] = [];
            
            // Detect company-level boilerplate descriptions:
            // If 80%+ of jobs share the same description text, it's a company overview,
            // not per-job content — skip scoring to avoid false rejections.
            const descTexts = validJobs.map(j => (j.description || '').trim());
            const descLengths = descTexts.map(t => t.length).filter(l => l > 0);
            let descriptionsReliable = true;
            if (descLengths.length >= 3) {
                const descBuckets = new Map<string, number>();
                for (const t of descTexts) {
                    if (!t) continue;
                    // Normalize: collapse whitespace, take first 500 chars for comparison
                    const key = t.substring(0, 500).replace(/\s+/g, ' ').trim();
                    descBuckets.set(key, (descBuckets.get(key) || 0) + 1);
                }
                const maxCount = Math.max(...descBuckets.values());
                const totalWithDesc = descTexts.filter(t => t.length > 0).length;
                // If one description variant covers 80%+ of jobs, treat as boilerplate
                if (maxCount >= Math.ceil(totalWithDesc * 0.8)) {
                    descriptionsReliable = false;
                    console.log(`  -> ${companyName}: ${maxCount}/${totalWithDesc} jobs share same description (boilerplate) — skipping scorer`);
                }
            }
            
            for (const job of validJobs) {
                if (job.description && descriptionsReliable) {
                    const scoreResult = scoreJobDescription(job.title, job.description);
                    if (scoreResult.verdict === 'REJECT') {
                        rejectedCount++;
                        continue;
                    }
                } else if (!descriptionsReliable && job.description) {
                    boilerplateSkipped++;
                }
                finalJobs.push(job);
            }
            totalPassedScorer += finalJobs.length;

            const boilerplateMsg = boilerplateSkipped > 0 ? `, ${boilerplateSkipped} boilerplate skipped` : '';
            console.log(`  -> ${companyName}: ${jobs.length} total, ${fresherJobs.length} passed filter, ${finalJobs.length} passed scorer (${rejectedCount} rejected${boilerplateMsg})`);
            return finalJobs;
        } catch (err: any) {
            console.warn(`  -> ${companyName}: error - ${err.message}`);
            return [];
        }
    });

    // Run with concurrency — lower for providers with many companies to avoid DNS flooding
    const providerConcurrency = entries.length > 200 ? 2 : 5;
    const results = await withConcurrency(tasks, providerConcurrency);
    for (const r of results) allJobs.push(...r);

    stats.ats_raw[name] = totalRaw;
    stats.ats_passed_filter[name] = totalPassedFilter;
    stats.ats_passed_scorer[name] = totalPassedScorer;

    return allJobs;
}

/**
 * Main discovery entry point.
 * Uses SCRAPER_REGISTRY from @fresherflow/plugins — no hardcoded adapter list.
 * Loads company slugs from CDN registry and runs all providers in parallel.
 */
export async function runAtsDiscovery(
    registry: AtsRegistry,
    stats: any,
    knownLinks: Set<string>,
    visitedApplyLinks: string[]
): Promise<AtsJob[]> {
    console.log(`\n--- Starting ATS Direct Discovery (parallel) ---`);
    console.log(`  SCRAPER_REGISTRY has ${Object.keys(SCRAPER_REGISTRY).length} scrapers`);
    console.log(`  Registry has ${Object.keys(registry).length} providers with data`);
    const visitedSet = new Set(visitedApplyLinks);

    // Filter to only providers that have data in the registry AND a scraper registered
    const providerFilter = process.env.ATS_PROVIDER?.toLowerCase().trim();
    const activeProviders = Object.entries(registry).filter(([key, data]) => {
        if (!data || Object.keys(data).length === 0) return false;
        if (providerFilter && key.toLowerCase() !== providerFilter) return false;
        return SCRAPER_REGISTRY[key] !== undefined;
    });

    if (providerFilter) {
        console.log(`--- Running SINGLE provider: ${providerFilter} ---`);
    }

    console.log(`  Running ${activeProviders.length} providers in parallel...`);

    // Run all providers concurrently — use allSettled so one provider crash doesn't kill the run
    const providerSettled = await Promise.allSettled(
        activeProviders.map(([key, data]) =>
            runProvider(key, key, data!, stats, knownLinks, visitedSet)
        )
    );

    const allJobs: AtsJob[] = [];
    for (const result of providerSettled) {
        if (result.status === 'fulfilled') {
            allJobs.push(...result.value);
        } else {
            console.error(`Provider crashed: ${result.reason?.message ?? result.reason}`);
        }
    }
    console.log(`\n--- ATS Discovery Finished. Total potential roles: ${allJobs.length} ---`);
    return allJobs;
}

