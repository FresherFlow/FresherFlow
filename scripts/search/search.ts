import { PLUGIN_REGISTRY, AtsJob } from '@fresherflow/plugins';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_TARGETS, findTargetByCompany, loadAtsDataTargets, SearchTarget } from './search-config.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isLocationIndiaOrRemote, isPotentialFresherJob } from '../job-discovery/src/filters/ats-filters.js';
import { isFresherJob } from '../job-discovery/src/filters/text-filters.js';

// Load environment variables from root .env if not loaded
async function loadEnv() {
  const envPath = path.resolve(process.cwd(), '../../.env');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (process.env[key] === undefined) process.env[key] = val;
      }
    }
  } catch {
    // ignore
  }
}

export interface SearchOptions {
  company?: string;
  ats?: string;
  slug?: string;
  resultsWanted?: number;
  hoursOld?: number;
  dryRun?: boolean;
}

/**
 * Parses CLI arguments into SearchOptions
 */
function parseArgs(args: string[]): SearchOptions {
  const options: SearchOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--company' && args[i + 1]) options.company = args[++i];
    else if (arg === '--ats' && args[i + 1]) options.ats = args[++i];
    else if (arg === '--slug' && args[i + 1]) options.slug = args[++i];
    else if (arg === '--resultsWanted' && args[i + 1]) options.resultsWanted = parseInt(args[++i], 10);
    else if (arg === '--hoursOld' && args[i + 1]) options.hoursOld = parseInt(args[++i], 10);
    else if (arg === '--dry-run') options.dryRun = true;
  }
  return options;
}

/**
 * Filter jobs older than hoursOld (if date is present)
 */
export function filterStaleJobs(jobs: AtsJob[], hoursOld: number = 336): AtsJob[] {
  const cutoff = Date.now() - hoursOld * 60 * 60 * 1000;
  return jobs.filter(job => {
    if (!job.postedAt) return true; // keep if date is unknown
    const timestamp = new Date(job.postedAt).getTime();
    if (isNaN(timestamp)) return true;
    return timestamp >= cutoff;
  });
}

/**
 * Upsert scraped jobs into Supabase discovered_jobs table
 */
