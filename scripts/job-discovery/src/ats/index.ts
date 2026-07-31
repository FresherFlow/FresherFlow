import {
    AtsJob,
    AtsAdapter,
    sleep,
    GreenhouseAdapter,
    LeverAdapter,
    WorkdayAdapter,
    AshbyAdapter,
    SmartRecruitersAdapter,
    OracleAdapter,
    ICimsAdapter,
    SuccessFactorsAdapter,
    RecruiteeAdapter,
    WorkableAdapter,
    DarwinboxAdapter,
    KekaAdapter,
    FreshteamAdapter,
    ZohoRecruitAdapter,
    GreythrAdapter,
    HROneAdapter,
    PeoplestrongAdapter,
    TurboHireAdapter,
    OorwinAdapter,
    ZimyoAdapter,
    ZwayamAdapter,
    ISmartRecruitAdapter,
    BambooHRAdapter,
    BreezyHRAdapter,
    PersonioAdapter,
    JobviteAdapter,
    TaleoAdapter,
    PyjamaHRAdapter,
    CeipalAdapter,
    RecruitCrmAdapter,
    RecruiterflowAdapter,
    SnaphuntAdapter,
    MercorAdapter,
    EightfoldAdapter,
    PhenomAdapter,
    BullhornAdapter,
    InternshalaAdapter,
    HasjobAdapter,
    IndeedAdapter,
    LinkedinAdapter,
    GlassdoorAdapter,
    BaytAdapter,
    WellfoundAdapter,
    HackerNewsAdapter,
    RemoteOkAdapter,
    WeWorkRemotelyAdapter,

    GoogleAdapter,
    AmazonAdapter,
    MicrosoftAdapter,
    IbmAdapter,
    AppleAdapter,
    UberAdapter,
    StripeAdapter,
    MetaAdapter,
} from '@fresherflow/plugins';

import { isPotentialFresherJob, isLocationIndiaOrRemote } from '../filters/ats-filters.js';
import { scoreJobDescription } from '../filters/scorer.js';
import type { RunStats } from '../pipeline/state.js';
import { normalizeUrl } from '../utils/url.js';

export interface AtsRegistry {
    [key: string]: Record<string, string> | undefined;
    greenhouse?: Record<string, string>;
    lever?: Record<string, string>;
    workday?: Record<string, string>;
    ashby?: Record<string, string>;
    ashbyhq?: Record<string, string>;
    smartrecruiters?: Record<string, string>;
    oracle?: Record<string, string>;
    icims?: Record<string, string>;
    successfactors?: Record<string, string>;
    recruitee?: Record<string, string>;
    workable?: Record<string, string>;
    darwinbox?: Record<string, string>;
    keka?: Record<string, string>;
    freshteam?: Record<string, string>;
    zohorecruit?: Record<string, string>;
    greythr?: Record<string, string>;
    peoplestrong?: Record<string, string>;
    hrone?: Record<string, string>;
    turbohire?: Record<string, string>;
    oorwin?: Record<string, string>;
    zimyo?: Record<string, string>;
    zwayam?: Record<string, string>;
    ismartrecruit?: Record<string, string>;
    bamboohr?: Record<string, string>;
    breezyhr?: Record<string, string>;
    personio?: Record<string, string>;
    jobvite?: Record<string, string>;
    taleo?: Record<string, string>;
    pyjamahr?: Record<string, string>;
    ceipal?: Record<string, string>;
    recruitcrm?: Record<string, string>;
    recruiterflow?: Record<string, string>;
    snaphunt?: Record<string, string>;
    mercor?: Record<string, string>;
    eightfold?: Record<string, string>;
    phenom?: Record<string, string>;
    bullhorn?: Record<string, string>;
    internshala?: Record<string, string>;
    hasjob?: Record<string, string>;
    indeed?: Record<string, string>;
    linkedin?: Record<string, string>;
    glassdoor?: Record<string, string>;
    bayt?: Record<string, string>;
    wellfound?: Record<string, string>;
    hackernews?: Record<string, string>;
    remoteok?: Record<string, string>;
    weworkremotely?: Record<string, string>;
    google?: Record<string, string>;
    amazon?: Record<string, string>;
    microsoft?: Record<string, string>;
    ibm?: Record<string, string>;
    tiktok?: Record<string, string>;
    apple?: Record<string, string>;
    uber?: Record<string, string>;
    stripe?: Record<string, string>;
    meta?: Record<string, string>;
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
            results.push(await task());
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
    return results;
}

