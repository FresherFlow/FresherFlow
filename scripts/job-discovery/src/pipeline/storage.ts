import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { DiscoveryState } from './state.js';
import { CDN_URL } from '../config.js';
import { uploadJsonToR2, listR2Objects } from '@fresherflow/utils/r2';
import { saveVisited, saveRejectedReasons } from '../utils/storage.js';
import { parseJobUrl } from '@fresherflow/parser';

import { withConcurrency } from '../ats/index.js';
import { upsertJobs } from '../repositories/discoveredJobs.js';
import { resolveAndAttachCompanies } from '../repositories/companies.js';
import { enrichJobPayload } from '../core/job-enricher.js';

export async function persistLocalData(state: DiscoveryState) {
    // Save local state files
    delete state.visited["pending_admin_approval"];
    await saveVisited(state.visited);
    await saveRejectedReasons(state.rejectedReasons);

    // Resolve companies against Supabase Company Registry
    await resolveAndAttachCompanies(state.newJobsFound, state.stats);

    const validRawJobs = state.newJobsFound.filter(j => !j.reviewRequired);
    const reviewJobs = state.newJobsFound.filter(j => j.reviewRequired);

    // Map all valid jobs through the templates.md enricher engine
    console.log(`\n--- Formatting ${validRawJobs.length} passed jobs into templates.md structure ---`);
    const validJobs = await Promise.all(validRawJobs.map(async job => {
        const enriched = await enrichJobPayload({
            title: job.title,
            company: job.company || 'Company',
            description: job.atsText || job.title,
            applyLink: job.applyLink,
            location: (job as any).location
        });
        return {
            ...job,
            payload: enriched
        };
    }));

    // Save ATS jobs to discovered_jobs.json
    const draftJobs = validJobs.filter(j => j.sourceType === 'ATS');
    const outputPath = path.join(process.cwd(), 'discovered_jobs.json');
    await fs.writeFile(outputPath, JSON.stringify({ version: 1, source: 'job-discovery-bot', jobs: draftJobs }, null, 2), 'utf8');
    console.log(`Saved ${draftJobs.length} ATS jobs to ${outputPath} for drafting`);

    // Save Aggregator jobs to discovered_aggregators.json
    const aggJobs = validJobs.filter(j => j.sourceType === 'AGGREGATOR');
    const aggOutputPath = path.join(process.cwd(), 'discovered_aggregators.json');
    await fs.writeFile(aggOutputPath, JSON.stringify({ version: 1, source: 'job-discovery-bot', jobs: aggJobs }, null, 2), 'utf8');
    console.log(`Saved ${aggJobs.length} Aggregator jobs to ${aggOutputPath}`);

    const reviewOutputPath = path.join(process.cwd(), 'review_jobs.json');
    await fs.writeFile(reviewOutputPath, JSON.stringify({ version: 1, source: 'job-discovery-bot', jobs: reviewJobs }, null, 2), 'utf8');
    console.log(`Saved ${reviewJobs.length} review jobs to ${reviewOutputPath}`);

    // Save ALL jobs to a single file as requested
    const allPassedOutputPath = path.join(process.cwd(), 'all_passed_jobs.json');
    await fs.writeFile(allPassedOutputPath, JSON.stringify({ version: 1, source: 'job-discovery-bot', jobs: validJobs }, null, 2), 'utf8');
    console.log(`Saved all ${validJobs.length} passed jobs to ${allPassedOutputPath} for manual verification`);
}

