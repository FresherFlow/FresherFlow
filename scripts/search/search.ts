import { PLUGIN_REGISTRY, SCRAPER_REGISTRY, ScraperInputDto, AtsJob, toAtsJob } from '@fresherflow/plugins';
import pg from 'pg';
const { Pool } = pg;
import { DEFAULT_TARGETS, findTargetByCompany, loadAtsDataTargets, SearchTarget } from './search-config.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isLocationIndiaOrRemote, scoreJobDescription } from '@fresherflow/utils';
import { loadEnv } from '@fresherflow/pipeline';

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
export function filterStaleJobs(jobs: AtsJob[], hoursOld: number = 10): AtsJob[] {
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
export async function saveJobsToDb(jobs: AtsJob[], target: SearchTarget): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️ DATABASE_URL missing. Skipping DB save.');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

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

  try {
    for (const row of rows) {
      await pool.query(
        `INSERT INTO discovered_jobs (
          company, source, source_type, title, location, employment_type, apply_link, external_id, description, posted_at, department, experience_level, experience_years, degree, skills, location_city, location_country, batch_year, is_remote, updated_at, last_seen_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) ON CONFLICT (source, apply_link) DO UPDATE SET
          updated_at = EXCLUDED.updated_at,
          last_seen_at = EXCLUDED.last_seen_at`,
        [
          row.company, row.source, row.source_type, row.title, row.location, row.employment_type, row.apply_link, row.external_id, row.description, row.posted_at, row.department, row.experience_level, row.experience_years, row.degree, row.skills, row.location_city, row.location_country, row.batch_year, row.is_remote, row.updated_at, row.last_seen_at
        ]
      );
    }
    console.log(`✅ Saved ${rows.length} jobs to database for ${target.company}`);
  } catch (error: any) {
    console.error(`❌ DB Upsert Error for ${target.company}:`, error.message);
  } finally {
    await pool.end();
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
  
  // Use SCRAPER_REGISTRY (new IScraper interface) instead of PLUGIN_REGISTRY (old adapter)
  const scraper = SCRAPER_REGISTRY[target.ats.toLowerCase()] || SCRAPER_REGISTRY[adapterKey];
  const adapter = PLUGIN_REGISTRY[target.ats.toLowerCase()] || PLUGIN_REGISTRY[adapterKey];
  
  if (!scraper && !adapter) {
    console.error(`❌ No scraper found for ATS: '${target.ats}' (${target.company})`);
    return { jobs: [], staleCount: 0, totalFound: 0 };
  }

  const resultsWanted = options.resultsWanted ?? target.resultsWanted ?? 50;
  const envHours = process.env.HOURS_OLD ? parseInt(process.env.HOURS_OLD, 10) : undefined;
  const hoursOld = options.hoursOld ?? (!isNaN(envHours!) ? envHours : (target.hoursOld ?? 72));

  console.log(`\n🔍 Searching ${target.company.toUpperCase()} (${target.ats}) [slug=${target.slug}, max=${resultsWanted}, hoursOld=${hoursOld}]...`);

  try {
    let rawJobs: AtsJob[] = [];
    if (scraper) {
      const input = new ScraperInputDto({
        companySlug: target.slug,
        searchTerm: target.searchTerm,
        resultsWanted,
        descriptionFormat: 'PLAIN' as any,
      });
      const resp = await scraper.scrape(input);
      const jobs = resp?.jobs ?? [];
      rawJobs = jobs.map(j => toAtsJob(j, target.ats, target.company, 'ATS'));
    } else if (adapter) {
      rawJobs = await adapter.fetchJobs(target.slug, target.company);
    }
    console.log(`   └─ Found ${rawJobs.length} total jobs.`);

    // 1. Filter stale postings first
    const freshJobs = filterStaleJobs(rawJobs, hoursOld);
    const staleCount = rawJobs.length - freshJobs.length;
    if (staleCount > 0) {
      console.log(`   └─ Filtered out ${staleCount} jobs older than ${hoursOld}h.`);
    }

    // 2. Cap at resultsWanted
    const capped = freshJobs.slice(0, resultsWanted);

    // Filter for Indian / Remote and Potential Fresher roles across all job categories
    const relevantJobs: AtsJob[] = [];
    let intelligenceRejects = 0;
    
    for (const job of capped) {
      // Fast fail if parsedLocation indicates non-India foreign country
      if (job.parsedLocation?.country && !job.parsedLocation.country.toLowerCase().includes('india') && job.parsedLocation.country.toLowerCase() !== 'in') {
         // It's explicitly foreign, but we still allow if it's explicitly Remote
         if (!job.isRemote && !job.workFromHomeType && !/remote|wfh|anywhere/i.test(job.location || '')) {
             if (options.dryRun) console.log(`       [Reject: Location (Parsed Foreign)] ${job.title} [Country: ${job.parsedLocation.country}]`);
             continue;
         }
      }

      if (!isLocationIndiaOrRemote(job.location || '', job.title)) {
        if (options.dryRun) console.log(`       [Reject: Location (String Match)] ${job.title} [Loc: ${job.location || 'No Loc'}]`);
        continue;
      }
      
      // 1. Initial Intelligence check on Title (Fast Path)
      let score = scoreJobDescription(job.title || '', job.description || '');
      if (score.verdict === 'REJECT') {
        if (options.dryRun) console.log(`       [Reject: Intelligence (Title)] ${job.title} [Rule: ${score.metadata.blockingRule || 'Low Score'}]`);
        intelligenceRejects++;
        continue;
      }

      // 2. Deep Intelligence check on Full Description (Slow Path)
      // This brings the job-discovery bot's "verifier" intelligence to the search bot.
      if (typeof adapter.fetchJobDetails === 'function' && !job.description) {
        try {
          // Note: native ATS API adapters do not need a browser 'page'.
          // Adapters that require a browser will safely catch the undefined page and return undefined.
          const details = await adapter.fetchJobDetails(job, undefined);
          if (details) {
            const fullText = typeof details === 'string' ? details : details.text;
            job.description = fullText;
            
            // Re-score with the full description text to catch "5+ years experience" etc.
            score = scoreJobDescription(job.title || '', fullText);
            if (score.verdict === 'REJECT') {
              if (options.dryRun) console.log(`       [Reject: Intelligence (Deep)] ${job.title} [Rule: ${score.metadata.blockingRule || 'Low Score'}]`);
              intelligenceRejects++;
              continue;
            }
          }
        } catch (e: any) {
           // Silently fallback if deep fetch fails without Playwright
        }
      }

      relevantJobs.push(job);
    }

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

  // Write to GitHub Actions Step Summary if available
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `
### 🔍 Search Engine: ${target.company}
- **ATS Platform**: \`${target.ats}\`
- **Total Jobs Found**: ${result.totalFound}
- **Relevant Fresher Jobs**: ${result.jobs.length}
- **Stale / Filtered Out**: ${result.staleCount}

${result.jobs.length > 0 ? `#### Top Relevant Jobs\n${result.jobs.slice(0, 5).map(j => `- **${j.title}** _(${j.location || 'No Loc'})_`).join('\n')}` : ''}
`;
    try {
      await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    } catch (err: any) {
      console.error('Failed to write GITHUB_STEP_SUMMARY:', err.message);
    }
  }
}

