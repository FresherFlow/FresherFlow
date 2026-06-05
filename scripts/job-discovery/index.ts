import { chromium, Page, BrowserContext } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// --- CONFIGURATION ---
const CDN_SECRET = (process.env.CDN_SIGNATURE_SECRET || '').trim().replace(/^["']|["']$/g, '');
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^bot/i, '');
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim().replace(/^["']|["']$/g, '');
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.fresherflow.in';

const TARGET_SITES = [
    { url: 'https://job4freshers.co.in/', name: 'job4freshers' },
    { url: 'https://jobsaddafreshers.com/', name: 'jobsaddafreshers' },
    { url: 'https://internshipss.com/', name: 'internshipss' }
];

const VISITED_FILE = path.join(process.cwd(), 'visited_urls.json');

// Phrases indicating the job is no longer active
const EXPIRED_PHRASES = [
    "no longer available",
    "position has been filled",
    "position closed",
    "no longer accepting applications",
    "job has expired",
    "job is no longer active",
    "this job is closed",
    "requisition is closed",
    "the page you are looking for doesn't exist"
];

// Phrases indicating it's a fresher job
const FRESHER_PHRASES = [
    "0 years",
    "0 year",
    "fresher",
    "freshers",
    "experience: 0",
    "entry level",
    "entry-level"
];

// Phrases indicating it's NOT a fresher job (we skip if we see these AND we don't see fresher phrases)
const EXPERIENCED_PHRASES = [
    "1+ years",
    "2+ years",
    "3+ years",
    "1 year experience",
    "2 years experience",
    "minimum 1 year",
    "minimum 2 years"
];

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
        console.warn("Telegram credentials missing, skipping message.");
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

// Strip query parameters for normalized comparison
function normalizeUrl(urlStr: string): string {
    try {
        const url = new URL(urlStr);
        return `${url.origin}${url.pathname}`.replace(/\/$/, '');
    } catch {
        return urlStr.split('?')[0].replace(/\/$/, '');
    }
}

// Load cached visited URLs
async function loadVisited(): Promise<Record<string, string[]>> {
    try {
        const data = await fs.readFile(VISITED_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Save visited URLs
async function saveVisited(visited: Record<string, string[]>) {
    await fs.writeFile(VISITED_FILE, JSON.stringify(visited, null, 2));
}

// Is this a fresher job?
function isFresherJob(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // If it explicitly says fresher, it is.
    for (const phrase of FRESHER_PHRASES) {
        if (lowerText.includes(phrase)) return true;
    }

    // If it doesn't say fresher, and it explicitly asks for experience, it isn't.
    for (const phrase of EXPERIENCED_PHRASES) {
        if (lowerText.includes(phrase)) return false;
    }

    // Default to false to avoid noise, or true to be aggressive?
    // Let's default to false unless we're sure it's an entry level/fresher job based on the site context,
    // actually since these sites are literally named "job4freshers", we might want to default true if no experienced phrases are found.
    return true; 
}

// Check if job is live (using existing sweeper logic)
async function isJobLive(page: Page, url: string): Promise<boolean> {
    try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (!response) return true; // Treat as live if timeout/blocked
        if (response.status() === 404 || response.status() === 410) {
            return false;
        }
        
        await page.waitForTimeout(2000);
        const bodyText = await page.locator('body').innerText();
        const lowerText = bodyText.toLowerCase();

        for (const phrase of EXPIRED_PHRASES) {
            if (lowerText.includes(phrase)) {
                return false;
            }
        }
        return true;
    } catch (err) {
        return true; // Better false positive than false negative
    }
}

// Find actual ATS link
async function findActualApplyLink(page: Page, context: BrowserContext, currentDomain: string): Promise<string | null> {
    try {
        // Collect all external links
        const links = await page.$$eval('a', anchors => anchors.map(a => a.href));
        const externalLinks = links.filter(l => {
            try {
                const u = new URL(l);
                // Exclude links that just go to the same domain, or to social media/ads
                return u.hostname !== currentDomain 
                    && !u.hostname.includes('facebook')
                    && !u.hostname.includes('twitter')
                    && !u.hostname.includes('linkedin')
                    && !u.hostname.includes('whatsapp')
                    && !u.hostname.includes('telegram');
            } catch {
                return false;
            }
        });

        // Heuristic: If we see a known ATS link, return it immediately
        for (const link of externalLinks) {
            if (link.includes('workday') || link.includes('greenhouse') || link.includes('lever') || link.includes('myworkdayjobs')) {
                return link;
            }
        }

        // If no direct ATS, try to click a button that looks like "Apply"
        const applyButtons = await page.$$('a:text-matches("(?i)apply")');
        if (applyButtons.length > 0) {
            // Wait for potential new tab
            const [newPage] = await Promise.all([
                context.waitForEvent('page').catch(() => null),
                applyButtons[0].click({ timeout: 5000 }).catch(() => null)
            ]);

            if (newPage) {
                await newPage.waitForLoadState();
                const url = newPage.url();
                await newPage.close();
                return url;
            } else {
                // If it redirected the current page
                await page.waitForTimeout(3000);
                const currentUrl = page.url();
                try {
                    const u = new URL(currentUrl);
                    if (u.hostname !== currentDomain) {
                        return currentUrl;
                    }
                } catch {}
            }
        }
        
        // Return first external link as a fallback
        return externalLinks.length > 0 ? externalLinks[0] : null;

    } catch (err) {
        console.error("Error finding actual apply link:", (err as Error).message);
        return null;
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

    const knownLinks = new Set<string>();
    for (const opp of (feed.opportunities || [])) {
        if (opp.applyLink) knownLinks.add(normalizeUrl(opp.applyLink));
        if (opp.sourceLink) knownLinks.add(normalizeUrl(opp.sourceLink));
    }

    console.log(`Loaded ${knownLinks.size} known links from CDN.`);
    
    const visited = await loadVisited();
    const newJobsFound: { title: string, applyLink: string, source: string }[] = [];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    for (const site of TARGET_SITES) {
        console.log(`\n--- Scraping ${site.name} ---`);
        if (!visited[site.name]) visited[site.name] = [];
        
        const page = await context.newPage();
        try {
            await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Very naive way to find job posts on the homepage: look for links containing "job" or "hiring" or "recruitment"
            const allLinks = await page.$$eval('a', anchors => anchors.map(a => ({ text: a.innerText.trim(), href: a.href })));
            
            const siteDomain = new URL(site.url).hostname;
            const jobLinks = [...new Set(allLinks
                .filter(l => l.href.includes(siteDomain) && (l.href.includes('job') || l.href.includes('hiring') || l.href.includes('recruitment')))
                .map(l => l.href))];

            console.log(`Found ${jobLinks.length} potential job posts on ${site.name} homepage.`);

            for (const jobLink of jobLinks.slice(0, 10)) { // Limit to 10 for now
                if (visited[site.name].includes(jobLink)) {
                    console.log(`Skipping visited: ${jobLink}`);
                    continue;
                }

                console.log(`Checking: ${jobLink}`);
                visited[site.name].push(jobLink);

                await page.goto(jobLink, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
                await page.waitForTimeout(2000);
                
                const bodyText = await page.locator('body').innerText().catch(() => "");
                
                if (!isFresherJob(bodyText)) {
                    console.log(`  -> Skipping: Not a fresher job.`);
                    continue;
                }

                // Try to find the apply link
                const applyLink = await findActualApplyLink(page, context, siteDomain);
                if (!applyLink) {
                    console.log(`  -> Failed to extract apply link.`);
                    continue;
                }

                const normalizedApplyLink = normalizeUrl(applyLink);
                if (knownLinks.has(normalizedApplyLink)) {
                    console.log(`  -> Skipping: Already in our CDN (${normalizedApplyLink})`);
                    continue;
                }

                console.log(`  -> Checking if actual link is live: ${applyLink}`);
                const isLive = await isJobLive(page, applyLink);

                if (isLive) {
                    console.log(`  ✅ FOUND NEW LIVE JOB: ${applyLink}`);
                    const titleMatch = bodyText.split('\n').find(l => l.trim().length > 10 && l.length < 100) || "Job Title Unknown";
                    newJobsFound.push({
                        title: titleMatch,
                        applyLink: applyLink,
                        source: site.name
                    });
                } else {
                    console.log(`  -> Job appears expired.`);
                }
            }
        } catch (err) {
            console.error(`Error scraping ${site.name}:`, (err as Error).message);
        } finally {
            await page.close();
        }
    }

    await browser.close();
    await saveVisited(visited);

    if (newJobsFound.length > 0) {
        let msg = `🔥 <b>Job Discovery Bot Found ${newJobsFound.length} New Fresher Jobs!</b> 🔥\n\n`;
        for (const job of newJobsFound) {
            msg += `- <b>${job.title}</b> (via ${job.source})\n  Link: ${job.applyLink}\n\n`;
        }
        msg += `Please add these to the Admin Dashboard.`;
        console.log("Sending Telegram message:", msg);
        await sendTelegramMessage(msg);
    } else {
        console.log("No new jobs found this run.");
    }
}

run().catch(console.error);
