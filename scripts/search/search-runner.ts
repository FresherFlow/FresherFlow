import { AtsJob } from '@fresherflow/plugins';
import {
  collectPublicFeeds,
  collectBoardSearches,
  collectGitHubHiring,
  collectDirectCompanyPortals,
  collectDorkSearches,
  collectHyderabadWalkinDrives,
  collectVcStartupPortals,

  filterAndVerifyJobs,
  saveDiscoveredJobsArtifact,
  persistDiscoveredJobsToDb,
  writeGitHubStepSummary,
  startRun,
  finishRun,
  loadSeenUrlsCache,
  saveSeenUrlsCache,
  loadEnv,
  loadRolesFromCdn,
  CORE_SEARCH_KEYWORDS,
} from '@fresherflow/pipeline';

interface RunnerOptions {
  hoursOld?: number;
  resultsWanted?: number;
  dork?: boolean;
  roles?: boolean;
  dryRun?: boolean;
  channel?: string;
  noCache?: boolean;
}

function parseRunnerArgs(args: string[]): RunnerOptions {
  const options: RunnerOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--hoursOld' && args[i + 1]) options.hoursOld = parseInt(args[++i], 10);
    else if (arg === '--resultsWanted' && args[i + 1]) options.resultsWanted = parseInt(args[++i], 10);
    else if (arg === '--dork') options.dork = true;
    else if (arg === '--roles') options.roles = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--no-cache' || arg === '--force') options.noCache = true;
    else if (arg === '--channel' && args[i + 1]) options.channel = args[++i].toLowerCase();
  }
  return options;
}

