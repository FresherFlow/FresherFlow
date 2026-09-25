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
    locations?: string[];
    source?: string;
}

const WORKER_URL = (process.env.WORKER_URL || '').trim().replace(/\/$/, '');
const WORKER_SECRET = process.env.WORKER_SECRET || '';
export const SOCIAL_PLATFORMS = ['x', 'linkedin', 'telegram'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Aggregator / job-board blocklist
// ─────────────────────────────────────────────────────────────────────────────
// We must never advertise another platform's board on our own social accounts:
// it sends traffic (and SEO signals) to LinkedIn / Internshala / Unstop, and
// those links are wrappers whose titles are unreliable. Only direct employer /
// ATS links are posted. This is enforced here — the single function every bot
// uses — so no bot can bypass it.
const SOCIAL_BLOCKED_HOSTS: ReadonlySet<string> = new Set([
    // job boards / aggregators / wrappers
    'linkedin.com', 'www.linkedin.com', 'lnkd.in',
    'internshala.com', 'www.internshala.com',
    'unstop.com', 'www.unstop.com',
    'wellfound.com', 'www.wellfound.com', 'angel.co',
    'indeed.com', 'www.indeed.com',
    'naukri.com', 'www.naukri.com', 'naukri.com.b',
    'apna.co', 'www.apna.co',
    'foundit.in', 'www.foundit.in',
    'shine.com', 'www.shine.com',
    'glassdoor.com', 'www.glassdoor.com',
    'monster.com', 'www.monster.com',
    'ziprecruiter.com', 'www.ziprecruiter.com',
    'simplyhired.com', 'www.simplyhired.com',
    'jobvite.com', 'www.jobvite.com',
    'dice.com', 'www.dice.com',
    'instahyre.com', 'www.instahyre.com',
    'cutshort.io', 'www.cutshort.io',
    'wellfound.me', 'welcometothejungle.com', 'www.welcometothejungle.com',
    'hackernews.com', 'news.ycombinator.com',
    't.me', 'telegram.me',
    'google.com', 'www.google.com', 'docs.google.com', 'drive.google.com',
    'youtube.com', 'www.youtube.com', 'facebook.com', 'www.facebook.com',
    'instagram.com', 'www.instagram.com', 'twitter.com', 'x.com',
]);

/** True when the link points at a job board / aggregator / social wrapper. */
export function isBlockedSocialLink(rawUrl: string): boolean {
    if (!rawUrl) return true;
    let u: URL;
    try {
        u = new URL(rawUrl);
    } catch {
        return true;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
    const host = u.hostname.toLowerCase();
    if (SOCIAL_BLOCKED_HOSTS.has(host)) return true;
    // Any subdomain of a blocked board is blocked too (e.g. jobs.linkedin.com)
    for (const blocked of SOCIAL_BLOCKED_HOSTS) {
        if (host.endsWith(`.${blocked}`)) return true;
    }
    return false;
}


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

// Caption style: emoji labels instead of "Company:" / "Apply Here:" prose.
// X counts every URL as a fixed 23 chars, so the caption text is what we can
// actually save — emoji labels cut ~27 chars per post and keep every field
// scannable on mobile. One emoji per field, no emoji spam.
const BOARD_LINK = 'https://fresherflow.github.io/India-Jobs-Internships';

function companyLine(job: SocialPostJob): string {
    const company = (job.company || '').trim();
    return company ? `🏢 ${company}\n` : '';
}

function locationLine(job: SocialPostJob): string {
    const locs = (job.locations || []).map(l => String(l).trim()).filter(Boolean);
    if (locs.length === 0) return '';
    const shown = locs.slice(0, 2).join(' | ');
    return `📍 ${shown}${locs.length > 2 ? ' | +more' : ''}\n`;
}

function truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max - 3).trimEnd() + '...' : text;
}

/**
 * X counts every URL as a fixed 23 characters (t.co wrapping), so measuring the
 * raw string would over-count long job links and shed useful fields (company,
 * location) for no reason. This mirrors how X actually counts.
 */
function xLength(text: string): number {
    return text.replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length;
}

export function formatSocialCaption(job: SocialPostJob, platform: string): string {
    const date = getFormattedDate();
    const company = companyLine(job);
    const location = locationLine(job);
    const title = job.title.trim();
    const link = job.applyLink;

    if (platform === 'x') {
        // Build richest-first, then shed the least valuable pieces (board link →
        // location → title length) while X's real 280-char budget is respected.
        let caption = `🚀 New Job Opening | ${date}\n\n${company}${location}💼 ${title}\n🔗 ${link}\n\n🌐 ${BOARD_LINK}\n\n#FresherJobs #Hiring`;
        if (xLength(caption) > 280) {
            caption = `🚀 New Job Opening | ${date}\n\n${company}${location}💼 ${truncate(title, 60)}\n🔗 ${link}\n\n#FresherJobs #Hiring`;
        }
        if (xLength(caption) > 280) {
            caption = `🚀 New Job Opening | ${date}\n\n${company}💼 ${truncate(title, 55)}\n🔗 ${link}\n\n#FresherJobs`;
        }
        if (xLength(caption) > 280) {
            caption = `🚀 ${company ? 'Hiring' : 'New Job'} | ${date}\n\n💼 ${truncate(title, 45)}\n🔗 ${link}\n\n#FresherJobs`;
        }
        return caption;
    }

    if (platform === 'linkedin') {
        return `🚀 New Job Opening | ${date}\n\n${company}${location}💼 ${title}\n\n🔗 Apply: ${link}\n\n🌐 More jobs: ${BOARD_LINK}\n\n#Freshers #Hiring #EntryLevel #Jobs`;
    }

    // telegram / default
    return `🚀 New Job Opening | ${date}\n\n${company}${location}💼 ${title}\n🔗 Apply: ${link}\n\n🌐 More jobs: ${BOARD_LINK}\n\n#Freshers #Hiring #EntryLevel`;
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

    // Hard rule for every bot: never advertise another platform's job board.
    // Board/aggregator wrapper links are dropped here, before anything is queued.
    const allowed = jobs.filter(j => !isBlockedSocialLink(j.applyLink));
    const blocked = jobs.length - allowed.length;
    if (blocked > 0) {
        console.log(`[social] Blocked ${blocked} aggregator/board link(s) — only direct employer/ATS links are posted.`);
    }
    if (allowed.length === 0) {
        console.log('[social] Nothing to post — every candidate link was an aggregator/board URL.');
        return 0;
    }

    if (!WORKER_URL || !WORKER_SECRET) {
        console.warn('[social] WORKER_URL or WORKER_SECRET not set, skipping social posts');
        return 0;
    }

    const pending = allowed.filter(j => !postedLinks.includes(normalizeUrl(j.applyLink)));
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
