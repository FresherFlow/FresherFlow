import { LeverAdapter } from '../job-discovery/src/ats/LeverAdapter.ts';
import { GreenhouseAdapter } from '../job-discovery/src/ats/GreenhouseAdapter.ts';
import { isPotentialFresherJob, isLocationIndiaOrRemote } from '../job-discovery/src/filters/ats-filters.ts';
import { isFresherJob } from '../job-discovery/src/filters/text-filters.ts';
import * as cheerio from 'cheerio';

async function deepCheck(companyName: string, companyId: string, adapterClass: any) {
    console.log(`\n======================================`);
    console.log(`Deep Checking: ${companyName}`);
    console.log(`======================================`);
    
    const adapter = new adapterClass();
    const jobs = await adapter.fetchJobs(companyId, companyName);
    
    console.log(`Total jobs on board: ${jobs.length}`);
    
    const potentialFreshers = jobs.filter(j => 
        isPotentialFresherJob(j.title) && 
        (!j.location || isLocationIndiaOrRemote(j.location))
    );
    console.log(`Passed Title & Location Filter: ${potentialFreshers.length}`);
    
    if (potentialFreshers.length === 0) return;

    let passedTextFilter = 0;
    let failedTextFilter = 0;
    const trueFreshers = [];
    
    const sampleSize = Math.min(10, potentialFreshers.length);
    console.log(`\nSample check of ${sampleSize} jobs for text validity...`);
    
    for (let i = 0; i < sampleSize; i++) {
        const job = potentialFreshers[i];
        try {
            const res = await fetch(job.applyLink);
            if (!res.ok) {
                console.log(`[DEAD LINK] ${job.title} - ${job.applyLink}`);
                continue;
            }
            
            const html = await res.text();
            const $ = cheerio.load(html);
            const text = $('#content').text() || $('.posting-wrapper').text() || $('body').text();
            
            if (isFresherJob(text)) {
                passedTextFilter++;
                trueFreshers.push(job.title);
                console.log(`[PASS TEXT] ${job.title}`);
            } else {
                failedTextFilter++;
                console.log(`[FAIL TEXT] ${job.title} (Found senior/mid-level keywords in text)`);
            }
        } catch (e) {
            console.error(`Error fetching ${job.title}`);
        }
    }
    
    console.log(`\nSummary for ${companyName}:`);
    console.log(`Failed Phase 1 Text Filter: ${failedTextFilter}`);
    console.log(`Passed Phase 1 Text Filter: ${passedTextFilter}`);
}

async function runAll() {
    await deepCheck('Binance', 'binance', LeverAdapter);
    await deepCheck('Capco', 'capco', GreenhouseAdapter);
    await deepCheck('Sezzle', 'sezzle', GreenhouseAdapter);
    await deepCheck('Glean', 'glean', GreenhouseAdapter);
}

runAll().catch(console.error);
