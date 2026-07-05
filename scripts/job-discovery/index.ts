import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { 
    CDN_SECRET, 
    TARGET_SITES, 
    loadEnv 
} from './src/config.js';
import { signUrl, normalizeUrl, sanitizeAtsUrl } from './src/utils/url.js';
import { sendTelegramMessage } from './src/utils/telegram.js';
import { loadVisited, saveVisited } from './src/utils/storage.js';
import { isFresherJob, isSeniorJob, hasFresherKeyword, isActualJob } from './src/filters/text-filters.js';
import { findActualApplyLink } from './src/core/extractor.js';
import { isJobLive } from './src/core/verifier.js';
import { runAtsDiscovery, AtsRegistry } from './src/ats/index.js';
import { ATS_BOARDS_URL } from './src/config.js';

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
    if (!visited["__discovered_apply_links__"]) {
        visited["__discovered_apply_links__"] = [];
    }

    // Shared state (JS single-threaded — safe to mutate from both phases)
    const candidateQueue: Candidate[] = [];
    const newJobsFound: DiscoveredJobEntry[] = [];
    const SCRAPER_CONCURRENCY = 4;
    const VERIFIER_CONCURRENCY = 4;

    const browser = await chromium.launch({ headless: true });

    let atsJobsFoundCount = 0;
    try {
        // ── Phase 0: ATS Direct API Scraping ─────────────────────────────────────────
        console.log(`\n=== Phase 0: Scraping ATS APIs ===\n`);
        let atsRegistry: AtsRegistry = {};
        try {
            console.log(`Fetching ATS Boards from ${ATS_BOARDS_URL}...`);
            const atsRes = await fetch(ATS_BOARDS_URL);
            if (atsRes.ok) {
                atsRegistry = await atsRes.json() as AtsRegistry;
            } else {
                throw new Error(atsRes.statusText);
            }
        } catch (err) {
            console.warn(`Could not fetch ATS registry: ${(err as Error).message}. Falling back to local docs/ats_boards.json...`);
            try {
                const localJson = await fs.readFile(path.join(process.cwd(), '../../docs/ats_boards.json'), 'utf8');
                atsRegistry = JSON.parse(localJson) as AtsRegistry;
            } catch (localErr) {
                console.error("Also failed to load local ats_boards.json");
            }
        }

        const atsJobs = await runAtsDiscovery(atsRegistry);
        const now = new Date().toISOString();
        
        for (const job of atsJobs) {
            const normalizedLink = normalizeUrl(job.applyLink);
            if (!knownLinks.has(normalizedLink) && !visited["__discovered_apply_links__"].includes(normalizedLink)) {
                newJobsFound.push({
                    title: job.title,
                    applyLink: job.applyLink,
                    source: job.source,
                    sourceType: 'ATS',
                    discoveredAt: now,
                    reviewRequired: false
                });
                visited["__discovered_apply_links__"].push(normalizedLink);
                knownLinks.add(normalizedLink);
                atsJobsFoundCount++;
            }
        }
        console.log(`\n-> Added ${atsJobsFoundCount} NEW unknown ATS jobs to processing queue.\n`);

        // ── Phase 1: Scraper Workers ──────────────────────────────────────────
        // Visits aggregator sites, extracts candidate links + aggregator text,
        // runs quick aggregator-level filters, and pushes to candidateQueue.
        // Does NOT open ATS URLs — that is Phase 2's job.

        console.log(`\n=== Phase 1: Scraping aggregators (${SCRAPER_CONCURRENCY} workers) ===\n`);

        const activeSites = [...TARGET_SITES];

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

                        await page.goto(jobLink, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
                        await page.waitForTimeout(2000);

                        const aggregatorTitle = await page.locator('h1').first().innerText({ timeout: 500 }).catch(() => "");
                        const bodyText = await page.locator('body').innerText({ timeout: 500 }).catch(() => "");

                        if (isSeniorJob(bodyText)) {
                            console.log(`  -> Skipping: Strictly senior job.`);
                            continue;
                        }

                        let isAggregatorReview = false;

                        if (!isFresherJob(bodyText)) {
                            if (hasFresherKeyword(bodyText)) {
                                console.log(`  -> Borderline job. Marking for review.`);
                                isAggregatorReview = true;
                            } else {
                                console.log(`  -> Skipping: Not a fresher job.`);
                                continue;
                            }
                        }

                        if (!isActualJob(aggregatorTitle)) {
                            if (hasFresherKeyword(bodyText)) {
                                console.log(`  -> Borderline job type. Marking for review.`);
                                isAggregatorReview = true;
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

        console.log(`\n=== Phase 1 Complete. ${candidateQueue.length} candidates queued for ATS verification. ===\n`);

        // ── Phase 2: Verifier Workers ─────────────────────────────────────────
        // Each worker opens a DEDICATED browser context (allows stylesheets for SPAs),
        // navigates to the clean ATS URL, waits for real content to stabilise,
        // and makes the final live / review / discard decision.

        console.log(`=== Phase 2: Verifying ATS pages (${VERIFIER_CONCURRENCY} workers) ===\n`);

        const pendingCandidates = [...candidateQueue];

        const verifierWorker = async () => {
            // Verifier contexts allow stylesheets — Workday/Oracle HCM SPAs need CSS
            // to trigger their JS rendering pipelines correctly.
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
                    const checkResult = await isJobLive(page, candidate.applyLink);

                    if (checkResult.live) {
                        const actualApplyLink = checkResult.finalUrl || candidate.applyLink;
                        console.log(`  ✅ LIVE: ${actualApplyLink} (${checkResult.status})`);

                        let jobTitle = await page.title().catch(() => "");
                        jobTitle = jobTitle
                            .replace(/( - Workday| - Lever| - Greenhouse| Careers| - Jobs| \| .*)$/i, '')
                            .trim();

                        if (!jobTitle || jobTitle.length < 4 || /^(login|sign in|welcome|job details|careers|opportunities|skip to content|careers at .+|jobs at .+)$/i.test(jobTitle)) {
                            jobTitle = candidate.aggregatorTitle || "Job Title Unknown";
                        }

                        const normalizedApplyLink = normalizeUrl(actualApplyLink);
                        visited["__discovered_apply_links__"].push(normalizedApplyLink);
                        if (visited["__discovered_apply_links__"].length > 2000) {
                            visited["__discovered_apply_links__"] = visited["__discovered_apply_links__"].slice(-2000);
                        }

                        newJobsFound.push({
                            title: jobTitle,
                            applyLink: actualApplyLink,
                            source: candidate.source,
                            sourceType: candidate.sourceType,
                            discoveredAt: new Date().toISOString(),
                            reviewRequired: checkResult.status === 'review' || candidate.isAggregatorReview,
                            aggregatorUrl: candidate.aggregatorUrl,
                            aggregatorTitle: candidate.aggregatorTitle,
                            aggregatorText: candidate.aggregatorText,
                            atsText: checkResult.atsText || ''
                        });
                    } else {
                        const normalizedApplyLink = normalizeUrl(candidate.applyLink);
                        if (checkResult.status === 'failed') {
                            console.log(`  -> ATS check failed (network/timeout). Will retry next run.`);
                            knownLinks.delete(normalizedApplyLink);
                        } else {
                            console.log(`  -> ATS page is expired/senior. Discarding.`);
                            visited["__discovered_apply_links__"].push(normalizedApplyLink);
                            if (visited["__discovered_apply_links__"].length > 2000) {
                                visited["__discovered_apply_links__"] = visited["__discovered_apply_links__"].slice(-2000);
                            }
                        }
                    }
                }
            } finally {
                await page.close();
                await context.close();
            }
        };

        await Promise.all(Array.from({ length: VERIFIER_CONCURRENCY }, () => verifierWorker()));

    } finally {
        await browser.close();
    }

    delete visited["pending_admin_approval"];
    await saveVisited(visited);

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

    // Only save ATS jobs to draft (discovered_jobs.json) as per user request
    const draftJobs = validJobs.filter(j => j.sourceType === 'ATS');

    const outputPath = path.join(process.cwd(), 'discovered_jobs.json');
    await fs.writeFile(outputPath, JSON.stringify({ version: 1, source: 'job-discovery-bot', jobs: draftJobs }, null, 2), 'utf8');
    console.log(`Saved ${draftJobs.length} ATS jobs to ${outputPath} for drafting`);

    const reviewOutputPath = path.join(process.cwd(), 'review_jobs.json');
    await fs.writeFile(reviewOutputPath, JSON.stringify({ version: 1, source: 'job-discovery-bot', jobs: reviewJobs }, null, 2), 'utf8');
    console.log(`Saved ${reviewJobs.length} review jobs to ${reviewOutputPath}`);

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
}

run().catch(console.error);
