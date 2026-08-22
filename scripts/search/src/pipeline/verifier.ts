import { AtsJob } from '@fresherflow/plugins';
import { isLocationIndiaOrRemote, scoreJobDescription } from '@fresherflow/domain';

export interface VerificationResult {
  verifiedJobs: AtsJob[];
  stats: {
    totalRaw: number;
    staleFiltered: number;
    locationFiltered: number;
    scoreFiltered: number;
    live: number;
    dead: number;
  };
}

/**
 * Filters out stale, non-India, senior roles, and verifies URL liveness
 */
export async function filterAndVerifyJobs(
  rawJobs: AtsJob[],
  options: {
    hoursOld?: number;
    concurrency?: number;
  } = {}
): Promise<VerificationResult> {
  const hoursOld = options.hoursOld ?? 24;
  const cutoff = Date.now() - hoursOld * 60 * 60 * 1000;

  const stats = {
    totalRaw: rawJobs.length,
    staleFiltered: 0,
    locationFiltered: 0,
    scoreFiltered: 0,
    live: 0,
    dead: 0,
  };

  const filteredCandidates: AtsJob[] = [];
  const seenUrls = new Set<string>();

  for (const job of rawJobs) {
    if (!job.applyLink || seenUrls.has(job.applyLink)) continue;
    seenUrls.add(job.applyLink);

    // 1. Freshness check
    if (job.postedAt) {
      const timestamp = new Date(job.postedAt).getTime();
      if (!isNaN(timestamp) && timestamp < cutoff) {
        stats.staleFiltered++;
        continue;
      }
    }

    // 2. Location check
    if (!isLocationIndiaOrRemote(job.location || '', job.title)) {
      stats.locationFiltered++;
      continue;
    }

    // 3. Fresher scoring check
    const score = scoreJobDescription(job.title || '', job.description || '');
    if (score.verdict === 'REJECT') {
      stats.scoreFiltered++;
      continue;
    }

    filteredCandidates.push(job);
  }

  console.log(`\n🧹 Filtering & Scoring Pipeline:`);
  console.log(`   ├─ Raw Total:              ${stats.totalRaw}`);
  console.log(`   ├─ Stale Filtered (> ${hoursOld}h):  ${stats.staleFiltered}`);
  console.log(`   ├─ Non-India/Foreign Loc:  ${stats.locationFiltered}`);
  console.log(`   ├─ Non-Fresher Score:      ${stats.scoreFiltered}`);
  console.log(`   └─ Candidates Passed:      ${filteredCandidates.length}`);

  // 4. Liveness check
  console.log(`\n🔍 Verifying ${filteredCandidates.length} job URLs...`);
  const verifiedJobs: AtsJob[] = [];
  const concurrency = options.concurrency ?? 10;

  for (let i = 0; i < filteredCandidates.length; i += concurrency) {
    const batch = filteredCandidates.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (job) => {
        try {
          const resp = await fetch(job.applyLink, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(8000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          if (resp.ok || resp.status === 403 || resp.status === 401) {
            return job;
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        stats.live++;
        verifiedJobs.push(r.value);
      } else {
        stats.dead++;
      }
    }
  }

  console.log(`   ✅ ${stats.live} live, ❌ ${stats.dead} dead`);

  return { verifiedJobs, stats };
}
