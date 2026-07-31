import { DEFAULT_TARGETS, loadAtsDataTargets, SearchTarget } from './search-config.js';
import { executeSearch, SearchOptions } from './search.js';

function parseRunnerArgs(args: string[]): SearchOptions & { all?: boolean; indiaOnly?: boolean; delay?: number; only?: string } {
  const options: SearchOptions & { all?: boolean; indiaOnly?: boolean; delay?: number; only?: string } = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all') options.all = true;
    else if (arg === '--india-only') options.indiaOnly = true;
    else if (arg === '--delay' && args[i + 1]) options.delay = parseInt(args[++i], 10);
    else if (arg === '--resultsWanted' && args[i + 1]) options.resultsWanted = parseInt(args[++i], 10);
    else if (arg === '--hoursOld' && args[i + 1]) options.hoursOld = parseInt(args[++i], 10);
    else if (arg === '--only' && args[i + 1]) options.only = args[++i].toLowerCase();
    else if (arg === '--dry-run') options.dryRun = true;
  }
  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSweep() {
  const args = parseRunnerArgs(process.argv.slice(2));
  const delay = args.delay ?? 3000;

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

  let totalFound = 0;
  let totalStale = 0;
  let totalRaw = 0;
  let successfulCompanies = 0;
  let failedCompanies = 0;

  const CONCURRENCY_LIMIT = args.delay ? 1 : 5; // Default to 5 if no delay specified
  const TIMEOUT_MS = 60000; // 1 minute per target

  const executeWithTimeout = async (target: SearchTarget) => {
    return Promise.race([
      executeSearch(target, args),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout exceeded')), TIMEOUT_MS))
    ]);
  };

  const allDiscoveredJobs: any[] = [];
  
  // Process in chunks (poor man's p-limit)
  for (let i = 0; i < targets.length; i += CONCURRENCY_LIMIT) {
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

  // Write all aggregated jobs to JSON
  const fs = await import('fs/promises');
  await fs.writeFile('discovered_jobs.json', JSON.stringify(allDiscoveredJobs, null, 2));

  console.log(`\n======================================================`);
  console.log(`📊 SWEEP SUMMARY`);
  console.log(`   ├─ Total Companies Processed: ${targets.length}`);
  console.log(`   ├─ Successful:                ${successfulCompanies}`);
  console.log(`   ├─ Failed:                    ${failedCompanies}`);
  console.log(`   ├─ Total Raw Jobs Fetched:    ${totalRaw}`);
  console.log(`   ├─ Total Stale Jobs Filtered: ${totalStale}`);
  console.log(`   └─ Total Fresh Jobs Saved:    ${totalFound} (saved to discovered_jobs.json)`);
  console.log(`======================================================\n`);
}

runSweep().catch(err => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
