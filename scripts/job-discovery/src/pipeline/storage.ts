import fs from 'node:fs/promises';
import path from 'node:path';
import { DiscoveryState } from './state.js';
import { CDN_URL } from '../config.js';
import { uploadJsonToR2, listR2Objects } from '../utils/r2.js';
import { saveVisited, saveRejectedReasons } from '../utils/storage.js';
import { parseJobUrl } from '../core/url-parser.js';

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

export async function uploadToDataLake(state: DiscoveryState) {
    const validJobs = state.newJobsFound.filter(j => !j.reviewRequired);
    const r2Bucket = process.env.R2_BUCKET_NAME || 'fresherflow-cdn';

    // ── R2 Bronze Data Lake Upload ──────────────────────────────────────────────────
    if (validJobs.length > 0) {
        console.log(`\nUploading ${validJobs.length} passed jobs to R2 Bronze Data Lake...`);
        const today = new Date().toISOString().split('T')[0];
        const nowHrMin = new Date().toISOString().split('T')[1].substring(0,5).replace(':','-');
        
        let uploadedCount = 0;
        for (const job of validJobs) {
            try {
                let key = '';
                const parsed = parseJobUrl(job.applyLink);
                
                // Embed discoveredAt into the JSON payload for Admin UI grouping
                const payloadToUpload = { ...job, discoveredAt: today };

                if (parsed && parsed.adapter) {
                    key = `jobs/ats/${parsed.adapter}/${parsed.company}/${parsed.jobId}.json`;
                } else if (job.sourceType === 'ATS') {
                    const tempParsed = parseJobUrl(job.applyLink);
                    const company = tempParsed?.company || job.company || 'unknown';
                    const jobId = tempParsed?.jobId || Buffer.from(job.applyLink).toString('base64').replace(/[/+=]/g, '_').substring(0, 15);
                    key = `jobs/non-ats/${company}/${jobId}.json`;
                } else {
                    const safeName = Buffer.from(job.applyLink).toString('base64').replace(/[/+=]/g, '_').substring(0, 15);
                    key = `jobs/aggregators/${today}/${nowHrMin}/${safeName}.json`;
                }
                
                await uploadJsonToR2(payloadToUpload, r2Bucket, key);
                uploadedCount++;
            } catch (err) {
                console.error(`Failed to upload job to R2 Data Lake:`, err);
            }
        }
        console.log(`Successfully uploaded ${uploadedCount} Micro-JSONs to Bronze Data Lake!`);
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