async function runProvider(
    name: string,
    adapter: AtsAdapter,
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

        const fresherJobs = jobs.filter((j: AtsJob) =>
            isPotentialFresherJob(j.title) &&
            isLocationIndiaOrRemote(j.location || '', j.title)
        );
        totalPassedFilter += fresherJobs.length;

        const finalJobs: AtsJob[] = [];
        let rejectedCount = 0;

        for (const job of fresherJobs) {
            const normalizedLink = normalizeUrl(job.applyLink);
            if (knownLinks.has(normalizedLink) || visitedSet.has(normalizedLink)) {
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

    stats.ats_raw[name] = totalRaw;
    stats.ats_passed_filter[name] = totalPassedFilter;
    stats.ats_passed_scorer[name] = totalPassedScorer;

    return allJobs;
}

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
        adapter: AtsAdapter;
        data?: Record<string, string>;
        delay: number;
        companyConcurrency: number;
    }> = [
        { name: 'Greenhouse',      adapter: new GreenhouseAdapter(),      data: registry.greenhouse,                        delay: 800,  companyConcurrency: 4 },
        { name: 'Lever',           adapter: new LeverAdapter(),           data: registry.lever,                             delay: 800,  companyConcurrency: 4 },
        { name: 'Workday',         adapter: new WorkdayAdapter(),         data: registry.workday,                           delay: 2000, companyConcurrency: 5 },
        { name: 'Ashby',           adapter: new AshbyAdapter(),           data: registry.ashby ?? registry.ashbyhq,         delay: 800,  companyConcurrency: 4 },
        { name: 'SmartRecruiters', adapter: new SmartRecruitersAdapter(), data: registry.smartrecruiters,                   delay: 800,  companyConcurrency: 4 },
        { name: 'Oracle',          adapter: new OracleAdapter(),          data: registry.oracle,                            delay: 1000, companyConcurrency: 4 },
        { name: 'iCIMS',           adapter: new ICimsAdapter(),           data: registry.icims,                             delay: 1000, companyConcurrency: 4 },
        { name: 'SuccessFactors',  adapter: new SuccessFactorsAdapter(),  data: registry.successfactors,                    delay: 1500, companyConcurrency: 4 },
        { name: 'Recruitee',       adapter: new RecruiteeAdapter(),       data: registry.recruitee,                         delay: 800,  companyConcurrency: 4 },
        { name: 'Workable',        adapter: new WorkableAdapter(),        data: registry.workable,                          delay: 1000, companyConcurrency: 3 },
        { name: 'Darwinbox',       adapter: new DarwinboxAdapter(),       data: registry.darwinbox,                         delay: 800,  companyConcurrency: 4 },
        { name: 'Keka',            adapter: new KekaAdapter(),            data: registry.keka,                              delay: 800,  companyConcurrency: 4 },
        { name: 'Freshteam',       adapter: new FreshteamAdapter(),       data: registry.freshteam,                         delay: 800,  companyConcurrency: 4 },
        { name: 'ZohoRecruit',     adapter: new ZohoRecruitAdapter(),     data: registry.zohorecruit,                       delay: 800,  companyConcurrency: 4 },
        { name: 'GreytHR',         adapter: new GreythrAdapter(),         data: registry.greythr,                           delay: 800,  companyConcurrency: 4 },
        { name: 'HROne',           adapter: new HROneAdapter(),           data: registry.hrone,                             delay: 800,  companyConcurrency: 4 },
        { name: 'PeopleStrong',    adapter: new PeoplestrongAdapter(),    data: registry.peoplestrong,                      delay: 1000, companyConcurrency: 4 },
        { name: 'TurboHire',       adapter: new TurboHireAdapter(),       data: registry.turbohire,                         delay: 800,  companyConcurrency: 4 },
        { name: 'Oorwin',          adapter: new OorwinAdapter(),          data: registry.oorwin,                            delay: 800,  companyConcurrency: 4 },
        { name: 'Zimyo',           adapter: new ZimyoAdapter(),           data: registry.zimyo,                             delay: 800,  companyConcurrency: 4 },
        { name: 'Zwayam',          adapter: new ZwayamAdapter(),          data: registry.zwayam,                            delay: 800,  companyConcurrency: 4 },
        { name: 'iSmartRecruit',   adapter: new ISmartRecruitAdapter(),   data: registry.ismartrecruit,                     delay: 800,  companyConcurrency: 4 },
        { name: 'BambooHR',        adapter: new BambooHRAdapter(),        data: registry.bamboohr,                          delay: 800,  companyConcurrency: 4 },
        { name: 'BreezyHR',        adapter: new BreezyHRAdapter(),        data: registry.breezyhr,                          delay: 800,  companyConcurrency: 4 },
        { name: 'Personio',        adapter: new PersonioAdapter(),        data: registry.personio,                          delay: 800,  companyConcurrency: 4 },
        { name: 'Jobvite',         adapter: new JobviteAdapter(),         data: registry.jobvite,                           delay: 800,  companyConcurrency: 4 },
        { name: 'Taleo',           adapter: new TaleoAdapter(),           data: registry.taleo,                             delay: 1000, companyConcurrency: 4 },
        { name: 'PyjamaHR',        adapter: new PyjamaHRAdapter(),        data: registry.pyjamahr,                          delay: 800,  companyConcurrency: 4 },
        { name: 'Ceipal',          adapter: new CeipalAdapter(),          data: registry.ceipal,                            delay: 800,  companyConcurrency: 4 },
        { name: 'RecruitCRM',      adapter: new RecruitCrmAdapter(),      data: registry.recruitcrm,                        delay: 800,  companyConcurrency: 4 },
        { name: 'Recruiterflow',   adapter: new RecruiterflowAdapter(),   data: registry.recruiterflow,                     delay: 800,  companyConcurrency: 4 },
        { name: 'Snaphunt',        adapter: new SnaphuntAdapter(),        data: registry.snaphunt,                          delay: 800,  companyConcurrency: 4 },
        { name: 'Mercor',          adapter: new MercorAdapter(),          data: registry.mercor,                            delay: 800,  companyConcurrency: 4 },
        { name: 'Eightfold',       adapter: new EightfoldAdapter(),       data: registry.eightfold,                         delay: 800,  companyConcurrency: 4 },
        { name: 'Phenom',          adapter: new PhenomAdapter(),          data: registry.phenom,                            delay: 800,  companyConcurrency: 4 },
        { name: 'Internshala',     adapter: new InternshalaAdapter(),     data: registry.internshala,                       delay: 800,  companyConcurrency: 4 },
        { name: 'Hasjob',          adapter: new HasjobAdapter(),          data: registry.hasjob,                            delay: 800,  companyConcurrency: 4 },
        { name: 'Indeed',          adapter: new IndeedAdapter(),          data: registry.indeed,                            delay: 800,  companyConcurrency: 4 },
        { name: 'LinkedIn',        adapter: new LinkedinAdapter(),        data: registry.linkedin,                          delay: 800,  companyConcurrency: 4 },
        { name: 'Glassdoor',       adapter: new GlassdoorAdapter(),       data: registry.glassdoor,                         delay: 800,  companyConcurrency: 4 },
        { name: 'Bayt',            adapter: new BaytAdapter(),            data: registry.bayt,                              delay: 800,  companyConcurrency: 4 },
        { name: 'Google',          adapter: new GoogleAdapter(),          data: registry.google,                            delay: 800,  companyConcurrency: 4 },
        { name: 'Amazon',          adapter: new AmazonAdapter(),          data: registry.amazon,                            delay: 800,  companyConcurrency: 4 },
        { name: 'Microsoft',       adapter: new MicrosoftAdapter(),       data: registry.microsoft,                         delay: 800,  companyConcurrency: 4 },
        { name: 'IBM',             adapter: new IbmAdapter(),             data: registry.ibm,                               delay: 800,  companyConcurrency: 4 },        { name: 'Bullhorn',        adapter: new BullhornAdapter(),        data: registry.bullhorn,                          delay: 800,  companyConcurrency: 4 },
        { name: 'Wellfound',       adapter: new WellfoundAdapter(),       data: registry.wellfound,                         delay: 800,  companyConcurrency: 4 },
        { name: 'HackerNews',      adapter: new HackerNewsAdapter(),      data: registry.hackernews,                        delay: 800,  companyConcurrency: 4 },
        { name: 'RemoteOk',        adapter: new RemoteOkAdapter(),        data: registry.remoteok,                          delay: 800,  companyConcurrency: 4 },
        { name: 'WeWorkRemotely',  adapter: new WeWorkRemotelyAdapter(),  data: registry.weworkremotely,                    delay: 800,  companyConcurrency: 4 },
        { name: 'Apple',           adapter: new AppleAdapter(),           data: registry.apple,                             delay: 800,  companyConcurrency: 4 },
        { name: 'Uber',            adapter: new UberAdapter(),            data: registry.uber,                              delay: 800,  companyConcurrency: 4 },
        { name: 'Stripe',          adapter: new StripeAdapter(),          data: registry.stripe,                            delay: 800,  companyConcurrency: 4 },
        { name: 'Meta',            adapter: new MetaAdapter(),            data: registry.meta,                              delay: 800,  companyConcurrency: 4 },
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

    const providerResults = await Promise.all(
        activeAdapters.map(({ name, adapter, data, delay, companyConcurrency }) =>
            runProvider(name, adapter, data!, delay, companyConcurrency, stats, knownLinks, visitedSet)
        )
    );

    const allJobs = providerResults.flat();
    console.log(`\n--- ATS Discovery Finished. Total potential roles: ${allJobs.length} ---`);
    return allJobs;
}
