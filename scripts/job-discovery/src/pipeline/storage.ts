import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { DiscoveryState } from '@fresherflow/pipeline';
import { DiscoveredJobEntry } from '@fresherflow/pipeline';
import { CDN_URL } from '@fresherflow/pipeline';
import { uploadJsonToR2, listR2Objects } from '@fresherflow/utils/r2';
import { saveVisited, saveRejectedReasons, savePostedLinks } from '@fresherflow/pipeline';
import { parseJobUrl } from '@fresherflow/parser';

import { withConcurrency } from '@fresherflow/pipeline';
import { normalizeUrl } from '@fresherflow/pipeline';
import { upsertJobs } from '@fresherflow/pipeline';
import { resolveAndAttachCompanies } from '@fresherflow/pipeline';
import { enrichJobPayload } from '@fresherflow/pipeline';

export async function persistLocalData(state: DiscoveryState) {
    // Drain any in-flight checkpoint first: it snapshots older state, so its
    // writes must land before (never after) the final end-of-run save.
    await flushStateCheckpoint();

    // Save local state files
    delete state.visited["pending_admin_approval"];
    await saveVisited(state.visited);
    await saveRejectedReasons(state.rejectedReasons);
    await savePostedLinks(state.postedLinks);

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

    // Save ALL valid discovered jobs to discovered_jobs.json (handoff artifact for job-processor)
    const outputPath = path.join(process.cwd(), 'discovered_jobs.json');
    await fs.writeFile(outputPath, JSON.stringify({ version: 1, source: 'job-discovery-bot', jobs: validJobs }, null, 2), 'utf8');
    console.log(`Saved ${validJobs.length} valid discovered jobs to ${outputPath} for job-processor`);

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

    // Push discovered jobs to Google Sheet (non-blocking, best-effort)
    await pushJobsToGoogleSheet(validJobs);
}

// ── Incremental visited-state checkpoints (P1 #2) ────────────────────────────
// persistLocalData runs only on clean completion, so a cancelled run used to
// lose all visited-state. maybeCheckpointState() re-saves just the 3 state
// shards (same format, same backends as end-of-run), throttled so hot loops
// pay ~nothing. Fire-and-forget: never throws, never blocks the crawler.
// Deliberately does NOT do persistLocalData's Supabase/enrich/sheet work and
// does NOT delete pending_admin_approval (end-of-run path unchanged).
const CHECKPOINT_INTERVAL_MS = 120_000;
let lastCheckpointAt = 0;
let checkpointInFlight: Promise<void> | null = null;

export function maybeCheckpointState(state: DiscoveryState): void {
    const now = Date.now();
    if (now - lastCheckpointAt < CHECKPOINT_INTERVAL_MS) return;
    if (checkpointInFlight) return; // previous checkpoint still writing — skip, don't pile up
    lastCheckpointAt = now;
    checkpointInFlight = (async () => {
        try {
            await saveVisited(state.visited);
            await saveRejectedReasons(state.rejectedReasons);
            await savePostedLinks(state.postedLinks);
            const applyLinks = state.visited["__discovered_apply_links__"]?.length ?? 0;
            console.log(`💾 State checkpoint saved (${Object.keys(state.visited).length} visited keys, ${applyLinks} apply-links).`);
        } catch (err) {
            console.warn('⚠️ State checkpoint failed (non-fatal, will retry on next interval):', err instanceof Error ? err.message : err);
        } finally {
            checkpointInFlight = null;
        }
    })();
}

// Awaiter for shutdown/end-of-run: guarantees no checkpoint write can land
// after the caller proceeds (used by persistLocalData so the final save is
// always the last writer). Never throws.
export async function flushStateCheckpoint(): Promise<void> {
    const inFlight = checkpointInFlight;
    if (!inFlight) return;
    try {
        await inFlight;
    } catch {}
}

async function pushJobsToGoogleSheet(jobs: DiscoveredJobEntry[]): Promise<void> {
    const scriptUrl = process.env.GOOGLE_SHEET_SCRIPT_URL;
    const secret = process.env.GOOGLE_SHEET_SECRET;
    if (!scriptUrl || !secret) {
        console.warn('[sheet] GOOGLE_SHEET_SCRIPT_URL or GOOGLE_SHEET_SECRET not set — skipping sheet push');
        return;
    }

    for (const job of jobs) {
        try {
            const row = {
                secret,
                title: job.title || '',
                company: job.company || '',
                location: (job as any).location || '',
                url: job.applyLink || '',
            };
            const res = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(row),
            });
            const text = await res.text();
            if (!res.ok || text !== 'OK') {
                console.warn(`[sheet] Failed to push job ${job.title}: ${text}`);
            } else {
                console.log(`[sheet] Pushed job: ${job.title} (${job.company})`);
            }
        } catch (err) {
            console.warn(`[sheet] Error pushing job ${job.title}:`, err);
        }
    }
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

