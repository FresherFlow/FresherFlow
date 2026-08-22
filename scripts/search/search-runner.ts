import { DEFAULT_TARGETS, loadAtsDataTargets, SearchTarget } from './search-config.js';
import { executeSearch, SearchOptions, loadEnv, saveJobsToDb } from './search.js';
import { executeDorkSearch } from './dorker.js';
import { startRun, finishRun } from '@fresherflow/pipeline';
import { isLocationIndiaOrRemote, scoreJobDescription } from '@fresherflow/domain';

function parseRunnerArgs(args: string[]): SearchOptions & { all?: boolean; indiaOnly?: boolean; delay?: number; only?: string; dork?: boolean; roles?: boolean } {
  const options: SearchOptions & { all?: boolean; indiaOnly?: boolean; delay?: number; only?: string; dork?: boolean; roles?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all') options.all = true;
    else if (arg === '--india-only') options.indiaOnly = true;
    else if (arg === '--delay' && args[i + 1]) options.delay = parseInt(args[++i], 10);
    else if (arg === '--resultsWanted' && args[i + 1]) options.resultsWanted = parseInt(args[++i], 10);
    else if (arg === '--hoursOld' && args[i + 1]) options.hoursOld = parseInt(args[++i], 10);
    else if (arg === '--only' && args[i + 1]) options.only = args[++i].toLowerCase();
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--dork') options.dork = true;
    else if (arg === '--roles') options.roles = true;
  }
  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSweep() {
  await loadEnv();
  const startTime = Date.now();
  const runId = await startRun();
  
  const args = parseRunnerArgs(process.argv.slice(2));
  const delay = args.delay ?? 500; // 500ms between chunks — rate limiting handled by ScraperInputDto

  let targets: SearchTarget[] = await loadAtsDataTargets();
  if (args.all === false) {
    targets = DEFAULT_TARGETS.filter(t => t.active !== false);
  }

  if (args.only) {
    if (args.only === 'company') {
      targets = targets.filter(t => t.ats.startsWith('company'));
    } else if (args.only === 'board') {
      targets = targets.filter(t => t.ats.startsWith('board'));
    } else if (args.only === 'ats') {
      targets = targets.filter(t => !t.ats.startsWith('company') && !t.ats.startsWith('board'));
    } else {
      targets = targets.filter(t => t.ats.toLowerCase() === args.only || t.company.toLowerCase() === args.only || t.ats.toLowerCase().includes(args.only!));
    }
  }

  console.log(`\n======================================================`);
  console.log(`🚀 STARTING SEARCH-FIRST JOB SCRAPER SWEEP`);
  console.log(`   └─ Target Count: ${targets.length} companies`);
  console.log(`   └─ Inter-request Delay: ${delay}ms`);
  console.log(`   └─ Dry Run: ${args.dryRun ? 'YES' : 'NO'}`);
  console.log(`======================================================`);

  try {
    const { sendTelegramMessage } = await import('@fresherflow/utils');
    await sendTelegramMessage(`🚀 <b>Search Bot Started</b>\n\nTarget Count: ${targets.length} companies\nMode: ${args.dork ? 'Dork + Scrape' : 'Scrape'}`);
  } catch (err) {
    console.error("Failed to send TG start message", err);
  }

  let totalFound = 0;
  let totalStale = 0;
  let totalRaw = 0;
  let successfulCompanies = 0;
  let failedCompanies = 0;

  const CONCURRENCY_LIMIT = 10; // 10 concurrent — rate limiting handled by ScraperInputDto
  const TIMEOUT_MS = 60000; // 1 minute per target

  const executeWithTimeout = async (target: SearchTarget) => {
    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout of ${TIMEOUT_MS}ms exceeded for ${target.company}`)), TIMEOUT_MS);
    });
    try {
      const res = await Promise.race([executeSearch(target, args), timeoutPromise]);
      return res;
    } finally {
      clearTimeout(timer!);
    }
  };

  const allDiscoveredJobs: any[] = [];
  
  try {
    const SWEEP_TIMEOUT_MS = 55 * 60 * 1000; // 55 minutes

    // Process in chunks (poor man's p-limit)
    for (let i = 0; i < targets.length; i += CONCURRENCY_LIMIT) {
      if (Date.now() - startTime > SWEEP_TIMEOUT_MS) {
        console.log(`\n[Timeout] ⏱️ Exceeded 55 minutes, halting sweep to save results.`);
        break;
      }

      const chunk = targets.slice(i, i + CONCURRENCY_LIMIT);
      
      const results = await Promise.allSettled(chunk.map(async (target) => {
        console.log(`\n[Queueing] Processing ${target.company}...`);
        return { target, result: await executeWithTimeout(target) };
      }));

      for (const res of results) {
        if (res.status === 'fulfilled') {
          const { result } = res.value;
          successfulCompanies++;
          totalFound += result.jobs.length;
          totalStale += result.staleCount;
          totalRaw += result.totalFound;
          
          // Add source info if missing
          result.jobs.forEach(j => {
            if (!j.source) j.source = res.value.target.ats;
            if (!j.company) j.company = res.value.target.company;
          });
          allDiscoveredJobs.push(...result.jobs);
        } else {
          failedCompanies++;
          console.error(`❌ Sweep Failed: ${res.reason?.message || res.reason}`);
        }
      }

      if (i + CONCURRENCY_LIMIT < targets.length && delay > 0) {
        const jitter = Math.floor(delay * 0.2 * (Math.random() * 2 - 1));
        await sleep(delay + jitter);
      }
    }

    if (args.dork) {
      try {
        const dorkResult = await executeDorkSearch(args);
        const validDorkJobs = dorkResult.jobs.filter(job => {
          if (!isLocationIndiaOrRemote(job.location || '', job.title)) return false;
          const score = scoreJobDescription(job.title || '', job.description || '');
          return score.verdict !== 'REJECT';
        });
        totalRaw += dorkResult.totalFound;
        totalFound += validDorkJobs.length;
        allDiscoveredJobs.push(...validDorkJobs);
        if (validDorkJobs.length > 0 && !args.dryRun) {
          await saveJobsToDb(validDorkJobs, { company: 'Dorker', ats: 'Dorker', slug: 'dorker' } as any);
        }
      } catch (err: any) {
        console.error(`❌ Dorker Search Failed: ${err.message}`);
      }
    }

    // Role-based search: fetch roles from CDN, search each as a searchTerm
    if (args.roles) {
      try {
        console.log(`\n=== Phase 3: Role-Based Search ===`);
        const rolesUrl = `${process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL}/api/meta/roles.json`;
        const roles: string[] = await (await fetch(rolesUrl)).json();
        console.log(`   Loaded ${roles.length} roles from CDN`);

        // For each role, search across all companies — reuse executeSearch
        const ROLE_CONCURRENCY = 5;
        let roleJobsFound = 0;
        for (let i = 0; i < roles.length; i += ROLE_CONCURRENCY) {
          if (Date.now() - startTime > SWEEP_TIMEOUT_MS) break;
          const batch = roles.slice(i, i + ROLE_CONCURRENCY);

          // Each role searches across top companies in parallel
          const roleResults = await Promise.allSettled(batch.map(async (role) => {
            const jobs: any[] = [];
            for (const target of targets.slice(0, 50)) {
              const roleTarget: SearchTarget = { ...target, searchTerm: role, resultsWanted: 5 };
              const res = await executeSearch(roleTarget, args);
              jobs.push(...res.jobs);
            }
            return jobs;
          }));

          for (const r of roleResults) {
            if (r.status === 'fulfilled') {
              roleJobsFound += r.value.length;
              allDiscoveredJobs.push(...r.value);
            }
          }
          console.log(`   Roles ${Math.min(i + ROLE_CONCURRENCY, roles.length)}/${roles.length}: ${roleJobsFound} jobs`);
        }
        console.log(`   ✅ Role search: ${roleJobsFound} jobs`);
      } catch (err: any) {
        console.error(`❌ Role Search Failed: ${err.message}`);
      }
    }

    // Verify job URLs are still live before saving
    console.log(`\n🔍 Verifying ${allDiscoveredJobs.length} job URLs...`);
    const VERIFICATION_CONCURRENCY = 10;
    let verified = 0, dead = 0;
    const verifiedJobs: typeof allDiscoveredJobs = [];
    
    for (let i = 0; i < allDiscoveredJobs.length; i += VERIFICATION_CONCURRENCY) {
      const batch = allDiscoveredJobs.slice(i, i + VERIFICATION_CONCURRENCY);
      const checks = await Promise.allSettled(batch.map(async (job) => {
        try {
          const resp = await fetch(job.applyLink, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(10000),
          });
          if (resp.ok || resp.status === 403) {
            // 403 = Cloudflare block but page exists
            verified++;
            verifiedJobs.push(job);
          } else {
            dead++;
          }
        } catch {
          dead++;
        }
      }));
    }
    console.log(`   ✅ ${verified} live, ❌ ${dead} dead`);

    // Write verified jobs to JSON
    const fs = await import('fs/promises');
    await fs.writeFile('discovered_jobs.json', JSON.stringify(verifiedJobs, null, 2));

    console.log(`\n======================================================`);
    console.log(`📊 SWEEP SUMMARY`);
    console.log(`   ├─ Total Companies Processed: ${targets.length}`);
    console.log(`   ├─ Successful:                ${successfulCompanies}`);
    console.log(`   ├─ Failed:                    ${failedCompanies}`);
    console.log(`   ├─ Total Raw Jobs Fetched:    ${totalRaw}`);
    console.log(`   ├─ Total Stale Jobs Filtered: ${totalStale}`);
    console.log(`   └─ Total Verified Jobs:       ${verified} live, ${dead} dead (saved to discovered_jobs.json)`);
    console.log(`======================================================\n`);

    try {
      const { sendTelegramMessage } = await import('@fresherflow/utils');
      const tgMessage = `✅ <b>Search Bot Sweep Finished</b>\n\n` +
        `🏢 Processed: ${successfulCompanies}/${targets.length} companies\n` +
        `🔍 Raw Fetched: ${totalRaw}\n` +
        `🗑️ Stale/Duplicate: ${totalStale}\n` +
        `✨ Fresh Jobs: <b>${totalFound}</b>\n\n` +
        `⏱️ Duration: ${Math.round((Date.now() - startTime) / 1000)}s\n` +
        (failedCompanies > 0 ? `❌ Failed: ${failedCompanies}` : `✅ All targets succeeded.`);
      await sendTelegramMessage(tgMessage);
    } catch (err) {
      console.error("Failed to send TG completion message", err);
    }

    await finishRun(runId, {
      total_found: totalRaw,
      accepted: totalFound,
      review_required: 0,
      duplicates: totalStale,
      failed: failedCompanies,
      duration_ms: Date.now() - startTime,
      status: 'COMPLETED',
      metadata: {
        total_companies: targets.length,
        successful_companies: successfulCompanies
      }
    });
  } catch (err) {
    console.error('Fatal Runner Error inside runSweep:', err);
    await finishRun(runId, {
      total_found: totalRaw,
      accepted: totalFound,
      review_required: 0,
      duplicates: totalStale,
      failed: failedCompanies,
      duration_ms: Date.now() - startTime,
      status: 'FAILED',
      metadata: {
        error: err instanceof Error ? err.message : String(err),
        total_companies: targets.length,
        successful_companies: successfulCompanies
      }
    });
    throw err;
  }
}

runSweep()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal Runner Error:', err);
    process.exit(1);
  });

