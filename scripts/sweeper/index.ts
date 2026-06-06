import { chromium, Page } from 'playwright';
import crypto from 'node:crypto';

const CDN_SECRET = (process.env.CDN_SIGNATURE_SECRET || '').trim().replace(/^["']|["']$/g, '');
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^bot/i, '');
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim().replace(/^["']|["']$/g, '');
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.fresherflow.in';

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

// Key phrases that ATS systems use when a job is closed
const EXPIRED_PHRASES = [
    "no longer available",
    "position has been filled",
    "position closed",
    "no longer accepting applications",
    "job has expired",
    "job is no longer active",
    "this job is closed",
    "requisition is closed",
    "the page you are looking for doesn't exist",
    "the job you requested was not found",
    "job not found"
];

async function checkJob(page: Page, url: string): Promise<boolean> {
    try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (!response) return true; // Treat as failed/expired if we can't even load it
        if (response.status() === 404 || response.status() === 410) {
            return true; // Hard 404 means expired
        }
        
        // Wait a tiny bit for JS rendered ATS like Workday to paint text
        await page.waitForTimeout(2000);
        const bodyText = await page.locator('body').innerText();
        const lowerText = bodyText.toLowerCase();

        for (const phrase of EXPIRED_PHRASES) {
            if (lowerText.includes(phrase)) {
                return true;
            }
        }
        return false;
    } catch (err) {
        console.error(`Error checking ${url}:`, (err as Error).message);
        return false; // On timeout or captcha block, don't assume expired. Better false negative than false positive.
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
    const browser = await chromium.launch({ headless: true });
    
    // Limit to 1 tab for safety to avoid getting IP blocked too fast
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();

    let checked = 0;
    for (const opp of opportunities) {
        checked++;
        const targetUrl = opp.applyLink || opp.sourceLink;
        if (!targetUrl) continue;
        
        console.log(`[${checked}/${opportunities.length}] Checking: ${opp.title} @ ${opp.company}`);
        const isExpired = await checkJob(page, targetUrl);
        
        if (isExpired) {
            console.log(`❌ EXPIRED: ${opp.title}`);
            expiredJobs.push(opp);
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

    // Message 2: Results
    if (expiredJobs.length > 0) {
        let msg = `🚨 <b>Found ${expiredJobs.length} Expired Jobs</b> 🚨\n\n`;
        const displayJobs = expiredJobs.slice(0, 15);
        for (const job of displayJobs) {
            msg += `- <b>${escapeHtml(job.company)}</b>: ${escapeHtml(job.title)}\n  ID: <code>${job.id}</code>\n`;
        }
        if (expiredJobs.length > 15) {
            msg += `...and ${expiredJobs.length - 15} more!\n\n`;
        }
        msg += `\nPlease delete these from the Admin Dashboard.`;
        console.log("Sending Telegram message:", msg);
        await sendTelegramMessage(msg);
    } else {
        await sendTelegramMessage(`✅ <b>Job Sweeper Finished</b>\n\nAll ${opportunities.length} jobs appear to be live! No expired jobs found.`);
    }

    // Write summary for GitHub Actions
    if (process.env.GITHUB_STEP_SUMMARY) {
        const fs = await import('fs/promises');
        let summary = `## Job Sweeper Results\n\nChecked ${opportunities.length} jobs. Found ${expiredJobs.length} expired jobs.\n\n`;
        if (expiredJobs.length > 0) {
            summary += `### Expired Jobs\n`;
            expiredJobs.forEach(j => {
                summary += `- **${j.company}**: ${j.title} (ID: \`${j.id}\`)\n`;
            });
        }
        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }
}

run().catch(console.error);
