import { chromium, Page } from 'playwright';

// Shared utilities — canonical source lives in job-discovery/src
import { signUrl } from '../job-discovery/src/utils/url.js';
import { sendTelegramMessage } from '../job-discovery/src/utils/telegram.js';
import { EXPIRED_PHRASES, loadEnv } from '../job-discovery/src/config.js';

await loadEnv();

const API_URL = (process.env.API_URL || '').trim().replace(/\/$/, '');
const INTERNAL_API_SECRET = (process.env.INTERNAL_API_SECRET || '').trim();

interface SweeperCheckResult {
    status: 'live' | 'expired' | 'review';
}

async function checkJob(page: Page, url: string): Promise<SweeperCheckResult> {
    try {
        let response = null;
        let loadFailed = false;
        try {
            response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
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
            console.log(`  -> URL indicates job not found / redirect to portal: ${page.url()}. Marking for review.`);
            return { status: 'review' };
        }
        
        // Smart Wait: Wait dynamically for Javascript/SPAs (like Workday/Upstox) to paint the job description text.
        // It finishes instantly if the text is already there, but waits up to 8 seconds for slow API calls to finish rendering.
        await page.waitForFunction(() => {
            return document.body && document.body.innerText.trim().length > 100;
        }, { timeout: 8000 }).catch(() => {});
        
        const pageTitle = await page.title().catch(() => "");
        const lowerTitle = pageTitle.toLowerCase().trim();
        if (lowerTitle.includes('403') || lowerTitle.includes('forbidden') || lowerTitle.includes('access denied') || lowerTitle.includes('checking your browser') || lowerTitle.includes('attention required')) {
            console.log(`  -> Access blocked (Forbidden/Cloudflare/403 page title: "${pageTitle}"). Marking for review.`);
            return { status: 'review' };
        }
        if (/^(careers|career search|careersearch|search careers|careers search|job search|jobsearch|opportunities|job opportunities|career opportunities|open positions|current openings|search jobs|search for jobs|login|sign in|welcome|jobs|job|search)$/i.test(lowerTitle)) {
            console.log(`  -> Page title is generic ("${pageTitle}"). Marking for review.`);
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

        const bodyText = mainText || (await page.locator('body').innerText({ timeout: 500 }).catch(() => ""));

        if (!bodyText || bodyText.trim().length < 100) {
            if (loadFailed) {
                console.log(`  -> Navigation failed and page body is empty/too short. Marking for review.`);
                return { status: 'review' };
            }
            console.log(`  -> Page body is empty or too short. Marking for review.`);
            return { status: 'review' };
        }
        const lowerText = bodyText.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');

        for (const phrase of EXPIRED_PHRASES) {
            if (lowerText.includes(phrase)) {
                return { status: 'expired' };
            }
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
                    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
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
