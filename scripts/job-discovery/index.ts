import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { 
    CDN_SECRET, 
    CDN_URL,
    ATS_CDN_BASE,
    ATS_PROVIDERS,
    TARGET_SITES,
    loadEnv 
} from './src/config.js';
import { signUrl, normalizeUrl, sanitizeAtsUrl } from './src/utils/url.js';
import { sendTelegramMessage } from './src/utils/telegram.js';
import { loadVisited, saveVisited, loadRejectedReasons, saveRejectedReasons } from './src/utils/storage.js';
import { hasFresherKeyword, isActualJob } from './src/filters/text-filters.js';
import { isLocationIndiaOrRemote } from './src/filters/ats-filters.js';
import { scoreJobDescription } from './src/filters/scorer.js';
import { uploadJsonToR2 } from './src/utils/r2.js';
import { logDecision } from './src/utils/logger.js';
import { findActualApplyLink } from './src/core/extractor.js';
import { isJobLive } from './src/core/verifier.js';
import { runAtsDiscovery, AtsRegistry } from './src/ats/index.js';
import { extractAtsBoard } from './src/core/ats-detector.js';
import { uploadToR2 } from './src/utils/r2.js';

await loadEnv();

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candidate {
    applyLink: string;
    source: string;
    sourceType: 'ATS' | 'AGGREGATOR';
    aggregatorUrl: string;
    aggregatorTitle: string;
    aggregatorText: string;
    isAggregatorReview: boolean;
    company?: string;
    isTestBypass?: boolean;
}

interface DiscoveredJobEntry {
    title: string;
    applyLink: string;
    source: string;
    sourceType: 'ATS' | 'AGGREGATOR';
    discoveredAt: string;
    reviewRequired?: boolean;
    aggregatorUrl?: string;
    aggregatorTitle?: string;
    aggregatorText?: string;
    atsText?: string;
    company?: string;
    isTestBypass?: boolean;
}

// ─── run() ────────────────────────────────────────────────────────────────────

