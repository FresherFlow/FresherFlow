import fs from 'node:fs/promises';
import { DiscoveryState, DiscoveredJobEntry } from '@fresherflow/pipeline';
import { sendTelegramMessage } from '@fresherflow/utils';

export async function sendNotifications(state: DiscoveryState) {
    if (state.newJobsFound.length === 0) {
        console.log("No new jobs found this run.");
        return;
    }

    const validJobs = state.newJobsFound.filter(j => !j.reviewRequired);
    const reviewJobs = state.newJobsFound.filter(j => j.reviewRequired);
    const atsJobs = state.newJobsFound.filter(j => j.sourceType === 'ATS');
    const aggJobs = state.newJobsFound.filter(j => j.sourceType === 'AGGREGATOR');

    // ── Per-ATS breakdown (counts only, no links) ─────────────────────────────
    const atsPerProvider: Record<string, number> = {};
    for (const job of atsJobs) {
        const provider = job.source || 'unknown';
        atsPerProvider[provider] = (atsPerProvider[provider] || 0) + 1;
    }
    const atsBreakdown = Object.entries(atsPerProvider)
        .sort((a, b) => b[1] - a[1])
        .map(([p, n]) => `  • ${p}: ${n}`)
        .join('\n');

    // ── Aggregator jobs (title + link) ────────────────────────────────────────
    const aggLines = aggJobs
        .slice(0, 15) // cap at 15 so message doesn't hit Telegram 4096 char limit
        .map(j => `  🌐 ${j.title} (${j.source})\n  ${j.applyLink}`)
        .join('\n\n');
    const aggOverflow = aggJobs.length > 15 ? `\n  ...and ${aggJobs.length - 15} more` : '';

    // ── Build message ─────────────────────────────────────────────────────────
    let tgMsg = `🔥 Job Discovery Run\n`;
    tgMsg += `Total: ${state.newJobsFound.length} jobs`;
    if (reviewJobs.length > 0) {
        tgMsg += ` (${validJobs.length} confirmed, ${reviewJobs.length} review)`;
    }
    tgMsg += `\n\n`;

    tgMsg += `🏢 ATS Direct: ${atsJobs.length}\n${atsBreakdown || '  (none)'}`;
    tgMsg += `\n\n`;

    tgMsg += `🌐 Aggregator: ${aggJobs.length}\n`;

    tgMsg += `\n\n✅ Uploaded to Supabase`;

    console.log("Sending Telegram message:\n" + tgMsg);
    await sendTelegramMessage(tgMsg);

    // Post aggregator jobs to social media (X, LinkedIn, Telegram)
    await postAggregatorsToSocial(aggJobs);

    const apiBaseUrl = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
    if (apiBaseUrl) {
        console.log(`Waking up Render API server: ${apiBaseUrl}/api/health`);
        await fetch(`${apiBaseUrl}/api/health`).catch(() => {});
    }
}

// ─── Social Media Posting ───────────────────────────────────────────────────

const WORKER_URL = (process.env.WORKER_URL || '').trim().replace(/\/$/, '');
const WORKER_SECRET = process.env.WORKER_SECRET || '';
const SOCIAL_PLATFORMS = ['x', 'linkedin', 'telegram'] as const;
const STAGGER_MS = 10 * 60 * 1000; // 10 minutes between posts

function formatXCaption(job: DiscoveredJobEntry): string {
    const title = job.title.length > 60 ? job.title.slice(0, 57) + '...' : job.title;
    const caption = `New Job Opening\n\nRole: ${title}\nApply: ${job.applyLink}\n\n#FresherJobs #Hiring`;
    // X limit is 280 chars. If over, shorten further.
    if (caption.length > 280) {
        const shortTitle = job.title.length > 40 ? job.title.slice(0, 37) + '...' : job.title;
        return `New Job Opening\n\nRole: ${shortTitle}\nApply: ${job.applyLink}\n\n#FresherJobs`;
    }
    return caption;
}

function formatLinkedInCaption(job: DiscoveredJobEntry): string {
    return `New Job Opening\n\nRole: ${job.title}\nApply Here: ${job.applyLink}\n\n#Freshers #Hiring #EntryLevel #Jobs`;
}

function formatTelegramCaption(job: DiscoveredJobEntry): string {
    return `New Job Opening\n\nRole: ${job.title}\nApply Here: ${job.applyLink}\n\n#Freshers #Hiring #EntryLevel`;
}

