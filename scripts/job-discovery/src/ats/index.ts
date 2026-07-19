import { AtsJob, sleep } from './BaseAdapter.js';
import { GreenhouseAdapter } from './GreenhouseAdapter.js';
import { LeverAdapter } from './LeverAdapter.js';
import { WorkdayAdapter } from './WorkdayAdapter.js';
import { AshbyAdapter } from './AshbyAdapter.js';
import { SmartRecruitersAdapter } from './SmartRecruitersAdapter.js';
import { OracleAdapter } from './OracleAdapter.js';
import { ICimsAdapter } from './ICimsAdapter.js';
import { SuccessFactorsAdapter } from './SuccessFactorsAdapter.js';
import { BambooHRAdapter } from './BambooHRAdapter.js';
import { RecruiteeAdapter } from './RecruiteeAdapter.js';
import { JobviteAdapter } from './JobviteAdapter.js';
import { TeamtailorAdapter } from './TeamtailorAdapter.js';
import { EightfoldAdapter } from './EightfoldAdapter.js';
import { DarwinBoxAdapter } from './DarwinBoxAdapter.js';
import { isPotentialFresherJob, isLocationIndiaOrRemote } from '../filters/ats-filters.js';
import { scoreJobDescription } from '../filters/scorer.js';
import type { RunStats } from '../pipeline/state.js';
import { normalizeUrl } from '../utils/url.js';

export interface AtsRegistry {
    [key: string]: Record<string, string> | undefined;
    // Phase 1
    greenhouse?: Record<string, string>;
    lever?: Record<string, string>;
    workday?: Record<string, string>;
    ashby?: Record<string, string>;
    ashbyhq?: Record<string, string>;
    smartrecruiters?: Record<string, string>;
    oracle?: Record<string, string>;
    icims?: Record<string, string>;
    successfactors?: Record<string, string>;
    // Phase 2
    bamboohr?: Record<string, string>;
    recruitee?: Record<string, string>;
    jobvite?: Record<string, string>;
    teamtailor?: Record<string, string>;
    eightfold?: Record<string, string>;
    darwinbox?: Record<string, string>;
}

