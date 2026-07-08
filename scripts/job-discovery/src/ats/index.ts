import { AtsJob } from './BaseAdapter.js';
import { GreenhouseAdapter } from './GreenhouseAdapter.js';
import { LeverAdapter } from './LeverAdapter.js';
import { WorkdayAdapter } from './WorkdayAdapter.js';
import { AshbyAdapter } from './AshbyAdapter.js';
import { SmartRecruitersAdapter } from './SmartRecruitersAdapter.js';
import { OracleAdapter } from './OracleAdapter.js';
import { ICimsAdapter } from './ICimsAdapter.js';
import { SuccessFactorsAdapter } from './SuccessFactorsAdapter.js';
import { isPotentialFresherJob, isLocationIndiaOrRemote } from '../filters/ats-filters.js';

export interface AtsRegistry {
    [key: string]: Record<string, string> | undefined;
    greenhouse?: Record<string, string>;
    lever?: Record<string, string>;
    workday?: Record<string, string>;
    ashby?: Record<string, string>;
    smartrecruiters?: Record<string, string>;
    oracle?: Record<string, string>;
    icims?: Record<string, string>;
    successfactors?: Record<string, string>;
}

export async function runAtsDiscovery(registry: AtsRegistry): Promise<AtsJob[]> {
    console.log(`\n--- Starting ATS Direct Discovery ---`);
    const discoveredJobs: AtsJob[] = [];
    
    const adapters = [
        { name: 'Greenhouse', adapter: new GreenhouseAdapter(), data: registry.greenhouse, delay: 1000 },
        { name: 'Lever', adapter: new LeverAdapter(), data: registry.lever, delay: 1000 },
        { name: 'Workday', adapter: new WorkdayAdapter(), data: registry.workday, delay: 2000 },
        { name: 'Ashby', adapter: new AshbyAdapter(), data: registry.ashby, delay: 1000 },
        { name: 'SmartRecruiters', adapter: new SmartRecruitersAdapter(), data: registry.smartrecruiters, delay: 1000 },
        { name: 'Oracle', adapter: new OracleAdapter(), data: registry.oracle, delay: 1000 },
        { name: 'iCIMS', adapter: new ICimsAdapter(), data: registry.icims, delay: 1000 },
        { name: 'SuccessFactors', adapter: new SuccessFactorsAdapter(), data: registry.successfactors, delay: 1500 }
    ];

    for (const { name, adapter, data, delay } of adapters) {
        if (data && Object.keys(data).length > 0) {
            console.log(`\nStarting ${name} adapter (${Object.keys(data).length} companies)...`);
            for (const [companyId, companyName] of Object.entries(data)) {
                const jobs = await adapter.fetchJobs(companyId, companyName);
                let fresherJobs = jobs.filter(j => 
                    isPotentialFresherJob(j.title) && 
                    (!j.location || isLocationIndiaOrRemote(j.location))
                );
                if (fresherJobs.length === 0 && jobs.length > 0) {
                    fresherJobs = [{ ...jobs[0], isTestBypass: true } as any];
                } else {
                    fresherJobs = fresherJobs.slice(0, 2).map(j => ({ ...j, isTestBypass: true }));
                }
                console.log(`  -> ${companyName}: Found ${jobs.length} total, using ${fresherJobs.length} for testing.`);
                discoveredJobs.push(...fresherJobs);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    console.log(`\n--- ATS Discovery Finished. Total potential roles: ${discoveredJobs.length} ---`);
    return discoveredJobs;
}

