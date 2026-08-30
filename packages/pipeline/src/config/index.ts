import fs from 'node:fs';
import path from 'node:path';

// --- LOAD ENV ---
export function loadEnvSync() {
    const candidatePaths = [
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), '../../.env'),
        path.join(process.cwd(), '../.env'),
        path.join(process.cwd(), 'apps/ingestion/.env'),
        path.join(process.cwd(), '../apps/ingestion/.env'),
        path.join(process.cwd(), '../../apps/ingestion/.env'),
        path.join(process.cwd(), 'scripts/job-discovery/.env'),
        path.join(process.cwd(), 'scripts/search/.env'),
    ];

    for (const envPath of candidatePaths) {
        if (fs.existsSync(envPath)) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf8');
                for (const line of envContent.split('\n')) {
                    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                    if (match) {
                        const key = match[1];
                        let value = (match[2] || '').trim();
                        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                        if (process.env[key] === undefined && value !== '') {
                            process.env[key] = value;
                        }
                    }
                }
            } catch {
                // Ignore env load errors on systems where file is missing
            }
        }
    }
}
loadEnvSync();
export const loadEnv = loadEnvSync;

// --- CONFIGURATION ---
export const CDN_SECRET = (process.env.CDN_SIGNATURE_SECRET || '').trim().replace(/^["']|["']$/g, '');
export const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^bot/i, '');
export const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim().replace(/^["']|["']$/g, '');
export const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL || 'https://cdn.fresherflow.in').trim().replace(/\/$/, '');
export const ATS_CDN_BASE = CDN_URL ? `${CDN_URL}/api/ats/india` : '';
export const ATS_PROVIDERS = [
    // Phase 1
    'greenhouse', 'lever', 'workday', 'smartrecruiters', 'myworkdayjobs', 'ashby', 'ashbyhq',
    'oracle', 'icims', 'successfactors',
    // Phase 2 & 3
    'bamboohr', 'recruitee', 'jobvite', 'teamtailor', 'eightfold', 'darwinbox',
    'zohorecruit', 'freshteam', 'keka', 'workable',
    // Newly verified Indian ATS targets
    'avature', 'breezy', 'breezyhr', 'bullhorn', 'mercor', 'personio', 'phenom', 'pinpoint', 'getro'
];

export const ATS_HOSTNAMES = [
    'myworkdayjobs.com',
    'greenhouse.io',
    'lever.co',
    'smartrecruiters.com',
    'ashbyhq.com',
    'oracle.com',
    'oraclecloud.com',
    'workable.com',
    'recruitee.com',
    'icims.com',
    'internshala.com',
    'wellfound.com',
    'ycombinator.com',
    'naukri.com',
    'instahyre.com',
    'cuvette.tech',
    'unstop.com',
];

export const HEAVY_DORK_QUERIES = [
    // Tier 1: Internships
    'site:boards.greenhouse.io "intern" OR "internship" "India"',
    'site:jobs.lever.co "intern" OR "internship" "India"',
    'site:myworkdayjobs.com "intern" OR "internship" "India"',
    'site:jobs.smartrecruiters.com "intern" OR "internship" "India"',
    'site:jobs.ashbyhq.com "intern" OR "internship" "India"',

    // Tier 2: Fresh Graduates
    'site:boards.greenhouse.io ("new grad" OR "fresh graduate" OR "fresher" OR "recent graduate") "India"',
    'site:jobs.lever.co ("new grad" OR "fresh graduate" OR "fresher") "India"',
    'site:myworkdayjobs.com ("new grad" OR "fresh graduate" OR "fresher" OR "recent graduate") "India"',
    'site:jobs.smartrecruiters.com ("fresher" OR "fresh graduate" OR "new grad") "India"',

    // Tier 3: Graduate Trainee
    'site:boards.greenhouse.io ("graduate trainee" OR "graduate engineer" OR "graduate program" OR "apprentice" OR "trainee") "India"',
    'site:jobs.lever.co ("graduate trainee" OR "graduate engineer" OR "apprentice" OR "trainee") "India"',
    'site:myworkdayjobs.com ("graduate trainee" OR "graduate engineer" OR "apprentice" OR "campus hire") "India"',

    // Tier 4: Entry Level / Junior
    'site:boards.greenhouse.io ("entry level" OR "entry-level" OR "junior" OR "associate engineer") "India"',
    'site:jobs.lever.co ("entry level" OR "entry-level" OR "junior" OR "associate") "India"',
    'site:myworkdayjobs.com ("entry level" OR "entry-level" OR "associate" OR "junior") "India"',
    'site:jobs.smartrecruiters.com ("entry level" OR "junior" OR "associate" OR "trainee") "India"',

    // Tier 5: SDE-1
    'site:boards.greenhouse.io ("SDE 1" OR "SDE-1" OR "SDE1" OR "software engineer 1" OR "software engineer i") "India"',
    'site:jobs.lever.co ("SDE 1" OR "SDE-1" OR "software engineer i" OR "software engineer 1") "India"',
    'site:myworkdayjobs.com ("SDE 1" OR "SDE-1" OR "software engineer 1" OR "software engineer i") "India"',

    // Tier 6: Campus
    'site:boards.greenhouse.io ("campus hire" OR "campus hiring" OR "off campus" OR "off-campus") "India"',
    'site:myworkdayjobs.com ("campus hire" OR "campus hiring" OR "off campus" OR "off-campus drive") "India"',
    'site:jobs.lever.co ("campus" OR "off-campus") "India"',

    // Tier 7: Early Career
    'site:boards.greenhouse.io "early career" "India"',
    'site:jobs.lever.co "early career" "India"',
    'site:myworkdayjobs.com "early career" "India"',

    // New Heavy Dork Queries for Non-ATS Domains
    'site:internshala.com/internship/ ("remote" OR "india") ("software" OR "developer" OR "SDE")',
    'site:wellfound.com/jobs ("intern" OR "fresher" OR "junior") "india"',
    'site:boards.greenhouse.io ("intern" OR "internship" OR "fresher" OR "junior" OR "SDE 1") ("India" OR "Remote")',
];

export let TARGET_SITES: { name: string; urls: string[] }[] = [];

export async function fetchTargetSitesFromCdn(): Promise<{ name: string; urls: string[] }[]> {
    try {
        const res = await fetch(`${CDN_URL}/aggregators.json`);
        if (res.ok) {
            TARGET_SITES = await res.json();
            return TARGET_SITES;
        }
    } catch {}
    return TARGET_SITES;
}

export const VISITED_FILE = path.join(process.cwd(), 'visited_urls.json');
export const REJECTED_REASONS_FILE = path.join(process.cwd(), 'rejected_reasons.json');

export const EXPIRED_REGEXES = [
    /\b(?:job|position|posting|opportunity|vacancy|role|requisition|opening|listing|page|url)\s+(?:is|has\s+been)\s+no\s+longer\s+(?:available|active|open)\b/i,
    /\b(?:position|job|posting|opportunity|vacancy|role|requisition)\s+(?:has\s+been|has\s+now\s+been|has)\s+(?:filled|closed|expired|deactivated)\b/i,
    /no longer (accepting|taking) applications/i,
    /the page you are looking for doesn't exist/i,
    /the job you requested was not found/i,
    /the requested job could not be found/i,
    /the job that you were looking for either does not exist or is no longer open/i,
    /this vacancy has (now )?expired/i,
    /this position is not posted any longer/i,
    /is no longer accepting responses/i, // Google Forms
    /this posting has now closed/i,
    /thank you for your interest in a position with cgi/i,
    /couldn'?t find the (job|position|posting) you('re| were) looking for/i,
    /the (position|job) may have been closed/i,
    /not accepting applications for this (job|position)/i,
    /the job you are looking for is no longer open/i,
    /this job ad has been removed/i,
    /this job ad has expired/i,
    /this job listing has been (removed|deactivated|expired)/i,
    /application period has ended/i,
    /applications are no longer being accepted/i,
    /the url you have provided is invalid/i,
    /an error has occurred[\s\S]*page not found/i,
    /we are sorry this job post no longer exists/i,
    /you do not have access to this page/i,
    /job id provided may not be valid/i,
    /job posting has been removed/i,
    /unable to load the page/i,
    /join linkedin.*to view this job/i,
    /sign in to view this job/i
];

// Phrases indicating it's a fresher job
// Phrases indicating it's a fresher job
export const FRESHER_REGEXES = [
    /\b(?:0(?:-1)?\s*years?|experience:\s*0|freshers?|entry[- ]level|intern(?:ship)?|(?:new\s+)?grad(?:uate)?\s+(?:engineer|trainee|program|hiring|scheme)|new\s+grad(?:uate)?|trainee|junior|campus\s+hiring|off[- ]campus|software\s+engineer\s+i|sde\s+1|apprentice|early\s+career)\b/i
];

// Phrases indicating it's NOT a fresher job (we skip if we see these AND we don't see fresher phrases)
export const EXPERIENCED_REGEXES = [
    /\b(?:1\.5\+?\s*years?|(?:12|18|24)\+?\s*months?|(?:1\s*years?|1\s*year\s+of|[1-9]\d*)\+?\s*exp)\b/i
];

export const BAD_TITLE_REGEXES = [
    /\b(senior|sr\.?|lead|manager|director|head|vp|vice president|principal|architect|staff)\b/i,
    /^(login|sign in|welcome|job details|job details page|careers|opportunities|skip to content|careers at .+|jobs at .+|error|404|403|not found|access denied|page not found)$/i,
    /\b(am -|old -)\b/i
];

export const DORKER_ENABLED = process.env.DORKER_ENABLED !== 'false';
export const DORKER_PAGES_PER_QUERY = parseInt(process.env.DORKER_PAGES_PER_QUERY || '2', 10);