function formatCaption(job: DiscoveredJobEntry, platform: string): string {
    switch (platform) {
        case 'x': return formatXCaption(job);
        case 'linkedin': return formatLinkedInCaption(job);
        case 'telegram': return formatTelegramCaption(job);
        default: return formatLinkedInCaption(job);
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

async function postAggregatorsToSocial(aggJobs: DiscoveredJobEntry[]): Promise<void> {
    if (aggJobs.length === 0) return;
    if (!WORKER_URL || !WORKER_SECRET) {
        console.warn('[social] WORKER_URL or WORKER_SECRET not set, skipping social posts');
        return;
    }

    console.log(`[social] Posting ${aggJobs.length} aggregator jobs to ${SOCIAL_PLATFORMS.join(', ')}`);

    // Add a 2-minute buffer to ensure the first post is strictly in the future for the worker API
    const now = Date.now() + 2 * 60 * 1000;
    let postIndex = 0;

    for (const job of aggJobs) {
        for (const platform of SOCIAL_PLATFORMS) {
            const text = formatCaption(job, platform);
            const scheduledAt = now + (postIndex * STAGGER_MS);
            await schedulePost(platform, text, scheduledAt);
        }
        postIndex++;
    }

    console.log(`[social] All ${aggJobs.length} aggregator jobs scheduled across ${SOCIAL_PLATFORMS.length} platforms`);
}

export async function writeGitHubSummary(state: DiscoveryState) {
    const atsJobs = state.newJobsFound.filter(j => j.sourceType === 'ATS');
    const aggJobs = state.newJobsFound.filter(j => j.sourceType === 'AGGREGATOR');
    const reviewTotal = state.newJobsFound.filter(j => j.reviewRequired).length;
    const confirmedTotal = state.newJobsFound.filter(j => !j.reviewRequired).length;

    // Per-provider breakdown for console
    const atsPerProvider: Record<string, number> = {};
    for (const job of atsJobs) {
        const p = job.source || 'unknown';
        atsPerProvider[p] = (atsPerProvider[p] || 0) + 1;
    }
    const providerLines = Object.entries(atsPerProvider)
        .sort((a, b) => b[1] - a[1])
        .map(([p, n]) => `║  ├─ ${p.padEnd(22)}: ${String(n).padEnd(16)}║`)
        .join('\n');

    console.log(`
╔══════════════════════════════════════════════════╗
║               RUN SUMMARY                        ║
╠══════════════════════════════════════════════════╣
║  Total new jobs found    : ${String(state.newJobsFound.length).padEnd(20)}║
║  ├─ ATS Direct           : ${String(atsJobs.length).padEnd(20)}║
${providerLines}
║  └─ Aggregator           : ${String(aggJobs.length).padEnd(20)}║
║                                                  ║
║  Confirmed (no review)   : ${String(confirmedTotal).padEnd(20)}║
║  Flagged for review      : ${String(reviewTotal).padEnd(20)}║
╚══════════════════════════════════════════════════╝`);

    // ── GitHub Actions step summary ───────────────────────────────────────────
    if (process.env.GITHUB_STEP_SUMMARY) {
        let summary = `## Job Discovery Bot Results\n\n`;
        summary += `Discovered **${state.newJobsFound.length}** new jobs → uploaded to **Supabase**.\n\n`;

        // ATS count breakdown table
        summary += `### ATS Direct (${atsJobs.length})\n`;
        summary += `| Provider | Jobs Found |\n|---|---|\n`;
        for (const [p, n] of Object.entries(atsPerProvider).sort((a, b) => b[1] - a[1])) {
            summary += `| ${p} | ${n} |\n`;
        }
        summary += `\n`;

        // Full ATS job links
        if (atsJobs.length > 0) {
            atsJobs.forEach(j => {
                const reviewMark = j.reviewRequired ? ' (⚠️ Review)' : '';
                summary += `- 🏢 **${j.title}** via ${j.source}${reviewMark}: ${j.applyLink}\n`;
            });
            summary += `\n`;
        }

        // Aggregator list with links
        summary += `### Aggregator (${aggJobs.length})\n`;
        if (aggJobs.length > 0) {
            aggJobs.forEach(j => {
                const reviewMark = j.reviewRequired ? ' (⚠️ Review)' : '';
                summary += `- 🌐 **${j.title}** via ${j.source}${reviewMark}: ${j.applyLink}\n`;
            });
        } else {
            summary += `No aggregator jobs this run.\n`;
        }

        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }
}