async function saveJobsToDb(jobs: AtsJob[], target: SearchTarget): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('⚠️ SUPABASE_URL or SUPABASE_KEY missing. Skipping DB save.');
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const rows = jobs.map(job => ({
    company: target.company,
    source: target.ats,
    source_type: 'ATS',
    title: job.title || 'Unknown Title',
    location: job.location || null,
    employment_type: job.employmentType || null,
    apply_link: job.applyLink,
    external_id: job.id || null,
    description: job.description || null,
    posted_at: job.postedAt || null,
    department: job.department || null,
    experience_level: job.experienceLevel || null,
    experience_years: job.experienceYears ?? null,
    degree: job.degree || null,
    skills: job.skills ? JSON.stringify(job.skills) : null,
    location_city: job.parsedLocation?.city || null,
    location_country: job.parsedLocation?.country || null,
    batch_year: job.title?.match(/(?:202[0-9])/)?.[0] || null,
    is_remote: job.isRemote ?? null,
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('discovered_jobs')
    .upsert(rows, { onConflict: 'source, apply_link' });

  if (error) {
    console.error(`❌ DB Upsert Error for ${target.company}:`, error.message);
  } else {
    console.log(`✅ Saved ${rows.length} jobs to database for ${target.company}`);
  }
}

export interface SearchResult {
  jobs: AtsJob[];
  staleCount: number;
  totalFound: number;
}

/**
 * Main search execution for a single target
 */
export async function executeSearch(target: SearchTarget, options: SearchOptions = {}): Promise<SearchResult> {
  const adapterKey = target.ats.toLowerCase().replace('company-', '');
  const adapter = PLUGIN_REGISTRY[target.ats.toLowerCase()] || PLUGIN_REGISTRY[adapterKey];
  
  if (!adapter) {
    console.error(`❌ No plugin adapter found for ATS: '${target.ats}' (${target.company})`);
    return { jobs: [], staleCount: 0, totalFound: 0 };
  }

  const resultsWanted = options.resultsWanted ?? target.resultsWanted ?? 50;
  const hoursOld = options.hoursOld ?? target.hoursOld ?? 336;

  console.log(`\n🔍 Searching ${target.company.toUpperCase()} (${target.ats}) [slug=${target.slug}, max=${resultsWanted}, hoursOld=${hoursOld}]...`);

  try {
    const rawJobs = await adapter.fetchJobs(target.slug, target.company);
    console.log(`   └─ Found ${rawJobs.length} total jobs from adapter.`);

    // 1. Filter stale postings first
    const freshJobs = filterStaleJobs(rawJobs, hoursOld);
    const staleCount = rawJobs.length - freshJobs.length;
    if (staleCount > 0) {
      console.log(`   └─ Filtered out ${staleCount} jobs older than ${hoursOld}h.`);
    }

    // 2. Cap at resultsWanted
    const capped = freshJobs.slice(0, resultsWanted);

    // Filter for Indian / Remote and Potential Fresher roles across all job categories
    const relevantJobs = capped.filter(job => {
      if (!isLocationIndiaOrRemote(job.location || '', job.title)) {
        if (options.dryRun) console.log(`       [Reject: Location] ${job.title} [Loc: ${job.location || 'No Loc'}]`);
        return false;
      }
      if (!isPotentialFresherJob(job.title || '')) {
        if (options.dryRun) console.log(`       [Reject: Senior Title] ${job.title} [Loc: ${job.location || 'No Loc'}]`);
        return false;
      }
      if (job.description && !isFresherJob(job.description)) {
        if (options.dryRun) console.log(`       [Reject: Exp Requirement] ${job.title} [Loc: ${job.location || 'No Loc'}]`);
        return false;
      }
      return true;
    });

    const filteredOutCount = capped.length - relevantJobs.length;
    if (filteredOutCount > 0) {
      console.log(`   └─ Filtered out ${filteredOutCount} non-India / non-tech / senior jobs.`);
    }

    console.log(`   └─ Returning ${relevantJobs.length} relevant fresh jobs:`);
    for (const job of relevantJobs.slice(0, 10)) {
      console.log(`       • [${job.location || 'No Loc'}] ${job.title} (${job.postedAt ? new Date(job.postedAt).toISOString().split('T')[0] : 'No Date'})`);
    }
    if (relevantJobs.length > 10) {
      console.log(`       • ... and ${relevantJobs.length - 10} more jobs`);
    }

    if (!options.dryRun && relevantJobs.length > 0) {
      await saveJobsToDb(relevantJobs, target);
    }

    return { jobs: relevantJobs, staleCount: staleCount + filteredOutCount, totalFound: rawJobs.length };
  } catch (err: any) {
    console.error(`❌ Error scraping ${target.company}: ${err.message}`);
    throw err;
  }
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('search.ts')) {
  await loadEnv();
  const args = parseArgs(process.argv.slice(2));

  if (!args.company && (!args.ats || !args.slug)) {
    console.log(`
Usage:
  pnpm search --company <company-name> [--resultsWanted <n>] [--hoursOld <n>] [--dry-run]
  pnpm search --ats <ats-name> --slug <slug> --company <name> [--dry-run]

Example:
  pnpm search --company zomato --dry-run
  pnpm search --ats darwinbox --slug zomato --company zomato
`);
    process.exit(1);
  }

  let target: SearchTarget | undefined;
  if (args.company && !args.ats) {
    const allTargets = await loadAtsDataTargets();
    target = findTargetByCompany(args.company, allTargets);
    if (!target) {
      console.error(`❌ Company '${args.company}' not found in default config or docs/data/ats/*.json.`);
      process.exit(1);
    }
  } else {
    target = {
      company: args.company || args.slug || 'unknown',
      ats: args.ats!,
      slug: args.slug!
    };
  }

  const result = await executeSearch(target, args);
  if (args.dryRun && result.jobs.length > 0) {
    console.log('\n--- Sample Job (Dry Run) ---');
    console.log(JSON.stringify(result.jobs[0], null, 2));
  }
}
