import { chromium, Page } from 'playwright';

// Shared utilities — canonical source lives in job-discovery/src
import { signUrl, normalizeUrl, loadEnv, EXPIRED_REGEXES } from '@fresherflow/pipeline';
import { sendTelegramMessage } from '@fresherflow/utils';

await loadEnv();

const API_URL = (process.env.API_URL || '').trim().replace(/\/$/, '');
const INGESTION_URL = (process.env.INGESTION_URL || 'http://localhost:3005').trim().replace(/\/$/, '');
if (!process.env.INTERNAL_API_SECRET) {
    console.error('FATAL: INTERNAL_API_SECRET environment variable is required but not set.');
    process.exit(1);
}
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET.trim();

interface SweeperCheckResult {
    status: 'live' | 'expired' | 'review';
}

async function checkJob(page: Page, url: string, isSecondPass = false): Promise<SweeperCheckResult> {
    try {
        let response = null;
        let loadFailed = false;
        try {
            response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: isSecondPass ? 30000 : 15000 });
        } catch (gotoErr) {
            console.error(`Error loading ${url}:`, (gotoErr as Error).message);
            const errMsg = (gotoErr as Error).message.toLowerCase();
            if (errMsg.includes('net::err_name_not_resolved') || 
                errMsg.includes('net::err_connection_refused') || 
                errMsg.includes('net::err_address_unreachable') ||
                errMsg.includes('net::err_connection_aborted') ||
                errMsg.includes('net::err_connection_reset')
            ) {
                console.log(`  -> Hard network/DNS error: ${errMsg}. Marking as expired.`);
                return { status: 'expired' };
            }
            loadFailed = true;
        }

        if (response && (response.status() === 404 || response.status() === 410)) {
            console.log(`  -> Page returned inactive status code: ${response.status()}`);
            return { status: 'expired' };
        }

        if (response && (response.status() === 403 || response.status() === 401)) {
            console.log(`  -> Page returned auth/blocked status code: ${response.status()}. Marking for review.`);
            return { status: 'review' };
        }

        const finalUrl = page.url().toLowerCase();
        if (finalUrl.includes('not_found') || finalUrl.includes('jobnotfound') || finalUrl.includes('job-not-found') || finalUrl.includes('/jobnotfound') || finalUrl.includes('/job-not-found') || finalUrl.includes('/expired') || finalUrl.includes('error=true')) {
            console.log(`  -> URL indicates job not found / redirect to portal: ${page.url()}. Marking as expired.`);
            return { status: 'expired' };
        }
        
        // Smart Wait: Wait dynamically for Javascript/SPAs (like Workday/Upstox) to paint the job description text.
        await page.waitForFunction(() => {
            const main = document.querySelector('main, article, [data-automation-id="jobPostingSection"], #content, .job-description, [role="main"], [itemprop="description"], .job-sections, .sr-job-description');
            if (main && (main as HTMLElement).innerText.trim().length > 150) return true;
            return document.body && document.body.innerText.trim().length > 400;
        }, { timeout: isSecondPass ? 25000 : 8000 }).catch(() => {});

        // Give SPAs a moment to hydrate over their loading states (e.g. Eightfold "Job not found" flash)
        await page.waitForTimeout(2000);
        
        const pageTitle = await page.title().catch(() => "");
        const lowerTitle = pageTitle.toLowerCase().trim();
        if (lowerTitle.includes('403') || lowerTitle.includes('forbidden') || lowerTitle.includes('access denied') || lowerTitle.includes('checking your browser') || lowerTitle.includes('attention required')) {
            console.log(`  -> Access blocked (Forbidden/Cloudflare/403 page title: "${pageTitle}"). Marking for review.`);
            return { status: 'review' };
        }

        // Target main content containers first to avoid false positives from sidebars/footers
        let mainText = "";
        const contentSelectors = [
            '[itemprop="description"]',
            '.job-sections',
            '.sr-job-description',
            '[data-automation-id="jobPostingSection"]',
            '#careers-portal',
            '.job-description',
            'article',
            'main',
            '[role="main"]',
            '#content',
            '#main'
        ];
        for (const selector of contentSelectors) {
            const text = await page.locator(selector).first().innerText({ timeout: 100 }).catch(() => "");
            if (text && text.trim().length > 200) {
                mainText = text;
                break;
            }
        }

        let iframeText = "";
        try {
            for (const frame of page.frames()) {
                const fText = await frame.locator('body').innerText({ timeout: 100 }).catch(() => "");
                if (fText) iframeText += " " + fText;
            }
        } catch (e) {}

        const rawBody = await page.locator('body').innerText({ timeout: 500 }).catch(() => "");
        const bodyText = mainText || (rawBody + " " + iframeText); // Used for length check
        
        // Always check the FULL raw body (including toasts/modals outside main) for expired phrases
        const checkText = (rawBody + " " + iframeText).toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');

        let hasExpiredPhrase = false;
        for (const pattern of EXPIRED_REGEXES) {
            if (pattern.test(checkText)) {
                hasExpiredPhrase = true;
                break;
            }
        }

        if (hasExpiredPhrase) {
            return { status: 'expired' };
        }

        if (!bodyText || bodyText.trim().length < 150) {
            if (loadFailed) {
                console.log(`  -> Navigation failed and page body is empty/too short. Marking for review.`);
                return { status: 'review' };
            }
            console.log(`  -> Page body is empty or too short. Marking for review.`);
            return { status: 'review' };
        }

        return { status: 'live' };
    } catch (err) {
        console.error(`Error checking ${url}:`, (err as Error).message);
        return { status: 'review' };
    }
}

