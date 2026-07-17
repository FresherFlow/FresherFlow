import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { DiscoveryState } from './state.js';
import { CDN_URL } from '../config.js';
import { uploadJsonToR2, listR2Objects } from '../utils/r2.js';
import { saveVisited, saveRejectedReasons } from '../utils/storage.js';
import { parseJobUrl } from '../core/url-parser.js';
import { withConcurrency } from '../ats/index.js';
import { upsertJobs } from '../repositories/discoveredJobs.js';

export async function persistLocalData(state: DiscoveryState) {
    // Save local state files
    delete state.visited["pending_admin_approval"];
    await saveVisited(state.visited);
    await saveRejectedReasons(state.rejectedReasons);

    const validJobs = state.newJobsFound.filter(j => !j.reviewRequired);
    const reviewJobs = state.newJobsFound.filter(j => j.reviewRequired);

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

export async function uploadToDataLake(state: DiscoveryState, runId: string | null) {
    const allJobs = state.newJobsFound;

    if (!process.env.R2_BUCKET_NAME) {
        throw new Error('FATAL: R2_BUCKET_NAME environment variable is required but not set.');
    }
    const r2Bucket: string = process.env.R2_BUCKET_NAME;

    // ── Supabase Structured Data Upsert ──────────────────────────────────────────────────
    if (allJobs.length > 0) {
        console.log(`\nUpserting ${allJobs.length} jobs to Supabase...`);
        await upsertJobs(allJobs, runId);
        console.log(`Successfully completed Supabase upserts!`);
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
