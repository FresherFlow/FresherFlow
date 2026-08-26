import { AtsJob } from '@fresherflow/plugins';
import { isLocationIndiaOrRemote, scoreJobDescription, isSeniorJob } from '@fresherflow/utils';

export interface SourceFunnelStats {
  raw: number;
  cached: number;
  duplicate: number;
  filtered: number;
  dead: number;
  live: number;
}

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
  sourceStats: Record<string, SourceFunnelStats>;
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

  const sourceStats: Record<string, SourceFunnelStats> = {};

  const getSourceStats = (src: string) => {
    if (!sourceStats[src]) {
      sourceStats[src] = { raw: 0, cached: 0, duplicate: 0, filtered: 0, dead: 0, live: 0 };
    }
    return sourceStats[src];
  };

  const filteredCandidates: AtsJob[] = [];
  const seenUrls = new Set<string>();

  for (const job of rawJobs) {
    if (!job.applyLink) continue;
    const src = job.source || 'Unknown';
    const sStat = getSourceStats(src);
    sStat.raw++;

    // 0. Previous Cache Check (Avoid repeating jobs from previous runs)
    if (options.cachedSeenUrls && options.cachedSeenUrls.has(job.applyLink)) {
      stats.previouslySeenFiltered++;
      sStat.cached++;
      continue;
    }

    // 1. Duplicate check across keyword queries
    if (seenUrls.has(job.applyLink)) {
      stats.duplicateFiltered++;
      sStat.duplicate++;
      continue;
    }
    seenUrls.add(job.applyLink);

    // 2. Freshness check
    if (job.postedAt) {
      const timestamp = new Date(job.postedAt).getTime();
      if (!isNaN(timestamp) && timestamp < cutoff) {
        stats.staleFiltered++;
        sStat.filtered++;
        continue;
      }
    }

    // 3. Location check
    if (!isLocationIndiaOrRemote(job.location || '', job.title)) {
      stats.locationFiltered++;
      sStat.filtered++;
      continue;
    }

    // 4. Senior / Experience Blocker Check
    const titleAndDesc = `${job.title || ''} ${job.description || ''}`;
    if (isSeniorJob(titleAndDesc)) {
      stats.scoreFiltered++;
      sStat.filtered++;
      continue;
    }

    // Only apply deep scoring if full description text (> 100 chars) is available
    if (job.description && job.description.trim().length > 100) {
      const score = scoreJobDescription(job.title || '', job.description);
      if (score.verdict === 'REJECT') {
        stats.scoreFiltered++;
        sStat.filtered++;
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
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });

          // If HEAD is blocked or method not allowed, fallback to GET
          if (resp.status === 405 || resp.status === 403 || resp.status === 503 || resp.status === 429) {
            const getResp = await fetch(candidate.applyLink, {
              method: 'GET',
              redirect: 'follow',
              signal: AbortSignal.timeout(8000),
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
              },
            });
            // 200, or anti-bot challenge (403/503/429) on known job sites means the URL endpoint exists
            if (getResp.ok || getResp.status === 403 || getResp.status === 503 || getResp.status === 429) {
              return candidate;
            }
          } else if (resp.ok || resp.status === 403 || resp.status === 503 || resp.status === 429) {
            return candidate;
          }
        } catch {
          // If network timeout, assume live unless proven dead (avoid false drops)
          return candidate;
        }
        return null;
      })
    );

    for (let j = 0; j < chunk.length; j++) {
      const candidate = chunk[j];
      const res = results[j];
      const src = candidate.source || 'Unknown';
      const sStat = getSourceStats(src);

      if (res) {
        verifiedJobs.push(res);
        stats.live++;
        sStat.live++;
      } else {
        stats.dead++;
        sStat.dead++;
      }
    }
  }

  return { verifiedJobs, stats, sourceStats };
}
