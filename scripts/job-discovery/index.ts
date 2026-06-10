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
    { url: 'https://frontlinesmedia.in/tag/fresher-jobs/', name: 'frontlinesmedia' },
    { url: 'https://govtjobmart.in/', name: 'govtjobmart' },
    { url: 'https://findmyjobss.com/', name: 'findmyjobss' },
    { url: 'https://jobs.dailypharmajobs.in/', name: 'dailypharmajobs' },
    { url: 'https://skillbloom.ashokworld.in/', name: 'skillbloom' },
    { url: 'https://jobsaddafreshers.com/category/freshers/', name: 'jobsaddafreshers' },
    { url: 'https://internshipss.com/', name: 'internshipss' },
    { url: 'https://www.freshersvoice.com/', name: 'freshersvoice' },
    { url: 'https://placementdrive.in/', name: 'placementdrive' },
    { url: 'https://freshershunt.in/', name: 'freshershunt' },
    { url: 'https://fresheropenings.com/', name: 'fresheropenings' },
    { url: 'https://freshersjobsaadda.blogspot.com/search', name: 'freshersjobsaadda' }
];

const VISITED_FILE = path.join(process.cwd(), 'visited_urls.json');

const EXPIRED_PHRASES = [
    "no longer available",
    "the job you are trying to apply for is no longer available",
    "position has been filled",
    "position closed",
    "no longer accepting applications",
    "this job is no longer accepting applications",
    "job has expired",
    "job is no longer active",
    "job posting is no longer active",
    "no longer active",
    "this job is closed",
    "requisition is closed",
    "the page you are looking for doesn't exist",
    "the job you requested was not found",
    "job not found",
    "page not found",
    "an error has occurred",
    "you can't view this job because it's not available at this time",
    "you cant view this job because it's not available at this time",
    "you cant view this job because its not available at this time",
    "you can't view this job because its not available at this time",
    "not available at this time",
    "job is not available at this time",
    "job is not available at this time."
];

// Phrases indicating it's a fresher job
const FRESHER_PHRASES = [
    "0 years",
    "0 year",
    "fresher",
    "freshers",
    "experience: 0",
    "entry level",
    "entry-level",
    "intern",
    "internship",
    "graduate",
    "graduate engineer",
    "graduate trainee",
    "trainee",
    "associate",
    "junior",
    "campus hiring",
    "off campus",
    "software engineer i",
    "sde 1",
    "analyst",
    "business analyst",
    "data analyst",
    "apprentice"
];

// Phrases indicating it's NOT a fresher job (we skip if we see these AND we don't see fresher phrases)
const EXPERIENCED_PHRASES = [
    "1+ years",
    "2+ years",
    "3+ years",
    "4+ years",
    "5+ years",
    "6+ years",
    "7+ years",
    "8+ years",
    "10+ years",
    "1+ year",
    "1 + year",
    "1+ yr",
    "1 + yr",
    "1.5+ years",
    "1.5 years",
    "18+ months",
    "12+ months",
    "24+ months",
    "12 months",
    "18 months",
    "24 months",
    "1 year of exp",
    "1 year exp",
    "1+ exp",
    "2+ exp",
    "3+ exp",
    "4+ exp",
    "5+ exp",
    "6+ exp",
    "7+ exp",
    "8+ exp",
    "10+ exp",
    "2 yrs",
    "3 yrs",
    "4 yrs",
    "5 yrs",
    "6 yrs",
    "7 yrs",
    "8 yrs",
    "10 yrs",
    "2yrs",
    "3yrs",
    "4yrs",
    "5yrs",
    "6yrs",
    "7yrs",
    "8yrs",
    "10yrs",
    "2y -",
    "3y -",
    "4y -",
    "5y -",
    "6y -",
    "7y -",
    "8y -",
    "10y -",
    "2y to",
    "3y to",
    "4y to",
    "5y to",
    "6y to",
    "7y to",
    "8y to",
    "1-2 years",
    "1-3 years",
    "2-3 years",
    "2-4 years",
    "3-5 years",
    "4-5 years",
    "1 - 3 years",
    "2 - 4 years",
    "1 to 3 years",
    "2 to 4 years",
    "1 year of experience",
    "2 years of experience",
    "3 years of experience",
    "4 years of experience",
    "5 years of experience",
    "1 year experience",
    "2 years experience",
    "3 years experience",
    "4 years experience",
    "5 years experience",
    "minimum 2 years",
    "minimum 3 years",
    "minimum 4 years",
    "minimum 5 years",
    "min 2 year",
    "min 3 year",
    "min 4 year",
    "min 5 year",
    "min 2 years",
    "min 3 years",
    "min 4 years",
    "min 5 years",
    "2 yr",
    "3 yr",
    "4 yr",
    "5 yr",
    "6 yr",
    "7 yr",
    "8 yr",
    "10 yr"
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
        const path = url.pathname.replace(/\/$/, '');
        
        // Aggressive normalization for Workday URLs
        if (url.hostname.includes('myworkdayjobs.com')) {
            const parts = path.split('/');
            const lastPart = parts[parts.length - 1];
            return `${url.hostname}/${lastPart}`.toLowerCase();
        }
        
        return `${url.origin}${path}`.toLowerCase();
    } catch {
        return urlStr.split('?')[0].replace(/\/$/, '').toLowerCase();
    }
}

