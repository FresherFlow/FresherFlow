import { chromium, Page, BrowserContext } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// --- LOAD ENV ---
async function fileExists(filePath: string): Promise<boolean> {
    try { await fs.access(filePath); return true; } catch { return false; }
}

async function loadEnv() {
    let envPath = path.join(process.cwd(), '.env');
    if (!(await fileExists(envPath))) {
        envPath = path.join(process.cwd(), '../../.env');
    }
    if (await fileExists(envPath)) {
        try {
            const envContent = await fs.readFile(envPath, 'utf8');
            for (const line of envContent.split('\n')) {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = (match[2] || '').trim();
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                    process.env[key] = value;
                }
            }
        } catch {
            // Ignore env load errors on systems where file is missing
        }
    }
}
await loadEnv();

// --- CONFIGURATION ---
const CDN_SECRET = (process.env.CDN_SIGNATURE_SECRET || '').trim().replace(/^["']|["']$/g, '');
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^bot/i, '');
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim().replace(/^["']|["']$/g, '');
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.fresherflow.in';

const TARGET_SITES = [
    {
        name: 'job4freshers',
        urls: [
            'https://job4freshers.co.in/',
            'https://job4freshers.co.in/category/software-it-jobs/'
        ]
    },
    {
        name: 'frontlinesmedia',
        urls: [
            'https://frontlinesmedia.in/tag/fresher-jobs/'
        ]
    },
    {
        name: 'govtjobmart',
        urls: [
            'https://govtjobmart.in/'
        ]
    },
    {
        name: 'findmyjobss',
        urls: [
            'https://findmyjobss.com/',
            'https://findmyjobss.com/category/latest-jobs/'
        ]
    },
    {
        name: 'dailypharmajobs',
        urls: [
            'https://jobs.dailypharmajobs.in/',
            'https://jobs.dailypharmajobs.in/category/fresher-jobs/'
        ]
    },
    {
        name: 'jobsaddafreshers',
        urls: [
            'https://jobsaddafreshers.com/category/freshers/',
            'https://jobsaddafreshers.com/category/internships/'
        ]
    },
    {
        name: 'internshipss',
        urls: [
            'https://internshipss.com/',
            'https://internshipss.com/Fresher-Jobs.html',
            'https://internshipss.com/Internships.html',
            'https://internshipss.com/Remote-Jobs.html'
        ]
    },
    {
        name: 'freshersvoice',
        urls: [
            'https://www.freshersvoice.com/',
            'https://www.freshersvoice.com/it-software-jobs',
            'https://www.freshersvoice.com/off-campus-drives'
        ]
    },
    {
        name: 'placementdrive',
        urls: [
            'https://placementdrive.in/',
            'https://placementdrive.in/category/fresher-jobs',
            'https://placementdrive.in/category/internships',
            'https://placementdrive.in/category/off-campus-jobs'
        ]
    },
    {
        name: 'freshershunt',
        urls: [
            'https://freshershunt.in/',
            'https://freshershunt.in/off-campus-drive-jobs/off-campus-drive/',
            'https://freshershunt.in/off-campus-drive-jobs/work-from-home/',
            'https://freshershunt.in/off-campus-drive-jobs/internship/'
        ]
    },
    {
        name: 'fresheropenings',
        urls: [
            'https://fresheropenings.com/',
            'https://fresheropenings.com/jobs/',
            'https://fresheropenings.com/internship/'
        ]
    },
    {
        name: 'freshersjobsaadda',
        urls: [
            'https://freshersjobsaadda.blogspot.com/search'
        ]
    },
    {
        name: 'topvarsity',
        urls: [
            'https://jobs.topvarsity.in/'
        ]
    },
    {
        name: 'love2pickleball',
        urls: [
            'https://love2pickleball.com/category/hire_alert_jobs/'
        ]
    },
    {
        name: 'freshersnow',
        urls: [
            'https://www.freshersnow.com/off-campus-drives/',
            'https://www.freshersnow.com/internship-jobs/',
            'https://www.freshersnow.com/freshers-jobs/'
        ]
    },
    {
        name: 'softwaremuchatlu',
        urls: [
            'https://softwaremuchatlu.com/jobs/',
            'https://softwaremuchatlu.com/internships/'
        ]
    },
    {
        name: 'onlinestudy4u',
        urls: [
            'https://onlinestudy4u.in/category/job-updates/'
        ]
    },
    {
        name: 'merademyjobs',
        urls: [
            'https://merademyjobs.com/index.php/category/freshers/',
            'https://merademyjobs.com/index.php/category/internships/',
            'https://merademyjobs.com/index.php/category/work-from-home/',
            'https://merademyjobs.com/index.php/category/it-jobs/'
        ]
    },
    {
        name: 'fresheroffcampus',
        urls: [
            'https://www.fresheroffcampus.com/',
            'https://www.fresheroffcampus.com/category/internship-jobs/'
        ]
    },
    {
        name: 'kickcharm',
        urls: [
            'https://kickcharm.com/',
            'https://kickcharm.com/category/work-from-home/'
        ]
    },
    {
        name: 'offcampusjobdrives',
        urls: [
            'https://offcampusjobdrives.com/category/home/',
            'https://offcampusjobdrives.com/category/fresher-jobs/',
            'https://offcampusjobdrives.com/category/internships/'
        ]
    },
    {
        name: 'mohancareers',
        urls: [
            'https://mohancareers.com/',
            'https://mohancareers.com/category/private-jobs/',
            'https://mohancareers.com/category/work-from-home-jobs/'
        ]
    }
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
    "job is not available at this time.",
    "has expired",
    "no longer open",
    "this requisition is no longer accepting applications",
    "no longer accepting applications via careers",
    "please explore other open opportunities",
    "currently not accepting applications",
    "not accepting applications for this job",
    "not accepting applications for this position",
    "this job is not available",
    "job does not exist or is not currently active",
    "job does not exist",
    "is not currently active",
    "job closed",
    "role is no longer available",
    "position you're looking for may have been filled",
    "we couldn't find the job posting you're looking for",
    "we couldnt find the job posting you're looking for",
    "may have been filled or deactivated",
    "doesn't seem to exist or may have been removed",
    "doesnt seem to exist or may have been removed"
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
    "10+ exp"
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
async function loadVisited(): Promise<Record<string, string[]>> {
    try {
        const data = await fs.readFile(VISITED_FILE, 'utf-8');
        return JSON.parse(data) as Record<string, string[]>;
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

    // Check for experience requirements of 1+ years (e.g. "2 years' experience", "1 year's analytical experience")
    const expReqRegex = /(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*(?:years'|year's|years|year|yrs|yr)\s*(?:of\s+)?(?:[a-z']+\s+){0,3}experience/gi;
    if (expReqRegex.test(lowerText)) {
        return false;
    }

    // Check for "2+ years", "1+ yr", etc.
    const plusExpRegex = /(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*\+\s*(?:years|year|yrs|yr|y\b)/gi;
    if (plusExpRegex.test(lowerText)) {
        return false;
    }

    // Check for "minimum of 2 years", "min 1 year", "at least 2 yrs", etc.
    const minExpRegex = /\b(?:minimum|min|at least)\s*(?:of\s+)?(?:\b[1-9]\b|\b10\b)\s*(?:years|year|yrs|yr|y\b)/gi;
    if (minExpRegex.test(lowerText)) {
        return false;
    }
    
    // Check for standalone experience requirements of 2-10 years (e.g. "3 years", "5 yrs", "2yr") that are not part of a 0-X range
    const standaloneExpRegex = /(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[2-9]\b|\b10\b)\s*(?:years|yrs|yr|y\b)/gi;
    if (standaloneExpRegex.test(lowerText)) {
        return false;
    }

    // Check for standalone 1 year experience requirements (excluding 0-1 range and bonds/contracts)
    const oneYearExpRegex = /(?<!\b0\s*(?:-|–|\bto\b)\s*)\b(?:1|1\.0)\s*(?:years|year|yrs|yr|y|exp|experience)\b(?!\s+(?:bond|contract|training|service|agreement|warranty)\b)/gi;
    if (oneYearExpRegex.test(lowerText)) {
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

// Is this strictly a senior job (experience >= 3 years)?
function isSeniorJob(text: string): boolean {
    const lowerText = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    
    // Check for ranges like "3-5 years", "10-13 years", "5 to 8 years" (excluding ranges starting with 0, 1, or 2)
    const expRangeRegex = /(?:[3-9]|\d{2,})\s*(?:-|–|\bto\b)\s*(?:\d+)\s*(?:years|years'|yrs|yr|y\b)/gi;
    if (expRangeRegex.test(lowerText)) {
        return true;
    }

    // Check for experience requirements of 3+ years (e.g. "3 years' experience", "5 year's analytical experience")
    const expReqRegex = /(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years'|year's|years|year|yrs|yr)\s*(?:of\s+)?(?:[a-z']+\s+){0,3}experience/gi;
    if (expReqRegex.test(lowerText)) {
        return true;
    }

    // Check for "3+ years", "4+ yr", "10+ years", etc. (excluding 0+, 1+, 2+)
    const plusExpRegex = /(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*\+\s*(?:years|year|yrs|yr|y\b)/gi;
    if (plusExpRegex.test(lowerText)) {
        return true;
    }

    // Check for "minimum of 3 years", "min 5 years", "at least 4 yrs", etc. (excluding 0, 1, 2)
    const minExpRegex = /\b(?:minimum|min|at least)\s*(?:of\s+)?(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years|year|yrs|yr|y\b)/gi;
    if (minExpRegex.test(lowerText)) {
        return true;
    }
    
    // Check for standalone experience requirements of 3+ years (excluding 0, 1, 2)
    const standaloneExpRegex = /(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years|yrs|yr|y\b)/gi;
    if (standaloneExpRegex.test(lowerText)) {
        return true;
    }
    
    const seniorPhrases = [
        "3+ years", "4+ years", "5+ years", "6+ years", "7+ years", "8+ years", "9+ years", "10+ years",
        "3+ yrs", "4+ yrs", "5+ yrs", "6+ yrs", "7+ yrs", "8+ yrs", "9+ yrs", "10+ yrs",
        "3+ exp", "4+ exp", "5+ exp", "6+ exp", "7+ exp", "8+ exp", "9+ exp", "10+ exp",
        "3 years of exp", "4 years of exp", "5 years of exp", "6 years of exp", "7 years of exp", "8 years of exp", "9 years of exp", "10 years of exp",
        "3 years exp", "4 years exp", "5 years exp", "6 years exp", "7 years exp", "8 years exp", "9 years exp", "10 years exp",
        "3 year exp", "4 year exp", "5 year exp", "6 year exp", "7 year exp", "8 year exp", "9 year exp", "10 year exp",
        "10 - 13 years", "10-13 years", "10-13 yrs", "10 to 13 years", "10 to 13 yrs"
    ];
    for (const phrase of seniorPhrases) {
        if (lowerText.includes(phrase)) return true;
    }

    return false;
}

// Check if the text contains any fresher keywords
function hasFresherKeyword(text: string): boolean {
    const lowerText = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    for (const phrase of FRESHER_PHRASES) {
        if (lowerText.includes(phrase)) return true;
    }
    return false;
}


// Check if a page is actually a job post (vs a course, syllabus, prep guide, roadmap, exam result)
function isActualJob(title: string): boolean {
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

interface JobCheckResult {
    live: boolean;
    status: 'live' | 'expired' | 'review' | 'failed';
}

// Check if job is live (using existing sweeper logic)
async function isJobLive(page: Page, url: string): Promise<JobCheckResult> {
    try {
        let response = null;
        let loadFailed = false;
        try {
            response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (gotoErr) {
            console.log(`  -> Navigation warning: ${(gotoErr as Error).message}. Checking DOM anyway.`);
            const errMsg = (gotoErr as Error).message.toLowerCase();
            if (errMsg.includes('net::err_name_not_resolved') || 
                errMsg.includes('net::err_connection_refused') || 
                errMsg.includes('net::err_address_unreachable') ||
                errMsg.includes('net::err_connection_aborted') ||
                errMsg.includes('net::err_connection_reset')
            ) {
                console.log(`  -> Hard network/DNS error: ${errMsg}. Marking as failed.`);
                return { live: false, status: 'failed' };
            }
            loadFailed = true;
        }

        if (response && (response.status() === 404 || response.status() === 410 || response.status() === 403 || response.status() === 401)) {
            console.log(`  -> Page returned inactive status code: ${response.status()}`);
            return { live: false, status: 'expired' };
        }

        let isReview = false;

        const finalUrl = page.url().toLowerCase();
        if (finalUrl.includes('not_found') || finalUrl.includes('jobnotfound') || finalUrl.includes('job-not-found') || finalUrl.includes('/jobnotfound') || finalUrl.includes('/job-not-found')) {
            console.log(`  -> URL indicates job not found / redirect to portal: ${page.url()}. Marking for review.`);
            isReview = true;
        }

        const pageTitle = await page.title().catch(() => "");
        const lowerTitle = pageTitle.toLowerCase().trim();
        if (lowerTitle.includes('403') || lowerTitle.includes('forbidden') || lowerTitle.includes('access denied') || lowerTitle.includes('checking your browser') || lowerTitle.includes('attention required')) {
            console.log(`  -> Access blocked (Forbidden/Cloudflare/403 page title: "${pageTitle}").`);
            return { live: false, status: 'expired' };
        }
        if (/^(careers|career search|careersearch|search careers|careers search|job search|jobsearch|opportunities|job opportunities|career opportunities|open positions|current openings|search jobs|search for jobs|login|sign in|welcome|jobs|job|search)$/i.test(lowerTitle)) {
            console.log(`  -> Page title is generic ("${pageTitle}"). Marking for review.`);
            isReview = true;
        }
        
        // Smart Wait: Wait dynamically for Javascript/SPAs
        await page.waitForFunction(() => {
            return document.body && document.body.innerText.trim().length > 100;
        }, { timeout: 8000 }).catch(() => {});
        const bodyText = await page.locator('body').innerText({ timeout: 500 }).catch(() => "");
        if (!bodyText || bodyText.trim().length < 100) {
            if (loadFailed) {
                console.log(`  -> Navigation failed and page body is empty/too short. Marking as failed.`);
                return { live: false, status: 'failed' };
            }
            console.log(`  -> Page body is empty or too short (${bodyText?.trim().length || 0} chars). Marking for review.`);
            return { live: true, status: 'review' };
        }

        const lowerText = bodyText.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');

        for (const phrase of EXPIRED_PHRASES) {
            if (lowerText.includes(phrase)) {
                return { live: false, status: 'expired' };
            }
        }

        // Check strictly senior first
        if (isSeniorJob(bodyText)) {
            console.log(`  -> ATS page is strictly a senior job. Marking as expired.`);
            return { live: false, status: 'expired' };
        }

        // Soft check for isFresherJob
        if (!isFresherJob(bodyText)) {
            if (hasFresherKeyword(bodyText)) {
                console.log(`  -> ATS page fails isFresherJob check but has fresher keywords. Marking for review.`);
                isReview = true;
            } else {
                console.log(`  -> ATS page fails isFresherJob check and has no fresher keywords. Marking as expired.`);
                return { live: false, status: 'expired' };
            }
        }

        // Soft check for isActualJob
        if (!isActualJob(pageTitle)) {
            if (hasFresherKeyword(bodyText)) {
                console.log(`  -> ATS page fails isActualJob check but has fresher keywords. Marking for review.`);
                isReview = true;
            } else {
                console.log(`  -> ATS page fails isActualJob check and has no fresher keywords. Marking as expired.`);
                return { live: false, status: 'expired' };
            }
        }

        // Check experienced phrases
        for (const phrase of EXPERIENCED_PHRASES) {
            if (lowerText.includes(phrase)) {
                if (hasFresherKeyword(bodyText)) {
                    console.log(`  -> ATS page contains experienced phrase (${phrase}) but has fresher keywords. Marking for review.`);
                    isReview = true;
                } else {
                    console.log(`  -> False positive caught! ATS page mentions experienced phrase: ${phrase}`);
                    return { live: false, status: 'expired' };
                }
            }
        }

        return { live: true, status: isReview ? 'review' : 'live' };
    } catch (err) {
        console.error("  -> Error checking if job is live:", (err as Error).message);
        return { live: false, status: 'failed' };
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
        if (u.pathname.toLowerCase().includes('.pdf')) return false;
        
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
            'topvarsity.in',
            'love2pickleball.com',
            'softwaremuchatlu.com',
            'onlinestudy4u.in',
            'merademyjobs.com',
            'fresheroffcampus.com',
            'kickcharm.com',
            'offcampusjobdrives.com',
            'mohancareers.com',
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
            const locator = page.locator(selector);
            if (await locator.count() > 0) {
                rootLocator = locator;
                break;
            }
        }

        // 1. Try to find links containing explicit apply/register/click here/submit text
        const applyButtons = await rootLocator.locator('a', { hasText: /(apply|register|click here|submit)/i }).elementHandles();
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
        // Skip buttons that are just hash links (anchor scroll links)
        const clickTargets = [];
        for (const btn of applyButtons) {
            const href = await btn.getAttribute('href');
            if (!href || !href.startsWith('#')) {
                clickTargets.push(btn);
            }
        }

        if (clickTargets.length > 0) {
            const [newPage] = await Promise.all([
                context.waitForEvent('page').catch(() => null),
                clickTargets[0].click({ timeout: 5000 }).catch(() => null)
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

    const newJobsFound: { title: string, applyLink: string, source: string, discoveredAt?: string, reviewRequired?: boolean }[] = [];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Block heavy resources (images, stylesheets, fonts, media) to speed up scraping and prevent hangs
    await context.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });    for (const site of TARGET_SITES) {
        console.log(`\n--- Scraping ${site.name} ---`);
        if (!visited[site.name]) visited[site.name] = [];
        
        const page = await context.newPage();
        try {
            const jobLinks: string[] = [];
            const siteDomain = new URL(site.urls[0]).hostname;

            for (const url of site.urls) {
                console.log(`  -> Loading start page: ${url}`);
                try {
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    
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
            console.log(`Found ${uniqueJobLinks.length} unique potential job posts across all start pages for ${site.name}.`);

            const unvisitedLinks = uniqueJobLinks.filter(link => !visited[site.name].includes(link));
            console.log(`Found ${unvisitedLinks.length} new unvisited jobs.`);

            for (const jobLink of unvisitedLinks.slice(0, 20)) { // Process up to 20 NEW jobs per run
                console.log(`Checking: ${jobLink}`);
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
                        console.log(`  -> Borderline SDE/fresher job (failing isFresherJob check but has fresher keywords). Marking aggregator for review.`);
                        isAggregatorReview = true;
                    } else {
                        console.log(`  -> Skipping: Not a fresher job.`);
                        continue;
                    }
                }

                if (!isActualJob(aggregatorTitle)) {
                    if (hasFresherKeyword(bodyText)) {
                        console.log(`  -> Borderline job type (failing isActualJob check but has fresher keywords). Marking aggregator for review.`);
                        isAggregatorReview = true;
                    } else {
                        console.log(`  -> Skipping: Not an actual job post (likely a course, syllabus, prep guide, roadmap, exam result, etc.).`);
                        continue;
                    }
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
                const checkResult = await isJobLive(page, applyLink);

                if (checkResult.live) {
                    console.log(`  ✅ FOUND NEW LIVE JOB: ${applyLink} (Status: ${checkResult.status})`);
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
                        discoveredAt: new Date().toISOString(),
                        reviewRequired: checkResult.status === 'review' || isAggregatorReview,
                        aggregatorUrl: jobLink,
                        aggregatorTitle: aggregatorTitle.trim(),
                        aggregatorText: bodyText
                    };
                    
                    newJobsFound.push(newJob);
                    
                    visited["__discovered_apply_links__"].push(normalizedApplyLink);
                    if (visited["__discovered_apply_links__"].length > 2000) {
                        visited["__discovered_apply_links__"] = visited["__discovered_apply_links__"].slice(-2000);
                    }
                } else {
                    if (checkResult.status === 'failed') {
                        console.log(`  -> Job check failed due to network/timeout. Will retry next run.`);
                        knownLinks.delete(normalizedApplyLink);
                    } else {
                        console.log(`  -> Job appears expired.`);
                        visited["__discovered_apply_links__"].push(normalizedApplyLink);
                        if (visited["__discovered_apply_links__"].length > 2000) {
                            visited["__discovered_apply_links__"] = visited["__discovered_apply_links__"].slice(-2000);
                        }
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
    
    delete visited["pending_admin_approval"];
    await saveVisited(visited);

    // Send Telegram message alert
    if (newJobsFound.length > 0) {
        const validJobs = newJobsFound.filter(j => !j.reviewRequired);
        const reviewJobs = newJobsFound.filter(j => j.reviewRequired);

        let msg = "";
        if (validJobs.length > 0) {
            msg += `🔥 <b>Job Discovery Bot Found ${validJobs.length} New Fresher Jobs!</b> 🔥\n\n`;
            const displayJobs = validJobs.slice(0, 15);
            for (const job of displayJobs) {
                msg += `- <b>${job.title}</b> (via ${job.source})\n  Link: ${job.applyLink}\n\n`;
            }
            if (validJobs.length > 15) {
                msg += `...and ${validJobs.length - 15} more!\n\n`;
            }
        }

        if (reviewJobs.length > 0) {
            msg += `⚠️ <b>Review Required Jobs (Possible Portal Redirects):</b> ⚠️\n\n`;
            const displayReview = reviewJobs.slice(0, 10);
            for (const job of displayReview) {
                msg += `- <b>${job.title}</b> (via ${job.source})\n  Link: ${job.applyLink}\n\n`;
            }
            if (reviewJobs.length > 10) {
                msg += `...and ${reviewJobs.length - 10} more!\n\n`;
            }
        }

        msg += `Please add these to the Admin Dashboard.`;
        console.log("Sending Telegram message:", msg);
        await sendTelegramMessage(msg);

        // Wake up Render API server concurrently in the background if it is in cold start
        const apiBaseUrl = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
        if (apiBaseUrl) {
            console.log(`Waking up Render API server: ${apiBaseUrl}/api/health`);
            fetch(`${apiBaseUrl}/api/health`).catch(() => {
                // Fire-and-forget, ignore errors
            });
        }
    } else {
        console.log("No new jobs found this run.");
    }

    const outputPath = path.join(process.cwd(), 'discovered_jobs.json');
    const outputPayload = {
        version: 1,
        source: 'job-discovery-bot',
        jobs: newJobsFound
    };
    await fs.writeFile(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
    console.log(`Saved ${newJobsFound.length} discovered jobs to ${outputPath}`);

    // Write summary for GitHub Actions
    if (process.env.GITHUB_STEP_SUMMARY) {
        let summary = `## Job Discovery Bot Results\n\n`;
        summary += `Discovered **${newJobsFound.length}** new jobs and saved them to \`discovered_jobs.json\`.\n\n`;
        if (newJobsFound.length > 0) {
            summary += `### Discovered Jobs\n`;
            newJobsFound.forEach(j => {
                const reviewMark = j.reviewRequired ? ' (⚠️ Review)' : '';
                summary += `- **${j.title}** (via ${j.source})${reviewMark}: ${j.applyLink}\n`;
            });
        } else {
            summary += `No new fresher jobs were found during this run.`;
        }
        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }
}

run().catch(console.error);
