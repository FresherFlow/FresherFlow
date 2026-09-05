import { normalizeUrl } from './url.js';

// Shared social-media poster used by every bot that schedules individual job
// posts (aggregator bot, external search bot, ...).
//
// One caption template for all bots. A "Company" line is rendered ONLY when the
// job actually carries a company name (external search bot has it — aggregator
// wrapper titles usually don't, so it passes no company and gets no company line).
//
// Posting is idempotent per run: pass the persisted "already posted" array and
// newly-scheduled apply links are appended to it so no job is ever posted twice.

export interface SocialPostJob {
    title: string;
    applyLink: string;
    company?: string;
    source?: string;
}

const WORKER_URL = (process.env.WORKER_URL || '').trim().replace(/\/$/, '');
const WORKER_SECRET = process.env.WORKER_SECRET || '';
export const SOCIAL_PLATFORMS = ['x', 'linkedin', 'telegram'] as const;

const NORMAL_STAGGER_MS = 10 * 60 * 1000;   // normal rhythm for small batches
const MAX_SPREAD_MS = 6 * 60 * 60 * 1000;   // huge batches spread across ~6 hours max
const MIN_STAGGER_MS = 2 * 60 * 1000;       // never faster than every ~2 minutes

export function getFormattedDate(): string {
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const day = now.getDate();
    const suffix = (d: number) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd';
            default: return 'th';
        }
    };
    return `${day}${suffix(day)} ${months[now.getMonth()]}, ${now.getFullYear()}`;
}

// Pick the stagger for this batch: small batches keep the 10-min rhythm,
// huge batches compress into the 6-hour window so nothing gets dropped.
function staggerForBatch(jobCount: number): number {
    const compressed = Math.max(Math.floor(MAX_SPREAD_MS / Math.max(jobCount, 1)), MIN_STAGGER_MS);
    return Math.min(NORMAL_STAGGER_MS, compressed);
}

// Random jitter ±40% so posts don't look robotic
function jitterStagger(ms: number): number {
    return Math.round(ms * (0.6 + Math.random() * 0.8));
}

function companyLine(job: SocialPostJob): string {
    const company = (job.company || '').trim();
    return company ? `Company: ${company}\n` : '';
}

export function formatSocialCaption(job: SocialPostJob, platform: string): string {
    const date = getFormattedDate();
    const company = companyLine(job);
    const title = job.title;
    const link = job.applyLink;

    switch (platform) {
        case 'x': {
            const shortTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;
            let caption = `New Job Opening | ${date}\n\n${company}Role: ${shortTitle}\nApply: ${link}\n\n#FresherJobs #Hiring`;
            // X limit is 280 chars. If over, shorten further.
            if (caption.length > 280) {
                const shorter = title.length > 40 ? title.slice(0, 37) + '...' : title;
                caption = `New Job Opening | ${date}\n\n${company}Role: ${shorter}\nApply: ${link}\n\n#FresherJobs`;
            }
            return caption;
        }
        case 'linkedin':
            return `New Job Opening | ${date}\n\n${company}Role: ${title}\n\nApply: ${link}\n\n#Freshers #Hiring #EntryLevel #Jobs`;
        case 'telegram':
        default:
            return `New Job Opening | ${date}\n\n${company}Role: ${title}\nApply Here: ${link}\n\n#Freshers #Hiring #EntryLevel`;
    }
}

async function schedulePost(platform: string, text: string, scheduledAt: number): Promise<void> {
    if (!WORKER_URL || !WORKER_SECRET) {
        console.warn(`[social] WORKER_URL or WORKER_SECRET not set, skipping ${platform} post`);
        return;
    }
    try {
        const res = await fetch(`${WORKER_URL}/social/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-worker-secret': WORKER_SECRET,
            },
            body: JSON.stringify({ platform, text, scheduledAt }),
        });

        let data: any = {};
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const raw = await res.text();
            if (!res.ok) {
                console.warn(`[social] Failed to schedule ${platform}: HTTP ${res.status} ${res.statusText}`);
                return;
            }
        }

        if (!res.ok || data.ok === false) {
            console.warn(`[social] Failed to schedule ${platform}: ${data.error || res.statusText}`);
        } else {
            console.log(`[social] Scheduled ${platform} post at ${new Date(scheduledAt).toISOString()} (job: ${data.jobId})`);
        }
    } catch (err) {
        console.warn(`[social] Error scheduling ${platform}: ${(err as Error).message}`);
    }
}

// Schedule one post per platform (X, LinkedIn, Telegram channel) for every new
// job. `postedLinks` is mutated: links scheduled now are appended so the caller
// can persist them and never post the same job twice. Returns the number of NEW
// jobs scheduled (0 if everything was already posted).
export async function postJobsToSocial(jobs: SocialPostJob[], postedLinks: string[]): Promise<number> {
    if (jobs.length === 0) return 0;
    if (!WORKER_URL || !WORKER_SECRET) {
        console.warn('[social] WORKER_URL or WORKER_SECRET not set, skipping social posts');
        return 0;
    }

    const pending = jobs.filter(j => !postedLinks.includes(normalizeUrl(j.applyLink)));
    if (pending.length === 0) {
        console.log('[social] All jobs already posted — nothing new to schedule.');
        return 0;
    }

    const baseStagger = staggerForBatch(pending.length);
    console.log(`[social] Scheduling ${pending.length} new jobs across ${SOCIAL_PLATFORMS.join(', ')} (base stagger ~${Math.round(baseStagger / 1000)}s with jitter)`);

    // Add a 2-minute buffer so the first post is strictly in the future for the worker API
    let cursor = Date.now() + 2 * 60 * 1000;
    let scheduled = 0;

    for (const job of pending) {
        for (const platform of SOCIAL_PLATFORMS) {
            await schedulePost(platform, formatSocialCaption(job, platform), cursor);
        }
        // Remember this link so it is never posted again
        postedLinks.push(normalizeUrl(job.applyLink));
        scheduled++;
        cursor += jitterStagger(baseStagger);
    }

    console.log(`[social] Scheduled ${scheduled} new jobs — last post ~${new Date(cursor).toISOString()}`);
    return scheduled;
}