interface FeedOpportunity {
    id: string;
    slug?: string;
    title: string;
    company: string;
    applyLink?: string;
    sourceLink?: string;
    publishedAt?: string;
    type?: 'production' | 'discovered' | 'processed';
}

interface FeedJson {
    opportunities?: FeedOpportunity[];
}

async function run() {
    console.log("Fetching CDN feed...");
    
    // Wake up the backend API (if serverless) so it's warm by the time we finish
    if (API_URL) {
        console.log("Waking up API server...");
        fetch(`${API_URL}/api/health`).catch(() => {});
    }
    
    let feed: FeedJson | undefined;
    try {
        const url = signUrl('/bootstrap-feed.min.json');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Feed fetch failed: ${res.statusText}`);
        feed = await res.json() as FeedJson;
    } catch (err) {
        console.error("Failed to fetch CDN JSON", err instanceof Error ? err.message : String(err));
        process.exit(1);
    }

    let opportunities = feed?.opportunities || [];

    let ingestionSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(`Fetching jobs from Ingestion API (Attempt ${attempt}/3)...`);
            const res = await fetch(`${INGESTION_URL}/data/jobs/sweep-feed`, {
                headers: {
                    'Authorization': `Bearer ${INTERNAL_API_SECRET}`
                }
            });
            if (res.ok) {
                const ingestionFeed = await res.json() as { opportunities?: FeedOpportunity[] };
                if (ingestionFeed.opportunities && Array.isArray(ingestionFeed.opportunities)) {
                    opportunities = opportunities.concat(ingestionFeed.opportunities);
                    console.log(`Added ${ingestionFeed.opportunities.length} jobs from Ingestion API.`);
                }
                ingestionSuccess = true;
                break;
            } else {
                console.warn(`Ingestion feed fetch returned status: ${res.status}`);
                // Retry only on Gateway/Timeout errors which indicate cold start
                if (res.status !== 502 && res.status !== 503 && res.status !== 504) {
                    break; 
                }
            }
        } catch (err) {
            console.error(`Failed to fetch ingestion sweep feed on attempt ${attempt}:`, err instanceof Error ? err.message : String(err));
        }
        
        if (attempt < 3) {
            console.log("Waiting 20 seconds for Ingestion API to wake up...");
            await new Promise(r => setTimeout(r, 20000));
        }
    }

    if (!ingestionSuccess) {
        console.warn("Could not fetch from Ingestion API after all attempts. Proceeding with production jobs only.");
    }

    console.log(`Found ${opportunities.length} active opportunities to check.`);
    
    // Message 1: Summary
    await sendTelegramMessage(`🤖 <b>Job Sweeper Started</b>\n\nChecking ${opportunities.length} active jobs...`);

    const expiredJobs: FeedOpportunity[] = [];
    const reviewJobs: FeedOpportunity[] = [];
    const browser = await chromium.launch({ headless: true });
    
    try {
        // Limit to 8 concurrent pages/contexts to run in parallel safely
        const CONCURRENCY = 8;
        let checked = 0;
        
        const urlToOpps = new Map<string, FeedOpportunity[]>();
        const activeOpps: FeedOpportunity[] = [];

        for (const opp of opportunities) {
            const url = opp.sourceLink || opp.applyLink;
            if (!url) continue;
            
            const normalizedUrl = normalizeUrl(url);
            if (!urlToOpps.has(normalizedUrl)) {
                urlToOpps.set(normalizedUrl, []);
                activeOpps.push(opp);
            }
            urlToOpps.get(normalizedUrl)!.push(opp);
        }
        const totalUniqueUrls = activeOpps.length;

        const worker = async () => {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            
            try {
                // Block heavy resources (images, stylesheets, fonts, media) to speed up checking and prevent hangs
                await context.route('**/*', (route) => {
                    const type = route.request().resourceType();
                    if (['image', 'font', 'media'].includes(type)) {
                        route.abort();
                    } else {
                        route.continue();
                    }
                });
                
                const page = await context.newPage();
                try {
                    let opp: FeedOpportunity | undefined;
                    while (activeOpps.length > 0) {
                        opp = activeOpps.shift();
                        if (!opp) continue;
                        
                        const currentChecked = ++checked;
                        const targetUrl = opp.sourceLink || opp.applyLink;
                        if (!targetUrl) continue;

                        // Minimum age guard: Do not sweep jobs published in the last 24 hours
                        if (opp.publishedAt) {
                            const publishedDate = new Date(opp.publishedAt);
                            const ageHours = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
                            if (ageHours < 24) {
                                console.log(`[${currentChecked}/${totalUniqueUrls}] Skipping: ${opp.title} (Age: ${Math.round(ageHours)}h, < 24h)`);
                                continue;
                            }
                        }
                        
                        console.log(`[${currentChecked}/${totalUniqueUrls}] Checking: ${opp.title} @ ${opp.company}`);
                        
                        let checkResult: SweeperCheckResult = { status: 'review' };
                        try {
                            checkResult = await Promise.race([
                                checkJob(page, targetUrl),
                                new Promise<SweeperCheckResult>((_, reject) => setTimeout(() => reject(new Error('HARD_TIMEOUT')), 45000))
                            ]);
                        } catch (err: any) {
                            if (err.message === 'HARD_TIMEOUT') {
                                console.log(`  -> ⚠️ Hard timeout (stuck for 45s) for ${targetUrl}. Marking for review.`);
                                // If the page is completely frozen, we should ideally recreate it.
                                // However, Playwright pages usually recover from timeouts if navigation is aborted.
                            } else {
                                console.log(`  -> ⚠️ Unexpected error: ${err.message}`);
                            }
                        }
                        
                        const normalizedUrl = normalizeUrl(targetUrl);
                        const duplicates = urlToOpps.get(normalizedUrl) || [opp];
                        
                        if (checkResult.status === 'expired') {
                            console.log(`❌ EXPIRED: ${opp.title}`);
                            expiredJobs.push(...duplicates);
                        } else if (checkResult.status === 'review') {
                            console.log(`⚠️ REVIEW REQUIRED: ${opp.title}`);
                            reviewJobs.push(...duplicates);
                        } else {
                            console.log(`✅ LIVE: ${opp.title}`);
                        }
                        
                        // Anti-bot delay
                        await page.waitForTimeout(1500);
                    }
                } finally {
                    await page.close();
                }
            } finally {
                await context.close();
            }
        };

        // Run all workers concurrently
        const workers = Array.from({ length: CONCURRENCY }, () => worker());
        await Promise.all(workers);

        // SECOND PASS
        if (reviewJobs.length > 0) {
            console.log(`\n\n--- Starting Second Pass for ${reviewJobs.length} Review Jobs ---\n`);
            const uniqueReviewUrls = new Set<string>();
            const jobsToReview: FeedOpportunity[] = [];
            for (const j of reviewJobs) {
                const url = j.sourceLink || j.applyLink;
                if (!url) continue;
                const normalized = normalizeUrl(url);
                if (!uniqueReviewUrls.has(normalized)) {
                    uniqueReviewUrls.add(normalized);
                    jobsToReview.push(j);
                }
            }
            reviewJobs.length = 0; // clear, we will re-push if still failed
            
            let secondPassChecked = 0;
            const secondPassWorker = async () => {
                const context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                });
                
                try {
                    await context.route('**/*', (route) => {
                        const type = route.request().resourceType();
                        if (['image', 'font', 'media'].includes(type)) {
                            route.abort();
                        } else {
                            route.continue();
                        }
                    });
                    
                    const page = await context.newPage();
                    try {
                        let opp: FeedOpportunity | undefined;
                        while (jobsToReview.length > 0) {
                            opp = jobsToReview.shift();
                            if (!opp) continue;
                            
                            const currentChecked = ++secondPassChecked;
                            const targetUrl = opp.sourceLink || opp.applyLink;
                            if (!targetUrl) continue;

                            console.log(`[Second Pass ${currentChecked}] Checking: ${opp.title} @ ${opp.company}`);
                            let checkResult: SweeperCheckResult = { status: 'review' };
                            try {
                                checkResult = await Promise.race([
                                    checkJob(page, targetUrl, true),
                                    new Promise<SweeperCheckResult>((_, reject) => setTimeout(() => reject(new Error('HARD_TIMEOUT')), 60000))
                                ]);
                            } catch (err: any) {
                                if (err.message === 'HARD_TIMEOUT') {
                                    console.log(`  -> ⚠️ Hard timeout (stuck for 60s) for ${targetUrl}. Marking for review.`);
                                } else {
                                    console.log(`  -> ⚠️ Unexpected error: ${err.message}`);
                                }
                            }
                            
                            const normalizedUrl = normalizeUrl(targetUrl);
                            const duplicates = urlToOpps.get(normalizedUrl) || [opp];
                            
                            if (checkResult.status === 'expired') {
                                console.log(`❌ EXPIRED: ${opp.title}`);
                                expiredJobs.push(...duplicates);
                            } else if (checkResult.status === 'review') {
                                console.log(`⚠️ STILL NEEDS REVIEW: ${opp.title}`);
                                reviewJobs.push(...duplicates);
                            } else {
                                console.log(`✅ LIVE: ${opp.title}`);
                            }
                            
                            await page.waitForTimeout(1500);
                        }
                    } finally {
                        await page.close();
                    }
                } finally {
                    await context.close();
                }
            };

            const secondPassWorkers = Array.from({ length: Math.min(CONCURRENCY, jobsToReview.length) }, () => secondPassWorker());
            await Promise.all(secondPassWorkers);
        }
    } finally {
        await browser.close();
    }

    function escapeHtml(unsafe: string | null | undefined): string {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Auto-expire confirmed dead jobs via API
    const productionIds: string[] = [];
    const discoveredIds: string[] = [];
    const processedIds: string[] = [];

    for (const job of expiredJobs) {
        const id = job.slug || job.id;
        if (!id) continue;
        
        if (job.type === 'discovered') {
            discoveredIds.push(id);
        } else if (job.type === 'processed') {
            processedIds.push(id);
        } else {
            productionIds.push(id);
        }
    }

    if (productionIds.length > 0 && API_URL && INTERNAL_API_SECRET) {
        console.log(`\nCalling expire API for ${productionIds.length} dead production jobs...`);
        try {
            const res = await fetch(`${API_URL}/api/pipeline/expire-jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': INTERNAL_API_SECRET,
                },
                body: JSON.stringify({ ids: productionIds }),
            });
            const responseText = await res.text();
            if (res.ok) {
                try {
                    const json = JSON.parse(responseText) as { expired?: number; skipped?: number; notFound?: number };
                    console.log(`Expire API result — expired: ${json.expired}, skipped: ${json.skipped}, notFound: ${json.notFound}`);
                } catch {
                    console.log(`Expire API result (raw text): ${responseText}`);
                }
            } else {
                console.error(`Expire API error: Status ${res.status} — ${responseText}`);
            }
        } catch (err) {
            console.error('Failed to call expire API:', err instanceof Error ? err.message : String(err));
        }
    } else if (productionIds.length > 0) {
        console.warn('API_URL or INTERNAL_API_SECRET not set — skipping auto-expire API call for production jobs.');
    }

    if ((discoveredIds.length > 0 || processedIds.length > 0) && INGESTION_URL) {
        console.log(`\nCalling ingestion expire API for ${discoveredIds.length} discovered and ${processedIds.length} processed jobs...`);
        try {
            const res = await fetch(`${INGESTION_URL}/data/jobs/expire`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${INTERNAL_API_SECRET}`
                },
                body: JSON.stringify({ discoveredIds, processedIds }),
            });
            const responseText = await res.text();
            if (res.ok) {
                console.log(`Ingestion expire API result: ${responseText}`);
            } else {
                console.error(`Ingestion expire API error: Status ${res.status} — ${responseText}`);
            }
        } catch (err) {
            console.error('Failed to call ingestion expire API:', err instanceof Error ? err.message : String(err));
        }
    }

    // Message 2: Results
    if (expiredJobs.length > 0 || reviewJobs.length > 0) {
        let msg = "";
        
        if (expiredJobs.length > 0) {
            const expiredProduction = expiredJobs.filter(j => j.type !== 'discovered' && j.type !== 'processed');
            const expiredProcessed = expiredJobs.filter(j => j.type === 'processed');
            const expiredDiscovered = expiredJobs.filter(j => j.type === 'discovered');

            msg += `🚨 <b>Found ${expiredJobs.length} Expired Jobs — Automatically Removed</b> 🚨\n`;
            if (expiredProduction.length > 0) msg += `• Production Jobs: ${expiredProduction.length}\n`;
            if (expiredProcessed.length > 0) msg += `• Processed (Pending): ${expiredProcessed.length}\n`;
            if (expiredDiscovered.length > 0) msg += `• Discovered (New): ${expiredDiscovered.length}\n`;
            msg += `\n`;
        }
        
        if (reviewJobs.length > 0) {
            msg += `⚠️ <b>Found ${reviewJobs.length} Review Required Jobs (Generic Titles/Redirects)</b> ⚠️\n\n`;
            msg += `Please review these manually from the Admin Dashboard.`;
        }
        
        console.log("Sending Telegram message:", msg);
        await sendTelegramMessage(msg);
    } else {
        await sendTelegramMessage(`✅ <b>Job Sweeper Finished</b>\n\nAll ${opportunities.length} jobs appear to be live! No expired or review jobs found.`);
    }

    // Write summary for GitHub Actions
    if (process.env.GITHUB_STEP_SUMMARY) {
        const fs = await import('fs/promises');
        

        let summary = `## Job Sweeper Results\n\nChecked ${opportunities.length} jobs. Found ${expiredJobs.length} expired jobs and ${reviewJobs.length} review required jobs.\n\n`;
        if (expiredJobs.length > 0) {
            summary += `### Expired Jobs\n`;
            expiredJobs.forEach(j => {
                summary += `- **${j.company}**: ${j.title} (Apply Link: ${j.sourceLink || j.applyLink || 'None'})\n`;
            });
            summary += `\n`;
        }
        if (reviewJobs.length > 0) {
            summary += `### Review Required Jobs (Generic Titles/Redirects)\n`;
            reviewJobs.forEach(j => {
                summary += `- **${j.company}**: ${j.title} (Apply Link: ${j.applyLink || j.sourceLink || 'None'})\n`;
            });
            summary += `\n`;
        }
        if (expiredJobs.length === 0 && reviewJobs.length === 0) {
            summary += `All jobs are active and live.`;
        }
        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }
}

run().catch(console.error);
