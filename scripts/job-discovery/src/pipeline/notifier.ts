import fs from 'node:fs/promises';
import { DiscoveryState, DiscoveredJobEntry, fetchTargetSitesFromCdn, postJobsToSocial, createBoardPublisher } from '@fresherflow/pipeline';
import { sendTelegramMessage } from '@fresherflow/utils';

function getFormattedDate(): string {
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

// Which bot is running — set via DISCOVERY_MODE in the workflow env
const BOT_MODE = (process.env.DISCOVERY_MODE || 'all').toLowerCase();
const BOT_TITLE =
    BOT_MODE === 'ats' ? '🏢 ATS Discovery Run' :
    BOT_MODE === 'aggregator' ? '🌐 Aggregator Discovery Run' :
    '🔥 Job Discovery Run';

// Aggregator site domains from the CDN json — we only post real external apply
// links, never the aggregator sites' own post URLs.
let cachedAggregatorDomains: Set<string> | null = null;

async function getAggregatorDomains(): Promise<Set<string>> {
    if (cachedAggregatorDomains) return cachedAggregatorDomains;
    const domains = new Set<string>();
    try {
        const sites = await fetchTargetSitesFromCdn();
        for (const site of sites) {
            for (const u of [...(site.urls || []), ...(site.govtUrls || [])]) {
                try { domains.add(new URL(u).hostname.toLowerCase()); } catch { /* ignore invalid */ }
            }
        }
    } catch {
        console.warn('[Notifier] Failed to load aggregator sites from CDN — cannot filter aggregator-site links.');
    }
    cachedAggregatorDomains = domains;
    return domains;
}

function isAggregatorSiteUrl(url: string, domains: Set<string>): boolean {
    if (domains.size === 0) return false; // CDN unavailable — don't drop jobs
    try {
        const host = new URL(url).hostname.toLowerCase();
        for (const d of domains) {
            if (host === d || host.endsWith('.' + d)) return true;
        }
    } catch { /* unparseable URL */ }
    return false;
}

async function filterAggregatorSiteLinks(jobs: DiscoveredJobEntry[]): Promise<DiscoveredJobEntry[]> {
    if (jobs.length === 0) return jobs;
    const domains = await getAggregatorDomains();
    const kept = jobs.filter(j => !isAggregatorSiteUrl(j.applyLink, domains));
    if (kept.length !== jobs.length) {
        console.log(`  🚫 [Notifier] Skipped ${jobs.length - kept.length} jobs whose apply link is an aggregator site — posting only real apply links.`);
    }
    return kept;
}

export async function sendNotifications(state: DiscoveryState) {
    if (state.newJobsFound.length === 0) {
        console.log("No new jobs found this run.");
        return;
    }

    const validJobs = state.newJobsFound.filter(j => !j.reviewRequired);
    const reviewJobs = state.newJobsFound.filter(j => j.reviewRequired);
    const atsJobs = state.newJobsFound.filter(j => j.sourceType === 'ATS');
    const aggJobs = state.newJobsFound.filter(j => j.sourceType === 'AGGREGATOR');
    // Never post the aggregator sites' own URLs — only real external apply links
    const realAggJobs = await filterAggregatorSiteLinks(aggJobs);

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
    let tgMsg = `${BOT_TITLE} — ${getFormattedDate()}\n`;
    tgMsg += `Total: ${state.newJobsFound.length} jobs`;
    if (reviewJobs.length > 0) {
        tgMsg += ` (${validJobs.length} confirmed, ${reviewJobs.length} review)`;
    }
    tgMsg += `\n\n`;

    if (BOT_MODE !== 'aggregator') {
        tgMsg += `🏢 ATS Direct: ${atsJobs.length}\n${atsBreakdown || '  (none)'}`;
        tgMsg += `\n\n`;
    }

    if (BOT_MODE !== 'ats') {
        tgMsg += `🌐 Aggregator: ${realAggJobs.length}\n`;
        tgMsg += `\n\n`;
    }

    tgMsg += `✅ Uploaded to Supabase`;

    console.log("Sending Telegram message:\n" + tgMsg);
    await sendTelegramMessage(tgMsg);

    // Social media (X, LinkedIn, Telegram channel).
    // Only ATS/direct-employer jobs are posted. Aggregator wrapper links
    // (LinkedIn, Internshala, Unstop, ...) are never advertised on our accounts —
    // the shared poster enforces this, and we do not even hand them over.
    const atsJobsForSocial = state.newJobsFound.filter(
        j => j.sourceType === 'ATS' && j.applyLink && j.title
    );
    if (atsJobsForSocial.length > 0) {
        await postJobsToSocial(
            atsJobsForSocial.map(j => ({
                title: j.title,
                applyLink: j.applyLink,
                company: j.company,
                locations: [j.location, j.locationCity].filter((l): l is string => !!l && !!l.trim()),
                source: j.source,
            })),
            state.postedLinks
        );

        // Community board intake: file `new_role` issues for the same jobs.
        // Disabled unless BOARD_PUBLISH_ENABLED=true (dry-run by default).
        const board = createBoardPublisher();
        if (board) {
            for (const j of atsJobsForSocial) {
                await board.post({
                    title: j.title,
                    company: j.company || '',
                    applyLink: j.applyLink,
                    locations: [j.location, j.locationCity].filter((l): l is string => !!l && !!l.trim()),
                });
            }
            const bs = board.summary();
            console.log(`[board] eligible: ${bs.eligible} | filed: ${bs.created} | skipped: ${bs.skipped} | failed: ${bs.failed}`);
        }
    }

    const apiBaseUrl = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
    if (apiBaseUrl) {
        console.log(`Waking up Render API server: ${apiBaseUrl}/api/health`);
        await fetch(`${apiBaseUrl}/api/health`).catch(() => {});
    }
}

// ─── Social Media Posting ───────────────────────────────────────────────────
// The shared poster (packages/pipeline/src/utils/social.ts) owns captions,
// adaptive stagger, dedup, the aggregator/board blocklist and the worker call.
// Aggregator wrapper links are never passed to it — see the call site above.

export async function writeGitHubSummary(state: DiscoveryState) {
    const atsJobs = state.newJobsFound.filter(j => j.sourceType === 'ATS');
    const aggJobs = state.newJobsFound.filter(j => j.sourceType === 'AGGREGATOR');
    const realAggJobs = await filterAggregatorSiteLinks(aggJobs);
    const reviewTotal = state.newJobsFound.filter(j => j.reviewRequired).length;
    const confirmedTotal = state.newJobsFound.filter(j => !j.reviewRequired).length;

    // ── Safety-window usefulness (additive observability only) ───────────────
    // Joined at publish time: published jobs whose wrapper post URL was in that
    // run's per-site sitemap safety window, grouped by safetySite.
    const safetyUseful: Record<string, number> = {};
    for (const job of state.newJobsFound) {
        if (job.fromSafetyWindow) {
            const siteName = job.safetySite || job.source || 'unknown';
            safetyUseful[siteName] = (safetyUseful[siteName] || 0) + 1;
        }
    }
    const safetyUsefulPairs = Object.entries(safetyUseful).sort((a, b) => b[1] - a[1]);

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

    const boxTitle = BOT_MODE === 'ats' ? 'ATS RUN SUMMARY' : BOT_MODE === 'aggregator' ? 'AGGREGATOR RUN SUMMARY' : 'RUN SUMMARY';
    const atsBoxRows = BOT_MODE !== 'aggregator' ? `║  ├─ ATS Direct           : ${String(atsJobs.length).padEnd(20)}║\n${providerLines}` : '';
    const aggBoxRow = BOT_MODE !== 'ats' ? `║  └─ Aggregator           : ${String(realAggJobs.length).padEnd(20)}║` : '';

    console.log(`
╔══════════════════════════════════════════════════╗
║  ${boxTitle.padEnd(46)}║
╠══════════════════════════════════════════════════╣
║  Total new jobs found    : ${String(state.newJobsFound.length).padEnd(20)}║
${atsBoxRows}
${aggBoxRow}
║                                                  ║
║  Confirmed (no review)   : ${String(confirmedTotal).padEnd(20)}║
║  Flagged for review      : ${String(reviewTotal).padEnd(20)}║
╚══════════════════════════════════════════════════╝`);

    for (const [siteName, n] of safetyUsefulPairs) {
        console.log(`useful-safety=${siteName}:${n}`);
    }

    // ── GitHub Actions step summary ───────────────────────────────────────────
    if (process.env.GITHUB_STEP_SUMMARY) {
        const botName = BOT_MODE === 'ats' ? 'ATS Discovery Bot' : BOT_MODE === 'aggregator' ? 'Aggregator Discovery Bot' : 'Job Discovery Bot';
        let summary = `# 🔍 ${botName} Summary\n\n`;
        summary += `| Metric | Value |\n`;
        summary += `|---|---|\n`;
        summary += `| **Total Discovered** | **${state.newJobsFound.length}** |\n`;
        if (BOT_MODE !== 'aggregator') {
            summary += `| **🏢 Direct ATS Jobs** | ${atsJobs.length} |\n`;
        }
        if (BOT_MODE !== 'ats') {
            summary += `| **🌐 Aggregator Jobs** | ${realAggJobs.length} |\n`;
        }
        summary += `| **✅ Confirmed** | ${confirmedTotal} |\n`;
        summary += `| **⚠️ Flagged for Review** | ${reviewTotal} |\n`;
        if (safetyUsefulPairs.length > 0) {
            summary += `| **🪟 Useful safety-window** | ${safetyUsefulPairs.map(([s, n]) => `useful-safety=${s}:${n}`).join(', ')} |\n`;
        }
        summary += `\n`;

        // ATS count breakdown table
        if (Object.keys(atsPerProvider).length > 0) {
            summary += `## 📊 ATS Source Breakdown\n\n`;
            summary += `| ATS Provider | Jobs Found |\n|---|---|\n`;
            for (const [p, n] of Object.entries(atsPerProvider).sort((a, b) => b[1] - a[1])) {
                summary += `| **${p}** | ${n} |\n`;
            }
            summary += `\n`;
        }

        // Full ATS job links
        if (atsJobs.length > 0) {
            summary += `## 🏢 Direct ATS Jobs (${atsJobs.length})\n\n`;
            summary += `| # | Role Title | Company | Provider | Review | Apply Link |\n`;
            summary += `|---|---|---|---|---|---|\n`;
            atsJobs.forEach((j, idx) => {
                const title = (j.title || 'Job').replace(/\|/g, '&#124;');
                const company = (j.company || 'Company').replace(/\|/g, '&#124;');
                const reviewMark = j.reviewRequired ? '⚠️ Review' : '✅ Verified';
                summary += `| ${idx + 1} | ${title} | ${company} | ${j.source} | ${reviewMark} | [Apply Link](${j.applyLink}) |\n`;
            });
            summary += `\n`;
        }

        // Aggregator list with links (only real apply links — never aggregator site URLs)
        if (realAggJobs.length > 0) {
            summary += `## 🌐 Aggregator Jobs (${realAggJobs.length})\n\n`;
            summary += `| # | Role Title | Company | Source | Review | Apply Link |\n`;
            summary += `|---|---|---|---|---|---|\n`;
            realAggJobs.forEach((j, idx) => {
                const title = (j.title || 'Job').replace(/\|/g, '&#124;');
                const company = (j.company || 'Company').replace(/\|/g, '&#124;');
                const reviewMark = j.reviewRequired ? '⚠️ Review' : '✅ Verified';
                summary += `| ${idx + 1} | ${title} | ${company} | ${j.source} | ${reviewMark} | [Apply Link](${j.applyLink}) |\n`;
            });
            summary += `\n`;
        }

        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }
}


