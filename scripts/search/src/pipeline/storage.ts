import fs from 'node:fs/promises';
import { AtsJob } from '@fresherflow/plugins';
import { startRun, finishRun } from '@fresherflow/pipeline';

export async function saveDiscoveredJobsArtifact(jobs: AtsJob[], filename = 'discovered_jobs.json') {
  await fs.writeFile(filename, JSON.stringify(jobs, null, 2), 'utf8');
  console.log(`[Storage] Saved ${jobs.length} jobs to ${filename}`);
}

export async function writeGitHubStepSummary(data: {
  rawCount: number;
  sourceCounts: Record<string, number>;
  staleCount: number;
  locCount: number;
  scoreCount: number;
  verifiedJobs: AtsJob[];
  durationSec: number;
  hoursOld: number;
}) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const lines: string[] = [
    `# 🚀 External Job Search Sweep Summary`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| **Freshness Cutoff** | Last ${data.hoursOld} Hours |`,
    `| **Sweep Duration** | ${data.durationSec}s |`,
    `| **Total Raw Fetched** | **${data.rawCount}** |`,
    `| **Stale Filtered (> ${data.hoursOld}h)** | ${data.staleCount} |`,
    `| **Non-India / Foreign Filtered** | ${data.locCount} |`,
    `| **Non-Fresher / Senior Filtered** | ${data.scoreCount} |`,
    `| **✅ Verified Live Jobs** | **${data.verifiedJobs.length}** |`,
    ``,
    `## 📊 Channel Breakdown`,
    `| Channel / Source | Raw Candidates Fetched |`,
    `|---|---|`,
  ];

  for (const [src, count] of Object.entries(data.sourceCounts)) {
    lines.push(`| ${src} | ${count} |`);
  }

  lines.push(``);
  lines.push(`## 🎯 Verified Live Fresh Jobs (${data.verifiedJobs.length})`);
  lines.push(`| # | Role Title | Company | Location | Source | Apply Link |`);
  lines.push(`|---|---|---|---|---|---|`);

  data.verifiedJobs.forEach((job, idx) => {
    const loc = job.location || 'India / Remote';
    lines.push(`| ${idx + 1} | **${job.title}** | ${job.company} | ${loc} | \`${job.source}\` | [Apply URL](${job.applyLink}) |`);
  });

  lines.push(``);

  try {
    await fs.appendFile(summaryFile, lines.join('\n') + '\n', 'utf8');
    console.log(`[CI Summary] Successfully appended step summary to ${summaryFile}`);
  } catch (err: any) {
    console.warn(`[CI Summary] Failed to write GitHub step summary: ${err.message}`);
  }
}

export { startRun, finishRun };
