import { chromium, Page } from 'playwright';

// Shared utilities — canonical source lives in job-discovery/src
import { signUrl } from '../job-discovery/src/utils/url.js';
import { sendTelegramMessage } from '../job-discovery/src/utils/telegram.js';
import { EXPIRED_REGEXES, loadEnv } from '../job-discovery/src/config.js';
import { listR2Objects, deleteR2Object } from '../job-discovery/src/utils/r2.js';

await loadEnv();

const API_URL = (process.env.API_URL || '').trim().replace(/\/$/, '');
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
        if (finalUrl.includes('not_found') || finalUrl.includes('jobnotfound') || finalUrl.includes('job-not-found') || finalUrl.includes('/jobnotfound') || finalUrl.includes('/job-not-found')) {
            console.log(`  -> URL indicates job not found / redirect to portal: ${page.url()}. Marking as expired.`);
            return { status: 'expired' };
        }
        
        // Smart Wait: Wait dynamically for Javascript/SPAs (like Workday/Upstox) to paint the job description text.
        await page.waitForFunction(() => {
            const main = document.querySelector('main, article, [data-automation-id="jobPostingSection"], #content, .job-description, [role="main"]');
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
        const bodyText = mainText || (rawBody + " " + iframeText);
        const lowerText = bodyText.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');

        let hasExpiredPhrase = false;
        for (const pattern of EXPIRED_REGEXES) {
            if (pattern.test(lowerText)) {
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
    slug: string;
    title: string;
    company: string;
    applyLink?: string;
    sourceLink?: string;
    publishedAt?: string;
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

    const opportunities = feed?.opportunities || [];
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
        
        const activeOpps = opportunities.filter((opp) => opp.applyLink || opp.sourceLink);

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
                        const targetUrl = opp.applyLink || opp.sourceLink;
                        if (!targetUrl) continue;

                        // Minimum age guard: Do not sweep jobs published in the last 24 hours
                        if (opp.publishedAt) {
                            const publishedDate = new Date(opp.publishedAt);
                            const ageHours = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
                            if (ageHours < 24) {
                                console.log(`[${currentChecked}/${opportunities.length}] Skipping: ${opp.title} (Age: ${Math.round(ageHours)}h, < 24h)`);
                                continue;
                            }
                        }
                        
                        console.log(`[${currentChecked}/${opportunities.length}] Checking: ${opp.title} @ ${opp.company}`);
                        const checkResult = await checkJob(page, targetUrl);
                        
                        if (checkResult.status === 'expired') {
                            console.log(`❌ EXPIRED: ${opp.title}`);
                            expiredJobs.push(opp);
                        } else if (checkResult.status === 'review') {
                            console.log(`⚠️ REVIEW REQUIRED: ${opp.title}`);
                            reviewJobs.push(opp);
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
            const jobsToReview = [...reviewJobs];
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
                            const targetUrl = opp.applyLink || opp.sourceLink;
                            if (!targetUrl) continue;

                            console.log(`[Second Pass ${currentChecked}] Checking: ${opp.title} @ ${opp.company}`);
                            const checkResult = await checkJob(page, targetUrl, true);
                            
                            if (checkResult.status === 'expired') {
                                console.log(`❌ EXPIRED: ${opp.title}`);
                                expiredJobs.push(opp);
                            } else if (checkResult.status === 'review') {
                                console.log(`⚠️ STILL NEEDS REVIEW: ${opp.title}`);
                                reviewJobs.push(opp);
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
    if (expiredJobs.length > 0 && API_URL && INTERNAL_API_SECRET) {
        const ids = expiredJobs.map((j) => j.slug || j.id).filter(Boolean);
        console.log(`\nCalling expire API for ${ids.length} dead jobs...`);
        try {
            const res = await fetch(`${API_URL}/api/pipeline/expire-jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': INTERNAL_API_SECRET,
                },
                body: JSON.stringify({ ids }),
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
    } else if (expiredJobs.length > 0) {
        console.warn('API_URL or INTERNAL_API_SECRET not set — skipping auto-expire API call.');
    }

    // Message 2: Results
    if (expiredJobs.length > 0 || reviewJobs.length > 0) {
        let msg = "";
        
        if (expiredJobs.length > 0) {
            msg += `🚨 <b>Found ${expiredJobs.length} Expired Jobs — Automatically Removed from Platform</b> 🚨\n\n`;
            const displayJobs = expiredJobs.slice(0, 15);
            for (const job of displayJobs) {
                msg += `- <b>${escapeHtml(job.company)}</b>: ${escapeHtml(job.title)}\n  Apply Link: ${job.applyLink || job.sourceLink || 'None'}\n`;
            }
            if (expiredJobs.length > 15) {
                msg += `...and ${expiredJobs.length - 15} more!\n\n`;
            }
        }
        
        if (reviewJobs.length > 0) {
            msg += `⚠️ <b>Found ${reviewJobs.length} Review Required Jobs (Generic Titles/Redirects)</b> ⚠️\n\n`;
            const displayReview = reviewJobs.slice(0, 10);
            for (const job of displayReview) {
                msg += `- <b>${escapeHtml(job.company)}</b>: ${escapeHtml(job.title)}\n  Apply Link: ${job.applyLink || job.sourceLink || 'None'}\n`;
            }
            if (reviewJobs.length > 10) {
                msg += `...and ${reviewJobs.length - 10} more!\n\n`;
            }
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
        
        // Message 3: Results
        let finalMsg = `🏁 <b>Job Sweeper Finished</b>\n\n`;
        finalMsg += `Checked: ${opportunities.length}\n`;
        finalMsg += `Expired & Removed: ${expiredJobs.length}\n`;
        finalMsg += `Failed Verification: ${reviewJobs.length}\n\n`;
        
        if (expiredJobs.length > 0) {
            finalMsg += `<b>Removed Jobs (First 10):</b>\n`;
            for (const opp of expiredJobs.slice(0, 10)) {
                finalMsg += `- ${opp.title} (${opp.company})\n`;
            }
        }
        
        console.log("Sending final summary to Telegram...");
        await sendTelegramMessage(finalMsg);

        // ── R2 Micro-JSON Cleanup Pass ───────────────────────────────────────
        console.log("\n--- Starting R2 Pending Jobs Cleanup ---");
        if (!process.env.R2_BUCKET_NAME) {
            throw new Error('FATAL: R2_BUCKET_NAME environment variable is required but not set.');
        }
        const r2Bucket: string = process.env.R2_BUCKET_NAME;
        const pendingObjects = await listR2Objects(r2Bucket, 'pending-jobs/');
        
        if (pendingObjects.length > 0) {
            console.log(`Found ${pendingObjects.length} pending jobs in R2 to verify...`);
            let r2ExpiredCount = 0;
            
            // Limit concurrency for R2 check
            const R2_CONCURRENCY = 5;
            const r2Queue = [...pendingObjects];
            
            const r2Worker = async () => {
                const context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                });
                await context.route('**/*', (route) => {
                    const type = route.request().resourceType();
                    if (['image', 'font', 'media'].includes(type)) route.abort();
                    else route.continue();
                });
                const page = await context.newPage();
                
                try {
                    while (r2Queue.length > 0) {
                        const obj = r2Queue.shift();
                        if (!obj || !obj.Key) continue;
                        
                        // Extract base64 URL from key: pending-jobs/2026-07-10/BASE64.json
                        const parts = obj.Key.split('/');
                        const filename = parts[parts.length - 1];
                        const base64Str = filename.replace('.json', '');
                        
                        let targetUrl = '';
                        try {
                            targetUrl = Buffer.from(base64Str.replace(/_/g, '/'), 'base64').toString('utf-8');
                        } catch (e) {
                            console.error(`Could not decode URL from R2 key: ${obj.Key}`);
                            continue;
                        }
                        
                        if (!targetUrl.startsWith('http')) {
                            console.log(`Invalid URL extracted from R2: ${targetUrl}. Skipping.`);
                            continue;
                        }

                        console.log(`Checking R2 Pending Job: ${targetUrl}`);
                        const checkResult = await checkJob(page, targetUrl);
                        
                        if (checkResult.status === 'expired') {
                            console.log(`❌ EXPIRED R2 JOB: ${targetUrl} - Deleting from bucket...`);
                            await deleteR2Object(r2Bucket, obj.Key);
                            r2ExpiredCount++;
                        } else {
                            console.log(`✅ LIVE R2 JOB: ${targetUrl}`);
                        }
                    }
                } finally {
                    await page.close();
                    await context.close();
                }
            };
            
            const r2Workers = Array.from({ length: R2_CONCURRENCY }, () => r2Worker());
            await Promise.all(r2Workers);
            console.log(`\nR2 Cleanup Finished. Deleted ${r2ExpiredCount} expired pending jobs.`);
        } else {
            console.log("No pending jobs found in R2.");
        }

        let summary = `## Job Sweeper Results\n\nChecked ${opportunities.length} jobs. Found ${expiredJobs.length} expired jobs and ${reviewJobs.length} review required jobs.\n\n`;
        if (expiredJobs.length > 0) {
            summary += `### Expired Jobs\n`;
            expiredJobs.forEach(j => {
                summary += `- **${j.company}**: ${j.title} (Apply Link: ${j.applyLink || j.sourceLink || 'None'})\n`;
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
