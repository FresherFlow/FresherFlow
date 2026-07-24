import fs from 'node:fs/promises';
import path from 'node:path';

// --- LOAD ENV ---
async function fileExists(filePath: string): Promise<boolean> {
    try { await fs.access(filePath); return true; } catch { return false; }
}

export async function loadEnv() {
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
                    if (process.env[key] === undefined) {
                        process.env[key] = value;
                    }
                }
            }
        } catch {
            // Ignore env load errors on systems where file is missing
        }
    }
}
await loadEnv();

// --- CONFIGURATION ---
export const CDN_SECRET = (process.env.CDN_SIGNATURE_SECRET || '').trim().replace(/^["']|["']$/g, '');
export const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^bot/i, '');
export const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim().replace(/^["']|["']$/g, '');
export const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL || '').trim().replace(/\/$/, '');
export const ATS_CDN_BASE = CDN_URL ? `${CDN_URL}/ats` : '';
export const ATS_PROVIDERS = [
    // Phase 1
    'greenhouse', 'lever', 'workday', 'smartrecruiters', 'myworkdayjobs', 'ashby', 'ashbyhq',
    'oracle', 'icims', 'successfactors',
    // Phase 2
    'bamboohr', 'recruitee', 'jobvite', 'teamtailor', 'eightfold', 'darwinbox',
];

export let TARGET_SITES: { name: string; urls: string[] }[] = [];

try {
    const res = await fetch(`${CDN_URL}/aggregators.json`);
    if (res.ok) {
        TARGET_SITES = await res.json();
    } else {
        console.error('Failed to fetch TARGET_SITES from CDN:', res.statusText);
    }
} catch (error) {
    console.error('Error fetching TARGET_SITES from CDN:', error instanceof Error ? error.message : String(error));
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
    /this job ad has been removed/i,
    /this job listing has been (removed|deactivated|expired)/i,
    /application period has ended/i,
    /applications are no longer being accepted/i,
    /the url you have provided is invalid/i,
    /an error has occurred\s*page not found/i,
    /we are sorry this job post no longer exists/i
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
