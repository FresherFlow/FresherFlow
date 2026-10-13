import { normalizeUrl } from './url.js';
import { parseJobUrl } from '@fresherflow/parser';
import { buildSocialCaption } from '@fresherflow/utils/social';

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

// ─────────────────────────────────────────────────────────────────────────────
// Optimal posting slots (Buffer 2026 studies, times = local IST for India audience)
// ─────────────────────────────────────────────────────────────────────────────
// X study: 8.7M tweets. Best = Tue 9am, then Wed 10am / Wed 9am.
// Reliable window = weekdays 9–11am. Worst days = Sat, Fri. Avoid 6pm–11pm.
// LinkedIn study: 4.8M posts. Peak = weekdays 3pm–8pm.
// Top = Wed 4pm, Fri 3pm, Fri 4pm. Best days = Wed > Thu > Fri.
// Worst = Mon/Tue mornings + weekends.
// Source:
//   https://buffer.com/resources/best-time-to-post-on-twitter-x/
//   https://buffer.com/resources/best-time-to-post-on-linkedin
//
// Index = IST day-of-week (0 = Sunday, matches Date.getDay in IST).
// Values = ranked best hours (24h IST) for that day.
export const X_OPTIMAL_HOURS_IST: Readonly<Record<number, readonly number[]>> = {
    0: [9, 10, 8],   // Sun
    1: [9, 10, 8],   // Mon
    2: [9, 10, 11],  // Tue — #1 day-hour: Tue 9am
    3: [10, 9, 11],  // Wed — best day; 10am > 9am > 11am
    4: [9, 10, 8],   // Thu
    5: [9, 10, 11],  // Fri (weak day overall, mornings only)
    6: [9, 10, 11],  // Sat (worst day, mornings only)
};

export const LINKEDIN_OPTIMAL_HOURS_IST: Readonly<Record<number, readonly number[]>> = {
    0: [22, 21, 6],  // Sun (quiet — late evening only)
    1: [22, 17, 21], // Mon (weak — after work)
    2: [16, 17, 22], // Tue (weak — late afternoon + late evening)
    3: [16, 15, 17], // Wed — best day; 4pm #1 overall
    4: [17, 19, 21], // Thu — late afternoon into evening
    5: [15, 16, 17], // Fri — 3pm #2, 4pm #3 overall
    6: [9, 18, 22],  // Sat (quiet — morning only real slot)
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const OPTIMAL_SLOT_LEAD_MS = 2 * 60 * 1000; // first slot strictly in future (worker API rule)

/** IST calendar parts for a UTC timestamp. */
function istParts(ts: number): { y: number; m: number; d: number; dow: number } {
    const ist = new Date(ts + IST_OFFSET_MS);
    return {
        y: ist.getUTCFullYear(),
        m: ist.getUTCMonth(),
        d: ist.getUTCDate(),
        dow: ist.getUTCDay(),
    };
}

/** Convert an IST wall-clock time to a UTC unix timestamp. */
function istToUtcMs(y: number, m: number, d: number, hour: number, minute: number): number {
    return Date.UTC(y, m, d, hour, minute) - IST_OFFSET_MS;
}

function optimalHoursFor(platform: string, istDow: number): readonly number[] {
    if (platform === 'x') return X_OPTIMAL_HOURS_IST[istDow] ?? [9, 10, 11];
    if (platform === 'linkedin') return LINKEDIN_OPTIMAL_HOURS_IST[istDow] ?? [16, 17, 15];
    return [];
}

/**
 * Next `count` optimal Buffer slots for X / LinkedIn, chronological, IST-aware.
 * Minute is jittered to :04–:14 past the hour so posts land inside the
 * high-engagement hour without looking robotic at :00 sharp.
 */
export function getOptimalSlotsForPlatform(
    platform: 'x' | 'linkedin',
    count: number,
    fromTs: number = Date.now(),
): number[] {
    if (count <= 0) return [];
    const minTs = fromTs + OPTIMAL_SLOT_LEAD_MS;
    const slots: number[] = [];
    // 14-day horizon is plenty: 3 slots/day → 42 slots.
    for (let dayOffset = 0; dayOffset < 14 && slots.length < count; dayOffset++) {
        const probe = fromTs + dayOffset * 24 * 60 * 60 * 1000;
        const { y, m, d, dow } = istParts(probe);
        const hours = [...optimalHoursFor(platform, dow)].sort((a, b) => a - b);
        for (const h of hours) {
            if (slots.length >= count) break;
            const minute = 4 + Math.floor(Math.random() * 11); // :04–:14
            const slot = istToUtcMs(y, m, d, h, minute);
            if (slot > minTs && !slots.includes(slot)) slots.push(slot);
        }
    }
    return slots.sort((a, b) => a - b);
}

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

// Caption voice lives in @fresherflow/utils/social (buildSocialCaption) — one
// template for all bots. This file keeps ATS detection (parser-owned) and
// resolves it to the display label the shared builder takes.

// ATS provider id (from @fresherflow/parser, the single owner of ATS URL
// knowledge) → human label. Detection lives in the parser; this map is
// presentation only.
const ATS_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    greenhouse: 'Greenhouse',
    lever: 'Lever',
    workday: 'Workday',
    ashby: 'Ashby',
    smartrecruiters: 'SmartRecruiters',
    workable: 'Workable',
    recruitee: 'Recruitee',
    teamtailor: 'Teamtailor',
    icims: 'iCIMS',
    oracle: 'Oracle HCM',
    successfactors: 'SAP SuccessFactors',
    eightfold: 'Eightfold',
    darwinbox: 'Darwinbox',
    keka: 'Keka',
    freshteam: 'Freshteam',
    zohorecruit: 'Zoho Recruit',
    greythr: 'greytHR',
    peoplestrong: 'PeopleStrong',
    hrone: 'HROne',
    turbohire: 'TurboHire',
    oorwin: 'Oorwin',
    zimyo: 'Zimyo',
    zwayam: 'Zwayam',
    ismartrecruit: 'iSmartRecruit',
    hreasily: 'HREasily',
    breezy: 'Breezy HR',
    sap: 'SAP',
};