function isAtsBoardOrCompany(applyLink: string): boolean {
    try {
        const url = new URL(applyLink);
        const host = url.hostname.toLowerCase();

        // Check if parseJobUrl returns a non-null object
        if (parseJobUrl(applyLink)) {
            return true;
        }

        const atsHosts = [
            'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'myworkdaysite.com', 
            'ashbyhq.com', 'smartrecruiters.com', 'workable.com', 'recruitee.com', 
            'teamtailor.com', 'icims.com', 'oraclecloud.com', 'successfactors.com', 
            'taleo.net', 'jobvite.com', 'darwinbox.in', 'darwinbox.com'
        ];
        
        const boardHosts = [
            'linkedin.com', 'indeed.com', 'naukri.com', 'wellfound.com', 'angel.co', 
            'internshala.com', 'glassdoor.com', 'remoteok.com', 'weworkremotely.com', 
            'hasjob.co', 'bayt.com'
        ];
        
        const companyHosts = [
            'google.com', 'amazon.com', 'microsoft.com', 'ibm.com', 'apple.com', 
            'uber.com', 'stripe.com', 'meta.com', 'nvidia.com'
        ];

        const matchHost = (h: string, list: string[]) => {
            return list.some(item => h === item || h.endsWith('.' + item));
        };

        if (matchHost(host, atsHosts) || matchHost(host, boardHosts) || matchHost(host, companyHosts)) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

export async function uploadToDataLake(state: DiscoveryState, runId: string | null) {
    const allJobs = state.newJobsFound;

    if (!process.env.R2_BUCKET_NAME) {
        throw new Error('FATAL: R2_BUCKET_NAME environment variable is required but not set.');
    }
    const r2Bucket: string = process.env.R2_BUCKET_NAME;

    // Categorize jobs
    const supabaseJobs = allJobs.filter(job => job.sourceType === 'ATS' || isAtsBoardOrCompany(job.applyLink));
    const r2Jobs = allJobs.filter(job => !(job.sourceType === 'ATS' || isAtsBoardOrCompany(job.applyLink)));

    // ── Supabase Structured Data Upsert ──────────────────────────────────────────────────
    if (supabaseJobs.length > 0) {
        console.log(`\nUpserting ${supabaseJobs.length} ATS/Board/Company jobs to Supabase...`);
        await upsertJobs(supabaseJobs, runId);
        console.log(`Successfully completed Supabase upserts!`);
    }

    // ── Curated Remaining Jobs to R2 ──────────────────────────────────────────────────────
    if (r2Jobs.length > 0) {
        console.log(`\nProcessing ${r2Jobs.length} remaining jobs for R2 storage...`);
        let existingJobs: any[] = [];
        try {
            const response = await fetch(`${CDN_URL}/jobs/discovered.json`);
            if (response.ok) {
                const data = await response.json();
                if (data && typeof data === 'object') {
                    if (Array.isArray(data)) {
                        existingJobs = data;
                    } else if (Array.isArray(data.jobs)) {
                        existingJobs = data.jobs;
                    }
                }
            }
        } catch (err) {
            console.log(`Could not fetch existing curated jobs from R2 CDN, starting fresh.`);
        }

        const allRemainingJobs = [...existingJobs, ...r2Jobs];
        const seenLinks = new Set<string>();
        const mergedJobs: any[] = [];
        for (const job of allRemainingJobs) {
            if (!job.applyLink) continue;
            if (!seenLinks.has(job.applyLink)) {
                seenLinks.add(job.applyLink);
                mergedJobs.push(job);
            }
        }

        const payload = {
            version: 1,
            source: 'job-discovery-bot',
            updatedAt: new Date().toISOString(),
            jobs: mergedJobs
        };

        console.log(`Uploading curated remaining jobs to R2 at jobs/discovered.json (Total: ${mergedJobs.length})`);
        await uploadJsonToR2(payload, r2Bucket, 'jobs/discovered.json');
        console.log(`Successfully uploaded curated remaining jobs to R2.`);
    }

    // ── Update ATS Boards Registry in R2 ─────────────────────────────────────
    if (state.registryModified) {
        console.log(`\n--- Uploading updated ATS Registry to R2 ---`);
        for (const provider of Object.keys(state.atsRegistry)) {
            const providerData = state.atsRegistry[provider];
            await uploadJsonToR2(providerData, r2Bucket, `ats/${provider}.json`);
        }
        console.log(`Successfully updated ATS boards in R2.`);
    }

    // ── Update Non-ATS Company Lists in R2 ───────────────────────────────────
    if (state.discoveredCareers.size > 0 || state.discoveredRemaining.size > 0) {
        console.log(`\n--- Uploading Non-ATS Company Links to R2 ---`);
        
        let existingCareers: string[] = [];
        let existingRemaining: string[] = [];
        
        try {
            const careersRes = await fetch(`${CDN_URL}/discovery/careers.json`);
            if (careersRes.ok) existingCareers = await careersRes.json();
            
            const remainingRes = await fetch(`${CDN_URL}/discovery/remaining.json`);
            if (remainingRes.ok) existingRemaining = await remainingRes.json();
        } catch (err) {
            console.log(`Could not fetch existing non-ATS lists from CDN, starting fresh.`);
        }

        const mergedCareers = Array.from(new Set([...existingCareers, ...state.discoveredCareers]));
        const mergedRemaining = Array.from(new Set([...existingRemaining, ...state.discoveredRemaining]));

        if (state.discoveredCareers.size > 0) {
            await uploadJsonToR2(mergedCareers, r2Bucket, `discovery/careers.json`);
            console.log(`Added ${state.discoveredCareers.size} new career links. (Total: ${mergedCareers.length})`);
        }
        
        if (state.discoveredRemaining.size > 0) {
            await uploadJsonToR2(mergedRemaining, r2Bucket, `discovery/remaining.json`);
            console.log(`Added ${state.discoveredRemaining.size} new remaining links. (Total: ${mergedRemaining.length})`);
        }
    }
}