async function runSearchEngine() {
  await loadEnv();
  const startTime = Date.now();
  const options = parseRunnerArgs(process.argv.slice(2));
  const envHours = process.env.HOURS_OLD ? parseInt(process.env.HOURS_OLD, 10) : undefined;
  const hoursOld: number = options.hoursOld ?? (!isNaN(envHours!) ? envHours! : 72);
  const limit = options.resultsWanted ?? 15;
  const channel = options.channel || 'all';

  console.log(`\n======================================================`);
  console.log(`🚀 STARTING EXTERNAL MULTI-CHANNEL JOB SEARCH ENGINE`);
  console.log(`   └─ Channel: ${channel.toUpperCase()}`);
  console.log(`   └─ Cutoff: ${hoursOld} hours`);
  console.log(`   └─ Cache: ${options.noCache ? 'BYPASS' : 'ENABLED'}`);
  console.log(`   └─ Dorking Enabled: ${options.dork ? 'YES' : 'NO'}`);
  console.log(`   └─ Role Expansion: ${options.roles ? 'YES' : 'NO'}`);
  console.log(`   └─ Dry Run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log(`======================================================`);

  const runId = await startRun();

  try {
    const { sendTelegramMessage } = await import('@fresherflow/utils');
    await sendTelegramMessage(
      `🚀 <b>External Search Bot Started</b>\n\nChannels: ${channel.toUpperCase()} (${options.dork ? 'Dorks' : 'Fast Mode'})`
    );
  } catch {
    // Non-blocking
  }

  const seenUrlsCache = options.noCache ? new Set<string>() : await loadSeenUrlsCache();
  const rawCandidates: AtsJob[] = [];
  const rawSourceCounts: Record<string, number> = {};

  try {
    const keywords = options.roles ? await loadRolesFromCdn() : CORE_SEARCH_KEYWORDS;

    // Run selected or all channels concurrently
    const [feedJobs, boardJobs, vcJobs, companyJobs, githubJobs, walkinJobs] = await Promise.all([
      (channel === 'all' || channel === 'feeds') ? collectPublicFeeds({ resultsWanted: limit, hoursOld }) : Promise.resolve([]),
      (channel === 'all' || channel === 'boards') ? collectBoardSearches(keywords, { resultsPerKeyword: limit, hoursOld }) : Promise.resolve([]),
      (channel === 'all' || channel === 'vc' || channel === 'boards') ? collectVcStartupPortals() : Promise.resolve([]),
      (channel === 'all' || channel === 'companies') ? collectDirectCompanyPortals({ resultsWanted: limit, hoursOld }) : Promise.resolve([]),
      (channel === 'all' || channel === 'github') ? collectGitHubHiring({ resultsWanted: limit }) : Promise.resolve([]),
      (channel === 'all' || channel === 'walkin') ? collectHyderabadWalkinDrives({ resultsWanted: 10, hoursOld }) : Promise.resolve([]),
    ]);

    rawCandidates.push(...feedJobs, ...boardJobs, ...vcJobs, ...companyJobs, ...githubJobs, ...walkinJobs);


    // Track raw source counts
    for (const job of rawCandidates) {
      const src = job.source || 'Unknown';
      rawSourceCounts[src] = (rawSourceCounts[src] || 0) + 1;
    }

    // Run optional dorks if requested
    if (options.dork) {
      const dorkJobs = await collectDorkSearches({ maxQueries: 6 });
      rawCandidates.push(...dorkJobs);
      rawSourceCounts['SearchDorks'] = (rawSourceCounts['SearchDorks'] || 0) + dorkJobs.length;
    }

    console.log(`\n======================================================`);
    console.log(`📊 COLLECTED RAW CANDIDATES: ${rawCandidates.length}`);
    console.log(`======================================================`);

    // Verify and Filter using Seen URLs Cache
    const { verifiedJobs, stats, sourceStats } = await filterAndVerifyJobs(rawCandidates, {
      hoursOld,
      cachedSeenUrls: seenUrlsCache,
    });

    // Update seen URLs cache with newly discovered candidate URLs
    for (const candidate of rawCandidates) {
      if (candidate.applyLink) seenUrlsCache.add(candidate.applyLink);
    }
    await saveSeenUrlsCache(seenUrlsCache);

    // Calculate verified count per source
    const verifiedSourceCounts: Record<string, number> = {};
    for (const j of verifiedJobs) {
      const src = j.source || 'Unknown';
      verifiedSourceCounts[src] = (verifiedSourceCounts[src] || 0) + 1;
    }

    // Output Artifact & Persist to Database (Supabase discovered_jobs)
    await saveDiscoveredJobsArtifact(verifiedJobs, 'discovered_jobs.json');
    await persistDiscoveredJobsToDb(verifiedJobs, runId);

    const durationSec = Math.round((Date.now() - startTime) / 1000);

    // Write GitHub Action step summary if running in CI
    await writeGitHubStepSummary({
      rawCount: stats.totalRaw,
      duplicateCount: stats.duplicateFiltered,
      sourceCounts: rawSourceCounts,
      sourceStats,
      staleCount: stats.staleFiltered,
      locCount: stats.locationFiltered,
      scoreCount: stats.scoreFiltered,
      verifiedJobs,
      durationSec,
      hoursOld,
    });

    console.log(`\n======================================================`);
    console.log(`📊 FINAL SWEEP SUMMARY`);
    console.log(`   ├─ Total Raw Fetched:    ${stats.totalRaw}`);
    console.log(`   ├─ Stale Filtered:       ${stats.staleFiltered}`);
    console.log(`   ├─ Rejected (Loc/Score): ${stats.locationFiltered + stats.scoreFiltered}`);
    console.log(`   ├─ Verified Live Jobs:   ${stats.live} (Dead: ${stats.dead})`);
    console.log(`   └─ Duration:             ${durationSec}s`);
    console.log(`------------------------------------------------------`);
    console.log(`📈 Verified Jobs by Source:`);
    for (const [src, count] of Object.entries(verifiedSourceCounts)) {
      console.log(`   ├─ [${src}]: ${count} verified live roles`);
    }
    if (Object.keys(verifiedSourceCounts).length === 0) {
      console.log(`   └─ None verified`);
    }
    console.log(`------------------------------------------------------`);
    console.log(`🎯 Verified Fresh Opportunities (${verifiedJobs.length}):`);
    verifiedJobs.forEach((job, i) => {
      console.log(`   ${i + 1}. [${job.source}] ${job.title}`);
      console.log(`      Company: ${job.company} | Location: ${job.location || 'India/Remote'}`);
      console.log(`      Apply:   ${job.applyLink}\n`);
    });
    console.log(`======================================================\n`);

    try {
      const { sendTelegramMessage } = await import('@fresherflow/utils');
      let linksSummary = '';
      verifiedJobs.slice(0, 5).forEach((j, i) => {
        linksSummary += `\n${i + 1}. <b>${j.title}</b> @ ${j.company}\n🔗 <a href="${j.applyLink}">Apply Link</a>`;
      });

      const tgMsg =
        `✅ <b>External Search Bot Finished</b>\n\n` +
        `🔍 Raw Fetched: ${stats.totalRaw}\n` +
        `🗑️ Stale/Location/Score Rejected: ${stats.staleFiltered + stats.locationFiltered + stats.scoreFiltered}\n` +
        `✨ <b>Verified Live Jobs: ${stats.live}</b>\n` +
        `⏱️ Duration: ${durationSec}s\n` +
        (linksSummary ? `\n<b>Top Fresh Opportunities:</b>${linksSummary}` : '');

      await sendTelegramMessage(tgMsg);
    } catch {
      // Non-blocking
    }

    await finishRun(runId, {
      total_found: stats.totalRaw,
      accepted: stats.live,
      review_required: 0,
      duplicates: stats.staleFiltered,
      failed: stats.dead,
      duration_ms: Date.now() - startTime,
      status: 'COMPLETED',
      metadata: {
        raw_count: stats.totalRaw,
        live_count: stats.live,
        source_counts: verifiedSourceCounts,
      },
    });
  } catch (err: any) {
    console.error('Fatal Search Sweep Error:', err);
    await finishRun(runId, {
      total_found: rawCandidates.length,
      accepted: 0,
      review_required: 0,
      duplicates: 0,
      failed: 1,
      duration_ms: Date.now() - startTime,
      status: 'FAILED',
      metadata: { error: err.message },
    });
    throw err;
  }
}

runSearchEngine()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal Runner Error:', err);
    process.exit(1);
  });
