import { AtsJob } from '@fresherflow/plugins';
import { isLocationIndiaOrRemote, scoreJobDescription, isSeniorJob } from '@fresherflow/utils';

export interface VerificationResult {
  verifiedJobs: AtsJob[];
  stats: {
    totalRaw: number;
    duplicateFiltered: number;
    previouslySeenFiltered: number;
    staleFiltered: number;
    locationFiltered: number;
    scoreFiltered: number;
    live: number;
    dead: number;
  };
}

/**
 * Filters out duplicates, cached seen URLs, stale, non-India, senior roles, and verifies URL liveness
 */
export async function filterAndVerifyJobs(
  rawJobs: AtsJob[],
  options: {
    hoursOld?: number;
    concurrency?: number;
    cachedSeenUrls?: Set<string>;
  } = {}
): Promise<VerificationResult> {
  const envHours = process.env.HOURS_OLD ? parseInt(process.env.HOURS_OLD, 10) : undefined;
  const hoursOld: number = options.hoursOld ?? (!isNaN(envHours!) ? envHours! : 72);
  const cutoff = Date.now() - hoursOld * 60 * 60 * 1000;

  const stats = {
    totalRaw: rawJobs.length,
    duplicateFiltered: 0,
    previouslySeenFiltered: 0,
    staleFiltered: 0,
    locationFiltered: 0,
    scoreFiltered: 0,
    live: 0,
    dead: 0,
  };

  const filteredCandidates: AtsJob[] = [];
  const seenUrls = new Set<string>();

  for (const job of rawJobs) {
    if (!job.applyLink) continue;

    // 0. Previous Cache Check (Avoid repeating jobs from previous runs)
    if (options.cachedSeenUrls && options.cachedSeenUrls.has(job.applyLink)) {
      stats.previouslySeenFiltered++;
      continue;
    }

    // 1. Duplicate check across keyword queries
    if (seenUrls.has(job.applyLink)) {
      stats.duplicateFiltered++;
      continue;
    }
    seenUrls.add(job.applyLink);

    // 2. Freshness check
    if (job.postedAt) {
      const timestamp = new Date(job.postedAt).getTime();
      if (!isNaN(timestamp) && timestamp < cutoff) {
        stats.staleFiltered++;
        continue;
      }
    }

    // 3. Location check
    if (!isLocationIndiaOrRemote(job.location || '', job.title)) {
      stats.locationFiltered++;
      continue;
    }

    // 4. Senior / Experience Blocker Check
    const titleAndDesc = `${job.title || ''} ${job.description || ''}`;
    if (isSeniorJob(titleAndDesc)) {
      stats.scoreFiltered++;
      continue;
    }

    // Only apply deep scoring if full description text (> 100 chars) is available
    if (job.description && job.description.trim().length > 100) {
      const score = scoreJobDescription(job.title || '', job.description);
      if (score.verdict === 'REJECT') {
        stats.scoreFiltered++;
        continue;
      }
    }

    filteredCandidates.push(job);
  }

  console.log(`\n🧹 Filtering & Scoring Pipeline:`);
  console.log(`   ├─ Raw Total:              ${stats.totalRaw}`);
  console.log(`   ├─ Previously Cached:      ${stats.previouslySeenFiltered}`);
  console.log(`   ├─ Cross-Query Duplicates: ${stats.duplicateFiltered}`);
  console.log(`   ├─ Stale (> ${hoursOld}h):          ${stats.staleFiltered}`);
  console.log(`   ├─ Non-India/Foreign Loc:  ${stats.locationFiltered}`);
  console.log(`   ├─ Non-Fresher Score:      ${stats.scoreFiltered}`);
  console.log(`   └─ Candidates Passed:      ${filteredCandidates.length}`);

  // 5. Liveness check
  console.log(`\n🔍 Verifying ${filteredCandidates.length} job URLs...`);
  const verifiedJobs: AtsJob[] = [];
  const concurrency = options.concurrency ?? 10;

  for (let i = 0; i < filteredCandidates.length; i += concurrency) {
    const chunk = filteredCandidates.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (candidate) => {
        try {
          const resp = await fetch(candidate.applyLink, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(8000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });

          // If HEAD fails or is not allowed (e.g. 405 Method Not Allowed), retry with GET
          if (resp.status === 405 || resp.status === 403) {
            const getResp = await fetch(candidate.applyLink, {
              method: 'GET',
              redirect: 'follow',
              signal: AbortSignal.timeout(8000),
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
            });
            if (getResp.ok || getResp.status === 403) return candidate; // 403 may just mean bot blocked HEAD, URL exists
          } else if (resp.ok) {
            return candidate;
          }
        } catch {
          // If network timeout, assume live unless proven dead (avoid false drops)
          return candidate;
        }
        return null;
      })
    );

    for (const res of results) {
      if (res) {
        verifiedJobs.push(res);
        stats.live++;
      } else {
        stats.dead++;
      }
    }
  }

  return { verifiedJobs, stats };
}
