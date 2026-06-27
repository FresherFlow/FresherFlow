import { chromium, Page } from 'playwright';
import crypto from 'node:crypto';

const CDN_SECRET = (process.env.CDN_SIGNATURE_SECRET || '').trim().replace(/^["']|["']$/g, '');
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^bot/i, '');
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim().replace(/^["']|["']$/g, '');
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.fresherflow.in';
const API_URL = (process.env.API_URL || '').trim().replace(/\/$/, '');
const INTERNAL_API_SECRET = (process.env.INTERNAL_API_SECRET || '').trim();

// Helper to sign the CDN URL
function signUrl(pathname: string): string {
    if (!CDN_SECRET) throw new Error("CDN_SIGNATURE_SECRET is missing");
    const t = Math.floor(Date.now() / 1000);
    const message = `${pathname}:${t}`;
    const sig = crypto.createHmac('sha256', CDN_SECRET).update(message).digest('hex');
    return `${CDN_URL}${pathname}?t=${t}&sig=${sig}`;
}

async function sendTelegramMessage(text: string) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn("Telegram credentials missing, skipping message:", text);
        return;
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
        if (!res.ok) {
            console.error("Failed to send telegram message:", await res.text());
        }
    } catch (err) {
        console.error("Error sending to telegram:", err);
    }
}

// Key phrases that ATS systems use when a job is closed.
// IMPORTANT: Keep these specific. Broad phrases like "no longer available" or "has expired"
// cause false positives by matching footer text, FAQs, cookie banners, or session messages.
const EXPIRED_PHRASES = [
    // Specific ATS expiry messages
    "the job you are trying to apply for is no longer available",
    "this job is no longer accepting applications",
    "this requisition is no longer accepting applications",
    "this job is no longer available",
    "this job is not available",
    "this job is closed",
    "job posting is no longer active",
    "job is no longer active",
    "job has expired",
    "requisition is closed",
    "position has been filled",
    "position closed",
    "role is no longer available",
    "no longer accepting applications via careers",
    "not accepting applications for this job",
    "not accepting applications for this position",
    "currently not accepting applications",
    "please explore other open opportunities",
    "job does not exist or is not currently active",
    "job does not exist",
    "the job you requested was not found",
    "we couldn't find the job posting you're looking for",
    "we couldnt find the job posting you're looking for",
    "may have been filled or deactivated",
    "doesn't seem to exist or may have been removed",
    "doesnt seem to exist or may have been removed",
    "position you're looking for may have been filled",
    // ATS-specific UX phrases
    "you can't view this job because it's not available at this time",
    "you cant view this job because it's not available at this time",
    "you cant view this job because its not available at this time",
    "you can't view this job because its not available at this time",
    "job is not available at this time",
    "not available at this time",
];

interface SweeperCheckResult {
    status: 'live' | 'expired' | 'review';
}

async function checkJob(page: Page, url: string): Promise<SweeperCheckResult> {
    try {
        let response = null;
        let loadFailed = false;
        try {
            response = await page.goto(url, { waitUntil: 'load', timeout: 20000 });
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
        
        // Wait a tiny bit for JS rendered ATS like Workday to paint text
        await page.waitForTimeout(4000);
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
            const text = await page.locator(selector).first().innerText().catch(() => "");
            if (text && text.trim().length > 200) {
                mainText = text;
                break;
            }
        }

        const bodyText = mainText || (await page.locator('body').innerText().catch(() => ""));

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

async function run() {
    console.log("Fetching CDN feed...");
    let feed;
    try {
        const url = signUrl('/bootstrap-feed.min.json');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Feed fetch failed: ${res.statusText}`);
        feed = await res.json();
    } catch (err) {
        console.error("Failed to fetch CDN JSON", err);
        process.exit(1);
    }

    const opportunities = feed.opportunities || [];
    console.log(`Found ${opportunities.length} active opportunities to check.`);
    
    // Message 1: Summary
    await sendTelegramMessage(`🤖 <b>Job Sweeper Started</b>\n\nChecking ${opportunities.length} active jobs...`);

    const expiredJobs: any[] = [];
    const reviewJobs: any[] = [];
    const browser = await chromium.launch({ headless: true });
    
    // Limit to 1 tab for safety to avoid getting IP blocked too fast
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
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

    let checked = 0;
    for (const opp of opportunities) {
        checked++;
        const targetUrl = opp.applyLink || opp.sourceLink;
        if (!targetUrl) continue;
        
        console.log(`[${checked}/${opportunities.length}] Checking: ${opp.title} @ ${opp.company}`);
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

    await browser.close();

    function escapeHtml(unsafe: string) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Auto-expire confirmed dead jobs via API
    if (expiredJobs.length > 0 && API_URL && INTERNAL_API_SECRET) {
        const ids = expiredJobs.map((j: any) => j.slug || j.id).filter(Boolean);
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
            const json = await res.json() as { expired?: number; skipped?: number; notFound?: number };
            if (res.ok) {
                console.log(`Expire API result — expired: ${json.expired}, skipped: ${json.skipped}, notFound: ${json.notFound}`);
            } else {
                console.error('Expire API error:', json);
            }
        } catch (err) {
            console.error('Failed to call expire API:', (err as Error).message);
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