/**
 * Where the apply link lands: "Greenhouse", "Workday", "the company website",
 * or "" when unknown. ATS detection comes from parseJobUrl; the company-site
 * fallback below only handles non-ATS links, which the parser returns null
 * for by design.
 */
function applyDestination(job: SocialPostJob): string {
    const parsed = parseJobUrl(job.applyLink);
    const rawAdapter = parsed?.adapter?.trim() || '';
    if (rawAdapter) {
        const label = ATS_DISPLAY_NAMES[rawAdapter.toLowerCase()];
        if (label) return label;
        return rawAdapter.charAt(0).toUpperCase() + rawAdapter.slice(1);
    }
    let host = '';
    try {
        host = new URL(job.applyLink).hostname.toLowerCase();
    } catch {
        return '';
    }
    if (host.startsWith('www.')) host = host.slice(4);
    // Company career site: hostname carries the company's name
    // (e.g. careers.acme.com for "Acme Corp"). First name-token only, min
    // 4 chars — short tokens ("ABC", "Tata") false-positive everywhere.
    const firstWord = ((job.company || '').toLowerCase().match(/[a-z0-9]+/g) || [])[0] || '';
    const hostSlug = host.replace(/[^a-z0-9]/g, '');
    if (firstWord.length >= 4 && hostSlug.includes(firstWord)) return 'the company website';
    return '';
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

    // Optimal-time scheduling (Buffer 2026 data, IST):
    // X → next weekday 9–11am slots, LinkedIn → next 3–8pm slots.
    // Telegram has no study data — keeps the old stagger rhythm.
    // Falls back to stagger if optimal generation ever comes up short.
    const now = Date.now();
    const xSlots = getOptimalSlotsForPlatform('x', pending.length, now);
    const linkedinSlots = getOptimalSlotsForPlatform('linkedin', pending.length, now);
    const useOptimal = xSlots.length === pending.length && linkedinSlots.length === pending.length;
    if (useOptimal) {
        console.log(`[social] Scheduling ${pending.length} new jobs at optimal IST times — X ~${new Date(xSlots[0]).toISOString()} → ~${new Date(xSlots[xSlots.length - 1]).toISOString()}, LinkedIn ~${new Date(linkedinSlots[0]).toISOString()} → ~${new Date(linkedinSlots[linkedinSlots.length - 1]).toISOString()}`);
    } else {
        const baseStagger = staggerForBatch(pending.length);
        console.log(`[social] Optimal slots short — falling back to stagger ~${Math.round(baseStagger / 1000)}s`);
    }

    const baseStagger = staggerForBatch(pending.length);
    // Add a 2-minute buffer so the first post is strictly in the future for the worker API
    let telegramCursor = now + 2 * 60 * 1000;
    let fallbackCursor = now + 2 * 60 * 1000;
    let scheduled = 0;

    for (let i = 0; i < pending.length; i++) {
        const job = pending[i];
        if (useOptimal) {
            await schedulePost('x', buildSocialCaption(job, 'x', applyDestination(job)), xSlots[i]);
            await schedulePost('linkedin', buildSocialCaption(job, 'linkedin', applyDestination(job)), linkedinSlots[i]);
            await schedulePost('telegram', buildSocialCaption(job, 'telegram', applyDestination(job)), telegramCursor);
            telegramCursor += jitterStagger(baseStagger);
        } else {
            for (const platform of SOCIAL_PLATFORMS) {
                await schedulePost(platform, buildSocialCaption(job, platform, applyDestination(job)), fallbackCursor);
            }
            fallbackCursor += jitterStagger(baseStagger);
        }
        // Remember this link so it is never posted again
        postedLinks.push(normalizeUrl(job.applyLink));
        scheduled++;
    }

    const lastTs = useOptimal
        ? Math.max(xSlots[xSlots.length - 1], linkedinSlots[linkedinSlots.length - 1], telegramCursor)
        : fallbackCursor;
    console.log(`[social] Scheduled ${scheduled} new jobs — last post ~${new Date(lastTs).toISOString()}`);
    return scheduled;
}