async function run() {
    console.log("Fetching CDN feed...");
    let feed: any = { opportunities: [] };
    if (!CDN_SECRET) {
        console.warn("CDN_SIGNATURE_SECRET is missing. Running without known links bootstrap cache.");
    } else {
        try {
            const url = signUrl('/bootstrap-feed.min.json');
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Feed fetch failed: ${res.statusText}`);
            feed = await res.json();
        } catch (err) {
            console.error("Failed to fetch CDN JSON", err);
            process.exit(1);
        }
    }

    const knownLinks = new Set<string>();
    for (const opp of (feed.opportunities || [])) {
        if (opp.applyLink) knownLinks.add(normalizeUrl(opp.applyLink));
        if (opp.sourceLink) knownLinks.add(normalizeUrl(opp.sourceLink));
    }
    console.log(`Loaded ${knownLinks.size} known links from CDN.`);

    const visited = await loadVisited();
    const rejectedReasons = await loadRejectedReasons();
    if (!visited["__discovered_apply_links__"]) {
        visited["__discovered_apply_links__"] = [];
    }

    // Shared state (JS single-threaded — safe to mutate from both phases)
    const candidateQueue: Candidate[] = [];
    const newJobsFound: DiscoveredJobEntry[] = [];
    const SCRAPER_CONCURRENCY = 4;
    const VERIFIER_CONCURRENCY = 4;

    const browser = await chromium.launch({ headless: true });

    let atsRegistry: AtsRegistry = {};
    let registryModified = false;
    const discoveredCareers = new Set<string>();
    const discoveredRemaining = new Set<string>();

    try {
        // ── Phase 0: ATS Direct API Scraping ─────────────────────────────────────────
        console.log(`\n=== Phase 0: Scraping ATS APIs ===\n`);
        
        try {
            if (ATS_CDN_BASE) {
                console.log(`Fetching ATS Boards from CDN (${ATS_CDN_BASE})...`);
                await Promise.all(ATS_PROVIDERS.map(async provider => {
                    try {
                        const res = await fetch(`${ATS_CDN_BASE}/${provider}.json`);
                        if (res.ok) {
                            atsRegistry[provider] = await res.json();
                            console.log(`  -> Loaded ${provider}.json`);
                        } else if (res.status !== 404) {
                            console.warn(`  -> Failed to fetch ${provider}.json: ${res.statusText}`);
                        }
                    } catch (err) {
                        console.warn(`  -> Error fetching ${provider}.json: ${(err as Error).message}`);
                    }
                }));
            } else {
                console.log(`ATS_CDN_BASE not set, skipping CDN fetch.`);
            }
        } catch (err) {
            console.error("Critical error fetching ATS registry from CDN:", err);
        }

        const atsJobs = await runAtsDiscovery(atsRegistry);

        let atsQueued = 0, atsRejected = 0;
        for (const job of atsJobs) {
            // 1. Must have a real title
            if (!job.title || job.title === 'Unknown Title') {
                console.log(`  [ATS] Skipping — invalid title: ${job.title}`);
                continue;
            }
            // 2. URL must not contain literal 'undefined'
            if (!job.applyLink || job.applyLink.includes('/undefined')) {
                console.log(`  [ATS] Skipping — invalid link: ${job.applyLink}`);
                continue;
            }
            // 3. Must be India or Remote
            if (!(job as any).isTestBypass && job.location && !isLocationIndiaOrRemote(job.location)) {
                console.log(`  [ATS] Skipping — foreign location "${job.location}": ${job.title}`);
                atsRejected++;
                continue;
            }

            const normalizedLink = normalizeUrl(job.applyLink);
            if (!(job as any).isTestBypass && (knownLinks.has(normalizedLink) || visited["__discovered_apply_links__"].includes(normalizedLink))) {
                console.log(`  [ATS] Skipping — already known: ${normalizedLink}`);
                continue;
            }

            knownLinks.add(normalizedLink);

            // Bypass Playwright verification if we already have the full description from the ATS API
            if (job.description && job.descriptionSource === 'API') {
                newJobsFound.push({
                    title: job.title,
                    applyLink: job.applyLink,
                    source: job.source,
                    sourceType: 'ATS',
                    discoveredAt: new Date().toISOString(),
                    reviewRequired: false,
                    atsText: job.description,
                    company: job.company
                });
                visited["__discovered_apply_links__"].push(normalizedLink);
                atsQueued++;
                continue;
            }

            // Queue for Phase 2 verifier to ensure the job is still live (for ATS that only give list, no details)
            candidateQueue.push({
                applyLink: job.applyLink,
                source: job.source,
                sourceType: 'ATS',
                aggregatorUrl: '',
                aggregatorTitle: job.title,
                aggregatorText: job.description || '',
                isAggregatorReview: false,
                company: job.company,
                isTestBypass: (job as any).isTestBypass
            });
            atsQueued++;
        }

        console.log(`\n-> ATS Phase 0: ${atsQueued} queued for verification, ${atsRejected} rejected (foreign location).\n`);


        // ── Phase 1.5: Verify ATS ──────────────────────────────────────────
        // Process ATS queue immediately so they are available without waiting for aggregators
        const runVerifiers = async (phaseName: string) => {
            if (candidateQueue.length === 0) return;
            console.log(`\n=== Verifying ${phaseName} pages (${VERIFIER_CONCURRENCY} workers) ===\n`);
            
            const pendingCandidates = [...candidateQueue];
            candidateQueue.length = 0; // Clear queue for next phase

            const verifierWorker = async () => {
                const context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    viewport: { width: 1280, height: 720 }
                });
                const page = await context.newPage();

                try {
                    while (pendingCandidates.length > 0) {
                        const candidate = pendingCandidates.shift();
                        if (!candidate) continue;

                        console.log(`  [Verifier] Checking: ${candidate.applyLink}`);
                        let checkResult = await isJobLive(page, candidate.applyLink);
                        if (candidate.isTestBypass) {
                            checkResult = { live: true, status: 'live', finalUrl: candidate.applyLink, atsText: checkResult.atsText || '' };
                        }

                        if (checkResult.live) {
                            const actualApplyLink = checkResult.finalUrl || candidate.applyLink;
                            console.log(`  ✅ LIVE: ${actualApplyLink} (${checkResult.status})`);

                            let jobTitle = await page.title().catch(() => "");
                            jobTitle = jobTitle.replace(/( - Workday| - Lever| - Greenhouse| Careers| - Jobs| \| .*)$/i, '').trim();

                            if (!jobTitle || jobTitle.length < 4 || /^(login|sign in|welcome|job details|careers|opportunities|skip to content|careers at .+|jobs at .+)$/i.test(jobTitle)) {
                                jobTitle = candidate.aggregatorTitle || "Job Title Unknown";
                            }

                            if (candidate.sourceType === 'ATS' && checkResult.atsText) {
                                const atsScore = scoreJobDescription(jobTitle, checkResult.atsText);
                                if (atsScore.verdict === 'REJECT') {
                                    console.log(`  -> ❌ Skipping ATS job: Rejected by scorer (Score: ${atsScore.score})`);
                                    continue;
                                }
                            }

                            const normalizedApplyLink = normalizeUrl(actualApplyLink);
                            visited["__discovered_apply_links__"].push(normalizedApplyLink);
                            if (visited["__discovered_apply_links__"].length > 2000) visited["__discovered_apply_links__"] = visited["__discovered_apply_links__"].slice(-2000);

                            newJobsFound.push({
                                title: jobTitle,
                                applyLink: actualApplyLink,
                                source: candidate.source,
                                sourceType: candidate.sourceType,
                                discoveredAt: new Date().toISOString(),
                                reviewRequired: false,
                                aggregatorUrl: candidate.aggregatorUrl,
                                aggregatorTitle: candidate.aggregatorTitle,
                                aggregatorText: candidate.aggregatorText,
                                atsText: checkResult.atsText || '',
                                company: candidate.company,
                                isTestBypass: candidate.isTestBypass
                            });
                        } else {
                            const normalizedApplyLink = normalizeUrl(candidate.applyLink);
                            if (checkResult.status === 'failed') {
                                console.log(`  -> ATS check failed (network/timeout). Will retry next run.`);
                                knownLinks.delete(normalizedApplyLink);
                            } else {
                                console.log(`  -> ATS page is expired/senior. Discarding. Reason: ${checkResult.rejectReason}`);
                                visited["__discovered_apply_links__"].push(normalizedApplyLink);
                                if (visited["__discovered_apply_links__"].length > 2000) visited["__discovered_apply_links__"] = visited["__discovered_apply_links__"].slice(-2000);
                                rejectedReasons[normalizedApplyLink] = checkResult.rejectReason || 'Unknown reason';
                            }
                        }
                    }
                } finally {
                    await page.close();
                    await context.close();
                }
            };
            await Promise.all(Array.from({ length: VERIFIER_CONCURRENCY }, () => verifierWorker()));
        };

        await runVerifiers("ATS");

        // ── Phase 2: Scraper Workers ──────────────────────────────────────────

        if (process.env.SKIP_AGGREGATORS !== 'true') {
            console.log(`\n=== Phase 2: Scraping aggregators (${SCRAPER_CONCURRENCY} workers) ===\n`);

            const activeSites = TARGET_SITES;
        if (activeSites.length === 0) {
            console.warn(`Failed to fetch aggregators.json from CDN. Skipping Phase 1.`);
        } else {
            console.log(`Loaded ${activeSites.length} aggregator sites from CDN.`);
        }

        const scraperWorker = async () => {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            // Block heavy resources on aggregator pages (not ATS — those may need CSS for SPAs)
            await context.route('**/*', (route) => {
                const type = route.request().resourceType();
                if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                    route.abort();
                } else {
                    route.continue();
                }
            });

            const page = await context.newPage();
            try {
                while (activeSites.length > 0) {
                    const site = activeSites.shift();
                    if (!site) continue;
                    console.log(`\n--- Scraping ${site.name} ---`);
                    if (!visited[site.name]) visited[site.name] = [];

                    const jobLinks: string[] = [];
                    const siteDomain = new URL(site.urls[0]).hostname;

                    for (const url of site.urls) {
                        console.log(`  -> Loading start page: ${url}`);
                        try {
                            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                            const allLinks = await page.$$eval('a', anchors => anchors.map(a => ({ text: a.innerText.trim(), href: a.href })));
                            const filtered = allLinks
                                .filter(l => {
                                    try {
                                        const u = new URL(l.href);
                                        if (
                                            u.pathname === '/' ||
                                            u.pathname === '/jobs/' ||
                                            u.pathname === '/freshers/' ||
                                            u.pathname.includes('/category/') ||
                                            u.pathname.includes('/tag/') ||
                                            u.pathname.includes('/page/') ||
                                            u.pathname.includes('/author/') ||
                                            u.pathname.includes('/search/') ||
                                            u.pathname.includes('/whatsapp-group/') ||
                                            u.pathname.includes('/recruitment/') ||
                                            u.pathname.includes('/jobs-by-location/') ||
                                            u.pathname.includes('/jobs-by-batch-year/') ||
                                            u.pathname.includes('/jobs-by-batch/') ||
                                            u.pathname.includes('/off-campus-drive-jobs/') ||
                                            u.pathname.includes('/work-from-home/') ||
                                            u.pathname.includes('/internship/') ||
                                            u.pathname.includes('-batch-jobs') ||
                                            u.pathname.endsWith('-jobs/') ||
                                            u.pathname.endsWith('-jobs')
                                        ) return false;
                                        return u.hostname.includes(siteDomain) &&
                                            (u.pathname.includes('job') || u.pathname.includes('hiring') || u.pathname.includes('recruitment') || u.pathname.includes('career') || u.pathname.includes('vacancy') || u.pathname.includes('opportunity') || u.pathname.includes('fresher'));
                                    } catch {
                                        return false;
                                    }
                                })
                                .map(l => l.href);
                            jobLinks.push(...filtered);
                        } catch (gotoErr) {
                            console.error(`  -> Failed to load start page ${url}:`, (gotoErr as Error).message);
                        }
                    }

                    const uniqueJobLinks = [...new Set(jobLinks)];
                    const unvisitedLinks = uniqueJobLinks.filter(link => !visited[site.name].includes(link));
                    console.log(`Found ${unvisitedLinks.length} new unvisited links for ${site.name}.`);

                    for (const jobLink of unvisitedLinks.slice(0, 20)) {
                        console.log(`Checking aggregator post: ${jobLink}`);
                        visited[site.name].push(jobLink);
                        
                        // Prevent infinite growth of visited aggregator links
                        if (visited[site.name].length > 2000) {
                            visited[site.name] = visited[site.name].slice(-2000);
                        }

                        await page.goto(jobLink, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
                        await page.waitForTimeout(2000);
                        const aggregatorTitle = await page.locator('h1').first().innerText({ timeout: 500 }).catch(() => "");
                        const bodyText = await page.locator('body').innerText({ timeout: 500 }).catch(() => "");

                        const scoreResult = scoreJobDescription(aggregatorTitle, bodyText);
                        
                        // Log decision
                        logDecision(scoreResult, jobLink, 'Aggregator');

                        let isAggregatorReview = false;

                        if (scoreResult.verdict === 'REJECT') {
                            console.log(`  -> Skipping: Rejected by scorer (Score: ${scoreResult.score})`);
                            continue;
                        } else if (scoreResult.verdict === 'UNKNOWN' || scoreResult.verdict === 'MEDIUM') {
                            console.log(`  -> ${scoreResult.verdict} job. Skipping review flag.`);
                            isAggregatorReview = false;
                        }

                        if (!isActualJob(aggregatorTitle)) {
                            if (hasFresherKeyword(bodyText)) {
                                console.log(`  -> Borderline job type. Skipping review flag.`);
                                isAggregatorReview = false;
                            } else {
                                console.log(`  -> Skipping: Not an actual job post.`);
                                continue;
                            }
                        }

                        const applyLink = await findActualApplyLink(page, context, siteDomain);
                        if (!applyLink) {
                            console.log(`  -> Failed to extract apply link.`);
                            continue;
                        }

                        // ---> ATS AUTO-DISCOVERY <---
                        const boardMatch = extractAtsBoard(applyLink);
                        if (boardMatch) {
                            const { provider, boardId } = boardMatch;
                            if (!atsRegistry[provider]) atsRegistry[provider] = {};
                            if (!atsRegistry[provider]![boardId]) {
                                let guessedName = boardId;
                                const atMatch = aggregatorTitle.match(/ at (.+)$/i) || aggregatorTitle.match(/ by (.+)$/i);
                                if (atMatch) {
                                    guessedName = atMatch[1].trim();
                                } else if (boardId.startsWith('http')) {
                                    try {
                                        guessedName = new URL(boardId).hostname.split('.')[0];
                                        // Title-case it
                                        guessedName = guessedName.charAt(0).toUpperCase() + guessedName.slice(1);
                                    } catch {
                                        // Ignore invalid URLs
                                    }
                                }
                                
                                atsRegistry[provider]![boardId] = guessedName;
                                registryModified = true;
                                console.log(`  🌟 Discovered NEW ATS board automatically! ${provider}: ${boardId} (${guessedName})`);
                            }
                        } else {
                            try {
                                const urlObj = new URL(applyLink);
                                const baseDomain = urlObj.origin;
                                const lowerUrl = applyLink.toLowerCase();
                                if (/career|job|workday|opportunit/i.test(lowerUrl)) {
                                    discoveredCareers.add(baseDomain);
                                } else {
                                    discoveredRemaining.add(baseDomain);
                                }
                            } catch (e) {
                                // Ignore invalid URLs
                            }
                        }

                        // Sanitize the URL before dedup check (strip ?q= etc.)
                        const cleanApplyLink = sanitizeAtsUrl(applyLink);
                        const normalizedApplyLink = normalizeUrl(cleanApplyLink);

                        if (knownLinks.has(normalizedApplyLink) || visited["__discovered_apply_links__"].includes(normalizedApplyLink)) {
                            console.log(`  -> Skipping: Already seen/discovered.`);
                            continue;
                        }

                        // Reserve the link immediately to prevent duplicate ATS checks
                        knownLinks.add(normalizedApplyLink);

                        console.log(`  -> Queued for ATS verification: ${cleanApplyLink}`);
                        candidateQueue.push({
                            applyLink: cleanApplyLink,
                            source: site.name,
                            sourceType: 'AGGREGATOR',
                            aggregatorUrl: jobLink,
                            aggregatorTitle: aggregatorTitle.trim(),
                            aggregatorText: bodyText,
                            isAggregatorReview
                        });
                    }
                }
            } finally {
                await page.close();
                await context.close();
            }
        };

            await Promise.all(Array.from({ length: SCRAPER_CONCURRENCY }, () => scraperWorker()));

            console.log(`\n=== Phase 2 Complete. ${candidateQueue.length} candidates queued for ATS verification. ===\n`);

            await runVerifiers("Aggregator");
        } else {
            console.log(`\n=== Phase 2: Scraping aggregators (SKIPPED via ENV) ===\n`);
        }

    } finally {
        await browser.close();
    }

    delete visited["pending_admin_approval"];
    await saveVisited(visited);
    await saveRejectedReasons(rejectedReasons);

    // ── Send Telegram alert ───────────────────────────────────────────────────

    if (newJobsFound.length > 0) {
        const validJobs = newJobsFound.filter(j => !j.reviewRequired);
        const reviewJobs = newJobsFound.filter(j => j.reviewRequired);

        let msg = "";
        if (validJobs.length > 0) {
            const atsCount = validJobs.filter(j => j.sourceType === 'ATS').length;
            const aggCount = validJobs.filter(j => j.sourceType === 'AGGREGATOR').length;
            msg += `🔥 <b>Job Discovery Bot Found ${validJobs.length} New Fresher Jobs!</b> 🔥\n`;
            msg += `<i>(${atsCount} ATS Direct, ${aggCount} Aggregator)</i>\n\n`;
            for (const job of validJobs.slice(0, 15)) {
                const badge = job.sourceType === 'ATS' ? '🏢' : '🌐';
                msg += `- ${badge} <b>${job.title}</b> (via ${job.source})\n  Link: ${job.applyLink}\n\n`;
            }
            if (validJobs.length > 15) msg += `...and ${validJobs.length - 15} more!\n\n`;
        }

        if (reviewJobs.length > 0) {
            msg += `⚠️ <b>Review Required Jobs:</b> ⚠️\n\n`;
            for (const job of reviewJobs.slice(0, 10)) {
                msg += `- <b>${job.title}</b> (via ${job.source})\n  Link: ${job.applyLink}\n\n`;
            }
            if (reviewJobs.length > 10) msg += `...and ${reviewJobs.length - 10} more!\n\n`;
        }

        msg += `Please add these to the Admin Dashboard.`;
        console.log("Sending Telegram message:", msg);
        await sendTelegramMessage(msg);

        const apiBaseUrl = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
        if (apiBaseUrl) {
            console.log(`Waking up Render API server: ${apiBaseUrl}/api/health`);
            fetch(`${apiBaseUrl}/api/health`).catch(() => {});
        }
    } else {
        console.log("No new jobs found this run.");
    }

    // ── Write output files ────────────────────────────────────────────────────

    const validJobs = newJobsFound.filter(j => !j.reviewRequired);
    const reviewJobs = newJobsFound.filter(j => j.reviewRequired);

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

    // ── R2 Micro-JSON Upload ──────────────────────────────────────────────────
    
    if (validJobs.length > 0) {
        console.log(`\nUploading ${validJobs.length} passed jobs to R2 as Micro-JSONs...`);
        const today = new Date().toISOString().split('T')[0];
        const r2Bucket = process.env.R2_BUCKET_NAME || 'fresherflow-cdn';
        
        let uploadedCount = 0;
        for (const job of validJobs) {
            try {
                // Use a base64 encoded URL to ensure a safe, unique filename
                const safeName = Buffer.from(job.applyLink).toString('base64').replace(/[/+=]/g, '_');
                const key = `pending-jobs/${today}/${safeName}.json`;
                
                await uploadJsonToR2(job, r2Bucket, key);
                uploadedCount++;
            } catch (err) {
                console.error(`Failed to upload job for ${job.company} to R2:`, err);
            }
        }
        console.log(`Finished uploading ${uploadedCount} jobs to R2.`);
    }

    // ── Run Summary ───────────────────────────────────────────────────────────
    const atsTotal = newJobsFound.filter(j => j.sourceType === 'ATS').length;
    const aggTotal = newJobsFound.filter(j => j.sourceType === 'AGGREGATOR').length;
    const reviewTotal = newJobsFound.filter(j => j.reviewRequired).length;
    const confirmedTotal = newJobsFound.filter(j => !j.reviewRequired).length;
    console.log(`
╔══════════════════════════════════════════════════╗
║               RUN SUMMARY                        ║
╠══════════════════════════════════════════════════╣
║  Total new jobs found    : ${String(newJobsFound.length).padEnd(20)}║
║  ├─ ATS Direct           : ${String(atsTotal).padEnd(20)}║
║  └─ Aggregator           : ${String(aggTotal).padEnd(20)}║
║                                                  ║
║  Confirmed (no review)   : ${String(confirmedTotal).padEnd(20)}║
║  Flagged for review      : ${String(reviewTotal).padEnd(20)}║
╚══════════════════════════════════════════════════╝`);

    // ── GitHub Actions step summary ───────────────────────────────────────────

    if (process.env.GITHUB_STEP_SUMMARY) {
        let summary = `## Job Discovery Bot Results\n\n`;
        summary += `Discovered **${newJobsFound.length}** new jobs and saved them to \`discovered_jobs.json\`.\n\n`;
        
        const atsCount = newJobsFound.filter(j => j.sourceType === 'ATS').length;
        const aggCount = newJobsFound.filter(j => j.sourceType === 'AGGREGATOR').length;
        summary += `- **ATS Jobs**: ${atsCount}\n- **Aggregator Jobs**: ${aggCount}\n\n`;
        
        if (newJobsFound.length > 0) {
            summary += `### Discovered Jobs\n`;
            newJobsFound.forEach(j => {
                const reviewMark = j.reviewRequired ? ' (⚠️ Review)' : '';
                const typeMark = j.sourceType === 'ATS' ? '🏢' : '🌐';
                summary += `- ${typeMark} **${j.title}** (via ${j.source})${reviewMark}: ${j.applyLink}\n`;
            });
        } else {
            summary += `No new fresher jobs were found during this run.`;
        }
        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }

    const r2Bucket = process.env.R2_BUCKET_NAME || 'fresherflow-cdn';

    // ── Update ATS Boards Registry in R2 ─────────────────────────────────────
    if (registryModified) {
        console.log(`\n--- Uploading updated ATS Registry to R2 ---`);
        for (const provider of Object.keys(atsRegistry)) {
            const providerData = atsRegistry[provider];
            await uploadJsonToR2(providerData, r2Bucket, `ats/${provider}.json`);
        }
        console.log(`Successfully updated ATS boards in R2.`);
    }

    // ── Update Non-ATS Company Lists in R2 ───────────────────────────────────
    if (discoveredCareers.size > 0 || discoveredRemaining.size > 0) {
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

        const mergedCareers = Array.from(new Set([...existingCareers, ...discoveredCareers]));
        const mergedRemaining = Array.from(new Set([...existingRemaining, ...discoveredRemaining]));

        if (discoveredCareers.size > 0) {
            await uploadJsonToR2(mergedCareers, r2Bucket, `discovery/careers.json`);
            console.log(`Added ${discoveredCareers.size} new career links. (Total: ${mergedCareers.length})`);
        }
        
        if (discoveredRemaining.size > 0) {
            await uploadJsonToR2(mergedRemaining, r2Bucket, `discovery/remaining.json`);
            console.log(`Added ${discoveredRemaining.size} new remaining links. (Total: ${mergedRemaining.length})`);
        }
    }
}

run().catch(console.error);
