import fs from 'node:fs/promises';
import path from 'node:path';
import { AtsJob } from '@fresherflow/plugins';
import { startRun, finishRun } from '../db/repositories/discoveryRuns.js';
import { upsertJobs } from '../db/repositories/discoveredJobs.js';

const CACHE_DIR = path.resolve(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'seen_urls.json');

export async function loadSeenUrlsCache(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      console.log(`[Cache] 📦 Loaded ${arr.length} previously seen job URLs from GitHub cache.`);
      return new Set(arr);
    }
  } catch {
    // Cache file doesn't exist yet on fresh runs
  }
  return new Set<string>();
}

export async function saveSeenUrlsCache(seenUrls: Set<string>): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const arr = Array.from(seenUrls).slice(-50000);
    await fs.writeFile(CACHE_FILE, JSON.stringify(arr), 'utf8');
    console.log(`[Cache] 💾 Saved ${arr.length} seen job URLs to cache.`);
  } catch (err: any) {
    console.warn(`[Cache] Note: Could not save cache: ${err.message}`);
  }
}

export async function saveDiscoveredJobsArtifact(jobs: AtsJob[], filename = 'discovered_jobs.json') {
  await fs.writeFile(filename, JSON.stringify(jobs, null, 2), 'utf8');
  console.log(`[Storage] Saved ${jobs.length} jobs to ${filename}`);
}

export async function persistDiscoveredJobsToDb(jobs: AtsJob[], runId: string | null) {
  try {
    if (jobs.length === 0) return;
    await upsertJobs(jobs, runId);
    console.log(`[Storage] Successfully persisted ${jobs.length} jobs to database (discovered_jobs)`);
  } catch (err: any) {
    console.warn(`[Storage] Database persistence note: ${err.message}`);
  }
}

export async function writeGitHubStepSummary(data: {
  rawCount: number;
  duplicateCount?: number;
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
    `| **Cross-Query Duplicates** | ${data.duplicateCount ?? 0} |`,
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

  const escapeCell = (text: string) => (text || '').replace(/\|/g, '&#124;').replace(/[\r\n]+/g, ' ').trim();

  data.verifiedJobs.forEach((job, idx) => {
    const title = escapeCell(job.title);
    const comp = escapeCell(job.company);
    const loc = escapeCell(job.location || 'India / Remote');
    const src = escapeCell(job.source);
    lines.push(`| ${idx + 1} | **${title}** | ${comp} | ${loc} | \`${src}\` | [Apply URL](${job.applyLink}) |`);
  });

  lines.push(``);

  try {
    await fs.appendFile(summaryFile, lines.join('\n') + '\n', 'utf8');
    console.log(`[CI Summary] Successfully appended step summary to ${summaryFile}`);
  } catch (err: any) {
    console.warn(`[CI Summary] Failed to write GitHub step summary: ${err.message}`);
  }
}

export { startRun, finishRun, upsertJobs };
