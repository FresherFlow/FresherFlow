import fs from 'node:fs/promises';
import { DiscoveryState } from './state.js';
import { sendTelegramMessage } from '../utils/telegram.js';

export async function sendNotifications(state: DiscoveryState) {
    // ── Send Telegram alert ───────────────────────────────────────────────────
    if (state.newJobsFound.length > 0) {
        const validJobs = state.newJobsFound.filter(j => !j.reviewRequired);
        const reviewJobs = state.newJobsFound.filter(j => j.reviewRequired);

        let msg = "";
        if (validJobs.length > 0) {
            const atsCount = validJobs.filter(j => j.sourceType === 'ATS').length;
            const aggCount = validJobs.filter(j => j.sourceType === 'AGGREGATOR').length;
            msg += `🔥 <b>Job Discovery Bot Found ${validJobs.length} New Fresher Jobs!</b> 🔥\n`;
            msg += `<i>(${atsCount} ATS Direct, ${aggCount} Aggregator)</i>\n\n`;
            for (const job of validJobs.slice(0, 15)) {
                const badge = job.sourceType === 'ATS' ? '🏢' : '🌐';
                msg += `- ${badge} <b>${job.title}</b> (via ${job.source})\n  Link: ${job.applyLink}\n\n`;
            }
            if (validJobs.length > 15) msg += `...and ${validJobs.length - 15} more!\n\n`;
        }

        if (reviewJobs.length > 0) {
            msg += `⚠️ <b>Review Required Jobs:</b> ⚠️\n\n`;
            for (const job of reviewJobs.slice(0, 10)) {
                msg += `- <b>${job.title}</b> (via ${job.source})\n  Link: ${job.applyLink}\n\n`;
            }
            if (reviewJobs.length > 10) msg += `...and ${reviewJobs.length - 10} more!\n\n`;
        }

        msg += `Please add these to the Admin Dashboard.`;
        console.log("Sending Telegram message:", msg);
        await sendTelegramMessage(msg);

        const apiBaseUrl = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
        if (apiBaseUrl) {
            console.log(`Waking up Render API server: ${apiBaseUrl}/api/health`);
            fetch(`${apiBaseUrl}/api/health`).catch(() => {});
        }
    } else {
        console.log("No new jobs found this run.");
    }
}

export async function writeGitHubSummary(state: DiscoveryState) {
    // ── Run Summary ───────────────────────────────────────────────────────────
    const atsTotal = state.newJobsFound.filter(j => j.sourceType === 'ATS').length;
    const aggTotal = state.newJobsFound.filter(j => j.sourceType === 'AGGREGATOR').length;
    const reviewTotal = state.newJobsFound.filter(j => j.reviewRequired).length;
    const confirmedTotal = state.newJobsFound.filter(j => !j.reviewRequired).length;
    console.log(`
╔══════════════════════════════════════════════════╗
║               RUN SUMMARY                        ║
╠══════════════════════════════════════════════════╣
║  Total new jobs found    : ${String(state.newJobsFound.length).padEnd(20)}║
║  ├─ ATS Direct           : ${String(atsTotal).padEnd(20)}║
║  └─ Aggregator           : ${String(aggTotal).padEnd(20)}║
║                                                  ║
║  Confirmed (no review)   : ${String(confirmedTotal).padEnd(20)}║
║  Flagged for review      : ${String(reviewTotal).padEnd(20)}║
╚══════════════════════════════════════════════════╝`);

    // ── GitHub Actions step summary ───────────────────────────────────────────
    if (process.env.GITHUB_STEP_SUMMARY) {
        let summary = `## Job Discovery Bot Results\n\n`;
        summary += `Discovered **${state.newJobsFound.length}** new jobs and uploaded them to the \`R2 Bronze Data Lake\`.\n\n`;
        
        summary += `- **ATS Jobs**: ${atsTotal}\n- **Aggregator Jobs**: ${aggTotal}\n\n`;
        
        if (state.newJobsFound.length > 0) {
            summary += `### Discovered Jobs\n`;
            state.newJobsFound.forEach(j => {
                const reviewMark = j.reviewRequired ? ' (⚠️ Review)' : '';
                const typeMark = j.sourceType === 'ATS' ? '🏢' : '🌐';
                summary += `- ${typeMark} **${j.title}** (via ${j.source})${reviewMark}: ${j.applyLink}\n`;
            });
        } else {
            summary += `No new fresher jobs were found during this run.`;
        }
        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }
}
