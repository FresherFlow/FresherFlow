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
export const CDN_SECRET = (process.env.CDN_SIGNATURE_SECRET || '').trim().replace(/^["']|["']$/g, '');
export const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^bot/i, '');
export const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim().replace(/^["']|["']$/g, '');
export const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL || '').trim().replace(/\/$/, '');
export const ATS_CDN_BASE = CDN_URL ? `${CDN_URL}/ats` : '';
export const ATS_PROVIDERS = ['greenhouse', 'lever', 'workday', 'smartrecruiters', 'myworkdayjobs', 'bamboohr', 'ashby', 'ashbyhq'];

export let TARGET_SITES: { name: string; urls: string[] }[] = [];

try {
    const res = await fetch('https://cdn.fresherflow.in/aggregators.json');
    if (res.ok) {
        TARGET_SITES = await res.json();
    } else {
        console.error('Failed to fetch TARGET_SITES from CDN:', res.statusText);
    }
} catch (error) {
    console.error('Error fetching TARGET_SITES from CDN:', error instanceof Error ? error.message : String(error));
}

export const VISITED_FILE = path.join(process.cwd(), 'visited_urls.json');

export const EXPIRED_PHRASES = [
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
    "doesnt seem to exist or may have been removed",
    "this job posting is no longer available to apply",
    "explore other job openings on our job portal",
    "this position is no longer available",
    "this vacancy is no longer available",
    "this opening is no longer available",
    "the job opening you requested is not available",
    "sorry, this job is no longer available",
    "this job ad has been removed",
    "this job listing has expired",
    "this job listing is no longer active",
    "this job listing has been removed",
    "this job listing is no longer available",
    "this posting is no longer active",
    "this posting is no longer available",
    "posting is expired",
    "the position has been closed",
    "position is no longer available",
    "this position has been closed",
    "this position has been filled",
    "position has been closed",
    // Workday style
    "no longer taking applications",
    "the job requisition is no longer available",
    // Workday 404 / invalid URL
    "the url you have provided is invalid",
    "url you have provided is invalid",
    // Greenhouse style
    "this role is no longer available",
    "this position is closed",
    // Generic
    "application period has ended",
    "applications are no longer being accepted",
    "this opportunity is no longer available",
    "this opportunity has closed",
    "unfortunately, this job is no longer available",
    "unfortunately this job is no longer available"
];

// Phrases indicating it's a fresher job
export const FRESHER_PHRASES = [
    "0-1 years",
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
    "junior",
    "campus hiring",
    "off campus",
    "software engineer i",
    "sde 1",
    "apprentice",
    "early career"
];

// Phrases indicating it's NOT a fresher job (we skip if we see these AND we don't see fresher phrases)
export const EXPERIENCED_PHRASES = [
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