// Load cached visited URLs
async function loadVisited(): Promise<Record<string, any>> {
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
    const lowerText = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    
    // Check for ranges like "1-4 years", "2-5 years", "1 to 4 years" (excluding ranges starting with 0)
    const expRangeRegex = /(?:[1-9]|10)\s*(?:-|–|\bto\b)\s*(?:[2-9]|1[0-5])\s*(?:years|years'|yrs|yr|y\b)/gi;
    if (expRangeRegex.test(lowerText)) {
        return false;
    }
    
    // If it explicitly asks for experience (e.g. 3+ years), it is NOT a fresher job.
    for (const phrase of EXPERIENCED_PHRASES) {
        if (lowerText.includes(phrase)) return false;
    }

    // If it explicitly says fresher/entry-level/intern, it is.
    for (const phrase of FRESHER_PHRASES) {
        if (lowerText.includes(phrase)) return true;
    }
// Default to true to avoid missing potential entry level/fresher jobs
    return true; 
}

// Check if a page is actually a job post (vs a course, syllabus, prep guide, roadmap, exam result)
function isActualJob(title: string, bodyText: string): boolean {
    const titleLower = title.toLowerCase();

    // Only block if the title explicitly indicates it is a course, syllabus, mock test, study material, roadmap, or exam info.
    const titleBlacklist = [
        'course', 'courses', 'bootcamp', 'syllabus', 'admit card', 'admit-card', 'hall ticket', 
        'exam date', 'exam result', 'exam paper', 'question paper', 'answer key', 'mock test', 
        'test series', 'practice test', 'study material', 'roadmap', 'roadmaps', 'ambassador', 
        'newsletter', 'whatsapp', 'telegram', 'pdf download', 'placement papers', 'eligibility criteria', 
        'how to apply', 'nqt preparation', 'exam syllabus', 'exam details'
    ];

    for (const keyword of titleBlacklist) {
        if (titleLower.includes(keyword)) {
            return false;
        }
    }

    return true;
}

// Check if job is live (using existing sweeper logic)
async function isJobLive(page: Page, url: string): Promise<boolean> {
    try {
        let response = null;
        try {
            response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (gotoErr) {
            // If it timed out, the page DOM might still be loaded/accessible
            console.log(`  -> Navigation warning: ${(gotoErr as Error).message}. Checking DOM anyway.`);
        }

        if (response && (response.status() === 404 || response.status() === 410 || response.status() === 403 || response.status() === 401)) {
            console.log(`  -> Page returned inactive status code: ${response.status()}`);
            return false;
        }

        const pageTitle = await page.title().catch(() => "");
        const lowerTitle = pageTitle.toLowerCase();
        if (lowerTitle.includes('403') || lowerTitle.includes('forbidden') || lowerTitle.includes('access denied') || lowerTitle.includes('checking your browser') || lowerTitle.includes('attention required')) {
            console.log(`  -> Access blocked (Forbidden/Cloudflare/403 page title: "${pageTitle}").`);
            return false;
        }
        
        await page.waitForTimeout(3000).catch(() => {});
        const bodyText = await page.locator('body').innerText().catch(() => "");
        if (!bodyText) {
            return true; // Fallback to live if we can't read body at all
        }

        const lowerText = bodyText.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');

        for (const phrase of EXPIRED_PHRASES) {
            if (lowerText.includes(phrase)) {
                return false;
            }
        }

        // Also check if the ACTUAL ATS page requires 2+ years of experience
        for (const phrase of EXPERIENCED_PHRASES) {
            if (lowerText.includes(phrase)) {
                console.log(`  -> False positive caught! ATS page mentions: ${phrase}`);
                return false;
            }
        }

        if (!isActualJob(pageTitle, bodyText)) {
            console.log(`  -> False positive caught! Target page does not appear to be an actual job.`);
            return false;
        }

        return true;
    } catch (err) {
        return true; // Better false positive than false negative
    }
}

function isValidApplyLink(urlStr: string, currentDomain: string): boolean {
    try {
        const u = new URL(urlStr);
        const targetHost = u.hostname.replace(/^www\./, '').toLowerCase();
        const baseHost = currentDomain.replace(/^www\./, '').toLowerCase();
        
        if (targetHost === baseHost) return false;
        if (u.protocol.includes('mailto')) return false;
        if (targetHost.startsWith('courses.')) return false;
        
        const blacklistedDomains = [
            'facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'whatsapp.com', 
            'telegram.org', 't.me', 'telegram.me', 'telegram.dog', 'youtube.com', 'youtu.be', 
            'instagram.com', 'foundit.in', 'naukri.com', 'cloudflare.com', 
            'play.google.com', 'plus.google.com', 'apps.apple.com',
            'pinterest.com', 'reddit.com', 'github.com/MukeshCheekatla',
            'openinapp.co', 'openinapp.link', 'linktr.ee', 'bio.link', 'bit.ly', 'tinyurl.com',
            'freshershunt.in', 'jobsaddafreshers.com', 'internshipss.com', 'placementdrive.in',
            'freshersvoice.com', 'freshersnow.com', 'offcampusjobs4u.com', 'freshhiring.com', 
            'recruitnxt.com', 'fresheropenings.com', 'job4freshers.co.in', 'frontlinesmedia.in',
            'govtjobmart.in', 'findmyjobss.com', 'dailypharmajobs.in', 'ashokworld.in',
            'cookieyes.com', 'generatepress.com', 'wordpress.org', 'wordpress.com', 'gravatar.com',
            'elementor.com', 'schema.org', 'doubleclick.net', 'google-analytics.com', 'googletagmanager.com',
            'w.org', 'wp.com', 'blogspot.com', 'getrevue.co', 'revue.co',
            'frontlinesedutech.com', 'courses.frontlinesedutech.com',
            'apprenticeshipindia.org', 'mhrdnats.gov.in', 'nats.education.gov.in', 'udemy.com',
            'coursera.org', 'edx.org', 'simplilearn.com', 'greatlearning.in', 'medium.com',
            'subscribepage.com', 'mailerlite.com', 'getresponse.com', 'activecampaign.com', 'convertkit.com'
        ];
        
        for (const domain of blacklistedDomains) {
            if (targetHost.includes(domain)) return false;
        }
        
        return true;
    } catch {
        return false;
    }
}

// Find actual ATS link
async function findActualApplyLink(page: Page, context: BrowserContext, currentDomain: string): Promise<string | null> {
    try {
        // Define common selectors for the main article/post content
        const contentSelectors = [
            '.post-body', '.entry-content', 'article', 'main', '#main-content', 
            '#content', '.post-content', '.entry-body', '.post', '.job-description'
        ];
        
        let rootLocator = page.locator('body');
        for (const selector of contentSelectors) {
            const locator = page.locator(selector).first();
            if (await locator.count() > 0) {
                rootLocator = locator;
                break;
            }
        }

        // 1. Try to find links containing explicit apply/register/click here/submit text
        const applyButtons = await rootLocator.locator('a >> text=/(apply|register|click here|submit)/i').elementHandles();
        for (const btn of applyButtons) {
            const href = await btn.getAttribute('href');
            if (href) {
                try {
                    const u = new URL(href, page.url());
                    if (isValidApplyLink(u.href, currentDomain)) {
                        return u.href;
                    }
                } catch {
                    // Ignore invalid URLs
                }
            }
        }

        // 2. Fall back to collecting all external links and checking for known ATS hosts
        const links = await rootLocator.locator('a').evaluateAll(anchors => 
            anchors.map(a => (a as HTMLAnchorElement).href)
        );
        const externalLinks = links.filter(l => isValidApplyLink(l, currentDomain));

        for (const link of externalLinks) {
            const lowerLink = link.toLowerCase();
            if (lowerLink.includes('workday') || lowerLink.includes('greenhouse') || lowerLink.includes('lever') || lowerLink.includes('myworkdayjobs') || lowerLink.includes('taleo') || lowerLink.includes('icims') || lowerLink.includes('smartrecruiters') || lowerLink.includes('forms.gle') || lowerLink.includes('eightfold') || lowerLink.includes('careers') || lowerLink.includes('jobs') || lowerLink.includes('oraclecloud.com') || lowerLink.includes('infosysapps.com') || lowerLink.includes('phenompro.com') || lowerLink.includes('ashbyhq.com') || lowerLink.includes('jobvite.com') || lowerLink.includes('workable') || lowerLink.includes('rippling')) {
                return link;
            }
        }

        // 3. If no explicit apply link with an external href was found, try clicking the first apply button (js actions)
        if (applyButtons.length > 0) {
            const [newPage] = await Promise.all([
                context.waitForEvent('page').catch(() => null),
                applyButtons[0].click({ timeout: 5000 }).catch(() => null)
            ]);

            if (newPage) {
                await newPage.waitForLoadState();
                const url = newPage.url();
                await newPage.close();
                if (isValidApplyLink(url, currentDomain)) {
                    return url;
                }
            } else {
                await page.waitForTimeout(3000);
                const currentUrl = page.url();
                if (isValidApplyLink(currentUrl, currentDomain)) {
                    return currentUrl;
                }
            }
        }
        
        // 4. Return first external link from content area as a fallback
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
    if (!visited["__discovered_apply_links__"]) {
        visited["__discovered_apply_links__"] = [];
    }

    let pending = visited["pending_admin_approval"] || [];
    
    // Filter out approved ones (already in CDN)
    pending = pending.filter((item: any) => {
        const norm = normalizeUrl(item.applyLink);
        const isApproved = knownLinks.has(norm);
        if (isApproved) {
            console.log(`  -> Job approved & published in CDN: ${item.applyLink}`);
        }
        return !isApproved;
    });

    const activePending: { title: string, applyLink: string, source: string, discoveredAt: string }[] = [];
    const newJobsFound: { title: string, applyLink: string, source: string, discoveredAt?: string }[] = [];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    if (pending.length > 0) {
        console.log(`\n--- Re-verifying ${pending.length} pending links not yet in CDN ---`);
        const page = await context.newPage();
        for (const item of pending) {
            console.log(`Checking pending job: ${item.title} (${item.applyLink})`);
            const isLive = await isJobLive(page, item.applyLink);
            if (isLive) {
                console.log(`  ✅ Still live and pending admin add. Re-reporting.`);
                activePending.push(item);
                newJobsFound.push(item);
            } else {
                console.log(`  -> Expired or inactive since last check. Removing.`);
                const norm = normalizeUrl(item.applyLink);
                if (!visited["__discovered_apply_links__"].includes(norm)) {
                    visited["__discovered_apply_links__"].push(norm);
                }
            }
        }
        await page.close();
    }
    
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
                .filter(l => {
                    try {
                        const u = new URL(l.href);
                        // Prevent category/tag pages from being scraped as job posts
                        if (
                            u.pathname === '/' || 
                            u.pathname === '/jobs/' ||
                            u.pathname === '/freshers/' ||
                            u.pathname.includes('/category/') || 
                            u.pathname.includes('/tag/') ||
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
                .map(l => l.href))];

            console.log(`Found ${jobLinks.length} potential job posts on ${site.name} homepage.`);

            const unvisitedLinks = jobLinks.filter(link => !visited[site.name].includes(link));
            console.log(`Found ${unvisitedLinks.length} new unvisited jobs.`);

            for (const jobLink of unvisitedLinks.slice(0, 20)) { // Process up to 20 NEW jobs per run
                console.log(`Checking: ${jobLink}`);
                visited[site.name].push(jobLink);

                await page.goto(jobLink, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
                await page.waitForTimeout(2000);
                
                const aggregatorTitle = await page.locator('h1').first().innerText().catch(() => "");
                const bodyText = await page.locator('body').innerText().catch(() => "");
                
                if (!isFresherJob(bodyText)) {
                    console.log(`  -> Skipping: Not a fresher job.`);
                    continue;
                }

                if (!isActualJob(aggregatorTitle, bodyText)) {
                    console.log(`  -> Skipping: Not an actual job post (likely a course, syllabus, prep guide, roadmap, exam result, etc.).`);
                    continue;
                }

                // Try to find the apply link
                const applyLink = await findActualApplyLink(page, context, siteDomain);
                if (!applyLink) {
                    console.log(`  -> Failed to extract apply link.`);
                    continue;
                }

                const normalizedApplyLink = normalizeUrl(applyLink);
                if (knownLinks.has(normalizedApplyLink) || visited["__discovered_apply_links__"].includes(normalizedApplyLink)) {
                    console.log(`  -> Skipping: Already seen/discovered (${normalizedApplyLink})`);
                    continue;
                }

                // Add to knownLinks immediately to prevent duplicates in the SAME run!
                knownLinks.add(normalizedApplyLink);

                console.log(`  -> Checking if actual link is live: ${applyLink}`);
                const isLive = await isJobLive(page, applyLink);

                if (isLive) {
                    console.log(`  ✅ FOUND NEW LIVE JOB: ${applyLink}`);
                    let jobTitle = await page.title().catch(() => "");
                    jobTitle = jobTitle
                        .replace(/( - Workday| - Lever| - Greenhouse| Careers| - Jobs| \| .*)$/i, '')
                        .trim();
                    
                    if (!jobTitle || jobTitle.length < 4 || /^(login|sign in|welcome|job details|careers|opportunities|skip to content)$/i.test(jobTitle)) {
                        jobTitle = aggregatorTitle.trim() || "Job Title Unknown";
                    }
                    
                    const newJob = {
                        title: jobTitle,
                        applyLink: applyLink,
                        source: site.name,
                        discoveredAt: new Date().toISOString()
                    };
                    
                    newJobsFound.push(newJob);
                    activePending.push(newJob);
                    
                    visited["__discovered_apply_links__"].push(normalizedApplyLink);
                    if (visited["__discovered_apply_links__"].length > 2000) {
                        visited["__discovered_apply_links__"] = visited["__discovered_apply_links__"].slice(-2000);
                    }
                } else {
                    console.log(`  -> Job appears expired.`);
                    visited["__discovered_apply_links__"].push(normalizedApplyLink);
                    if (visited["__discovered_apply_links__"].length > 2000) {
                        visited["__discovered_apply_links__"] = visited["__discovered_apply_links__"].slice(-2000);
                    }
                }
            }
        } catch (err) {
            console.error(`Error scraping ${site.name}:`, (err as Error).message);
        } finally {
            await page.close();
        }
    }

    await browser.close();
    
    visited["pending_admin_approval"] = activePending;
    await saveVisited(visited);

    if (newJobsFound.length > 0) {
        let msg = `🔥 <b>Job Discovery Bot Found ${newJobsFound.length} New Fresher Jobs!</b> 🔥\n\n`;
        const displayJobs = newJobsFound.slice(0, 15);
        for (const job of displayJobs) {
            msg += `- <b>${job.title}</b> (via ${job.source})\n  Link: ${job.applyLink}\n\n`;
        }
        if (newJobsFound.length > 15) {
            msg += `...and ${newJobsFound.length - 15} more!\n\n`;
        }
        msg += `Please add these to the Admin Dashboard.`;
        console.log("Sending Telegram message:", msg);
        await sendTelegramMessage(msg);
    } else {
        console.log("No new jobs found this run.");
    }

    // Write summary for GitHub Actions
    if (process.env.GITHUB_STEP_SUMMARY) {
        let summary = `## Job Discovery Bot Results\n\nChecked target sites. Found ${newJobsFound.length} new jobs.\n\n`;
        if (newJobsFound.length > 0) {
            summary += `### New Jobs\n`;
            newJobsFound.forEach(j => {
                summary += `- **${j.title}** (via ${j.source}): ${j.applyLink}\n`;
            });
        } else {
            summary += `No new fresher jobs were found during this run.`;
        }
        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }
}

run().catch(console.error);
