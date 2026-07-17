import fs from 'node:fs/promises';
import { DiscoveryState } from './state.js';
import { sendTelegramMessage } from '../utils/telegram.js';

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
    if (aggJobs.length > 0) {
        tgMsg += aggLines + aggOverflow;
    } else {
        tgMsg += `  (none)`;
    }

    tgMsg += `\n\n✅ Uploaded to Supabase`;

    console.log("Sending Telegram message:\n" + tgMsg);
    await sendTelegramMessage(tgMsg);

    const apiBaseUrl = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
    if (apiBaseUrl) {
        console.log(`Waking up Render API server: ${apiBaseUrl}/api/health`);
        await fetch(`${apiBaseUrl}/api/health`).catch(() => {});
    }
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