// ─── Simple concurrency limiter ───────────────────────────────────────────────
export async function withConcurrency<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results: T[] = [];
    const queue = [...tasks];

    async function worker() {
        while (queue.length > 0) {
            const task = queue.shift()!;
            results.push(await task());
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
    return results;
}

// ─── Per-provider runner ──────────────────────────────────────────────────────
async function runProvider(
    name: string,
    adapter: import('./BaseAdapter.js').AtsAdapter,
    data: Record<string, string>,
    delay: number,
    companyConcurrency: number,
    stats: RunStats,
    knownLinks: Set<string>,
    visitedSet: Set<string>
): Promise<AtsJob[]> {
    const companies = Object.entries(data);
    if (companies.length === 0) return [];

    console.log(`\nStarting ${name} adapter (${companies.length} companies)...`);

    const allJobs: AtsJob[] = [];
    let totalRaw = 0, totalPassedFilter = 0, totalPassedScorer = 0;

    const tasks = companies.map(([companyId, companyName]) => async (): Promise<AtsJob> => {
        const jobs = await adapter.fetchJobs(companyId, companyName);
        totalRaw += jobs.length;

        const fresherJobs = jobs.filter(j =>
            isPotentialFresherJob(j.title) &&
            (!j.location || isLocationIndiaOrRemote(j.location))
        );
        totalPassedFilter += fresherJobs.length;

        const finalJobs: AtsJob[] = [];
        let rejectedCount = 0;

        for (const job of fresherJobs) {
            const normalizedLink = normalizeUrl(job.applyLink);
            if (knownLinks.has(normalizedLink) || visitedSet.has(normalizedLink)) {
                // Skip already known jobs early to avoid details fetch and NLP scoring
                continue;
            }

            if (!job.description && adapter.fetchJobDetails) {
                try {
                    const desc = await adapter.fetchJobDetails(job);
                    if (desc) {
                        job.description = desc;
                        job.descriptionSource = 'API';
                    }
                } catch {
                    // ignore details fetch failure
                }
                await sleep(delay);
            }

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

        console.log(`  -> ${companyName}: ${jobs.length} total, ${fresherJobs.length} passed filter, ${finalJobs.length} passed scorer (${rejectedCount} rejected)`);
        allJobs.push(...finalJobs);
        await sleep(delay);

        return null as unknown as AtsJob;
    });

    await withConcurrency(tasks, companyConcurrency);

    // Write per-provider stats
    stats.ats_raw[name] = totalRaw;
    stats.ats_passed_filter[name] = totalPassedFilter;
    stats.ats_passed_scorer[name] = totalPassedScorer;

    return allJobs;
}

// ─── Main entry ───────────────────────────────────────────────────────────────
export async function runAtsDiscovery(
    registry: AtsRegistry,
    stats: RunStats,
    knownLinks: Set<string>,
    visitedApplyLinks: string[]
): Promise<AtsJob[]> {
    console.log(`\n--- Starting ATS Direct Discovery (parallel) ---`);
    const visitedSet = new Set(visitedApplyLinks);

    const adapters: Array<{
        name: string;
        adapter: import('./BaseAdapter.js').AtsAdapter;
        data?: Record<string, string>;
        delay: number;
        companyConcurrency: number;
    }> = [
        // ── Phase 1 ──────────────────────────────────────────────────────────
        { name: 'Greenhouse',       adapter: new GreenhouseAdapter(),      data: registry.greenhouse,     delay: 800,  companyConcurrency: 4 },
        { name: 'Lever',            adapter: new LeverAdapter(),           data: registry.lever,          delay: 800,  companyConcurrency: 4 },
        { name: 'Workday',          adapter: new WorkdayAdapter(),         data: registry.workday,        delay: 2000, companyConcurrency: 5 },
        { name: 'Ashby',            adapter: new AshbyAdapter(),           data: registry.ashby ?? registry.ashbyhq, delay: 800, companyConcurrency: 4 },
        { name: 'SmartRecruiters',  adapter: new SmartRecruitersAdapter(), data: registry.smartrecruiters, delay: 800, companyConcurrency: 4 },
        { name: 'Oracle',           adapter: new OracleAdapter(),          data: registry.oracle,         delay: 1000, companyConcurrency: 4 },
        { name: 'iCIMS',            adapter: new ICimsAdapter(),           data: registry.icims,          delay: 1000, companyConcurrency: 4 },
        { name: 'SuccessFactors',   adapter: new SuccessFactorsAdapter(),  data: registry.successfactors, delay: 1500, companyConcurrency: 4 },
        // ── Phase 2 ──────────────────────────────────────────────────────────
        { name: 'BambooHR',         adapter: new BambooHRAdapter(),        data: registry.bamboohr,       delay: 800,  companyConcurrency: 4 },
        { name: 'Recruitee',        adapter: new RecruiteeAdapter(),       data: registry.recruitee,      delay: 800,  companyConcurrency: 4 },
        { name: 'Jobvite',          adapter: new JobviteAdapter(),         data: registry.jobvite,        delay: 800,  companyConcurrency: 4 },
        { name: 'Teamtailor',       adapter: new TeamtailorAdapter(),      data: registry.teamtailor,     delay: 800,  companyConcurrency: 4 },
        { name: 'Eightfold',        adapter: new EightfoldAdapter(),       data: registry.eightfold,      delay: 1000, companyConcurrency: 3 },
        { name: 'DarwinBox',        adapter: new DarwinBoxAdapter(),       data: registry.darwinbox,      delay: 1000, companyConcurrency: 3 },
    ];

    const providerFilter = process.env.ATS_PROVIDER?.toLowerCase().trim();
    const activeAdapters = adapters.filter(a => {
        if (!a.data || Object.keys(a.data).length === 0) return false;
        if (providerFilter && a.name.toLowerCase() !== providerFilter) return false;
        return true;
    });

    if (providerFilter) {
        console.log(`--- Running SINGLE provider: ${providerFilter} ---`);
    }

    // Run ALL providers in parallel — pass stats so each provider records its own counts
    const providerResults = await Promise.all(
        activeAdapters.map(({ name, adapter, data, delay, companyConcurrency }) =>
            runProvider(name, adapter, data!, delay, companyConcurrency, stats, knownLinks, visitedSet)
        )
    );

    const allJobs = providerResults.flat();
    console.log(`\n--- ATS Discovery Finished. Total potential roles: ${allJobs.length} ---`);
    return allJobs;
}