/**
 * Pre-social snapshot of everything found this run, in one accessible JSON.
 *
 * Runs BEFORE the notification stage, i.e. before anything is posted to social
 * media. `uploadToDataLake` runs after social posting and only carries the
 * non-ATS curated set, so consumers that need the run's full output on time
 * (the India-Jobs-Internships board among them) read this instead.
 *
 * Cumulative and deduped by normalized apply link: re-running never drops a
 * job a consumer already saw, and the original `discoveredAt` is preserved.
 */
export async function saveFoundJobsSnapshot(state: DiscoveryState): Promise<void> {
    const fresh = state.newJobsFound
        .filter((j) => !!j.applyLink && !!j.title)
        .map((j) => ({
            title: j.title,
            company: j.company || 'Company',
            applyLink: j.applyLink,
            source: j.source,
            sourceType: j.sourceType,
            locations: [j.location, j.locationCity].filter((l): l is string => !!l && !!l.trim()),
            discoveredAt: j.discoveredAt || new Date().toISOString(),
            reviewRequired: !!j.reviewRequired,
        }));

    if (fresh.length === 0) return;

    // Merge into the previous snapshot so consumers always see the full set.
    let existing: Array<{ applyLink?: string }> = [];
    try {
        const res = await fetch(`${CDN_URL}/jobs/found.json`);
        if (res.ok) {
            const data: any = await res.json();
            existing = Array.isArray(data) ? data : (Array.isArray(data?.jobs) ? data.jobs : []);
        }
    } catch {
        // First run or CDN miss — start from this run's set.
    }

    const seen = new Set<string>();
    const merged: Array<Record<string, unknown>> = [];
    for (const job of [...existing, ...fresh] as Array<Record<string, unknown>>) {
        const url = job?.applyLink;
        if (!url) continue;
        const key = normalizeUrl(String(url));
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(job);
    }
    const capped = merged.length > 50000 ? merged.slice(-50000) : merged;

    const bySource: Record<string, number> = {};
    for (const job of capped) {
        const s = String(job.source || 'unknown');
        bySource[s] = (bySource[s] || 0) + 1;
    }

    const payload = {
        version: 1,
        source: 'job-discovery-bot',
        generatedAt: new Date().toISOString(),
        counts: {
            total: capped.length,
            thisRun: fresh.length,
            ats: fresh.filter((j) => j.sourceType === 'ATS').length,
            aggregator: fresh.filter((j) => j.sourceType === 'AGGREGATOR').length,
            confirmed: fresh.filter((j) => !j.reviewRequired).length,
            review: fresh.filter((j) => j.reviewRequired).length,
        },
        bySource,
        jobs: capped,
    };

    const bucket = (process.env.R2_BUCKET_NAME || '').trim();
    if (!bucket) {
        console.warn('R2_BUCKET_NAME not set — found-jobs snapshot not uploaded to the CDN.');
        return;
    }
    await uploadJsonToR2(payload, bucket, 'jobs/found.json');
    console.log(`Saved found-jobs snapshot before social: ${fresh.length} this run, ${capped.length} total → jobs/found.json`);
}

export async function uploadToDataLake(state: DiscoveryState, runId: string | null) {
    const allJobs = state.newJobsFound;

    // R2 persistence is the last stage. Without credentials the run still has
    // value: the Supabase upsert below, the local artifacts and the notifications
    // all still run. Warn and skip the R2 writes rather than throwing away a
    // completed crawl.
    const r2Bucket: string | undefined = process.env.R2_BUCKET_NAME;
    if (!r2Bucket) {
        console.warn('R2_BUCKET_NAME is not set — skipping R2 upload of discovered jobs. Supabase upsert, local artifacts and notifications are unaffected.');
    }

    // Categorize jobs
    const supabaseJobs = allJobs.filter(job => job.sourceType === 'ATS' || isAtsBoardOrCompany(job.applyLink));
    const r2Jobs = allJobs.filter(job => !(job.sourceType === 'ATS' || isAtsBoardOrCompany(job.applyLink)));

    // ── Supabase Structured Data Upsert ──────────────────────────────────────────────────
    if (supabaseJobs.length > 0) {
        console.log(`\nUpserting ${supabaseJobs.length} ATS/Board/Company jobs to Supabase...`);
        await upsertJobs(supabaseJobs, runId);
        console.log(`Successfully completed Supabase upserts!`);
    }

    if (!r2Bucket) return;

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
