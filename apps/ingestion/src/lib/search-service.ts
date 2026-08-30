/**
 * SearchService — concurrent fan-out search across all registered scrapers.
 *
 * Mirrors ever-jobs JobsService.searchJobs():
 * - Accepts ScraperInputDto with searchTerm, location, hoursOld, companySlug, siteType
 * - Routes: ATS scrapers need companySlug, boards search by keyword
 * - Runs all selected scrapers concurrently via Promise.allSettled
 * - Aggregates results, sorts by date
 */
import {
  type IScraper,
  ScraperInputDto,
  JobPostDto,
  SCRAPER_REGISTRY,
  ATS_SCRAPER_REGISTRY,
  BOARD_SCRAPER_REGISTRY,
} from '@fresherflow/plugins';

// ─── Search Interface ───────────────────────────────────────────────────────

export interface SearchInput {
  searchTerm?: string;
  location?: string;
  hoursOld?: number;
  companySlug?: string;
  siteType?: string[];    // e.g. ['greenhouse', 'workday']
  resultsWanted?: number;
  country?: string;
  retries?: number;
  retryDelay?: number;
}

export interface SearchResult {
  jobs: JobPostDto[];
  rawCount: number;
  siteBreakdown: Record<string, number>;
  errors: Array<{ site: string; error: string }>;
  durationMs: number;
}

// ─── SearchService ──────────────────────────────────────────────────────────

const SEARCH_TIMEOUT_MS = 30_000;

/**
 * Run a single scraper with timeout.
 */
async function runScraperWithTimeout(
  site: string,
  scraper: IScraper,
  input: ScraperInputDto,
): Promise<{ site: string; jobs: JobPostDto[]; error?: string }> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`TIMEOUT after ${SEARCH_TIMEOUT_MS}ms`)), SEARCH_TIMEOUT_MS);
    });

    const result = await Promise.race([
      scraper.scrape(input),
      timeoutPromise,
    ]) as any;

    return { site, jobs: result?.jobs ?? [] };
  } catch (err: any) {
    return { site, jobs: [], error: err?.message ?? String(err) };
  }
}

/**
 * Search jobs across all matching scrapers concurrently.
 *
 * Routing rules (same as ever-jobs JobsService.searchJobs):
 * - If `siteType` is provided → only those scrapers run
 * - If `companySlug` is provided → only ATS scrapers run (they need a slug)
 * - Otherwise → board scrapers run (keyword search across boards)
 */
export async function searchJobs(input: SearchInput): Promise<SearchResult> {
  const startTime = Date.now();

  const explicitSites = input.siteType;
  let sitesToRun: string[];

  if (explicitSites?.length) {
    // Explicit site selection — run exactly what was requested
    sitesToRun = explicitSites.filter(s => SCRAPER_REGISTRY[s]);
  } else if (input.companySlug) {
    // companySlug provided but no explicit sites → ATS scrapers only
    sitesToRun = Object.keys(ATS_SCRAPER_REGISTRY);
  } else {
    // Default: keyword search across boards only (ATS scrapers need a slug)
    sitesToRun = Object.keys(BOARD_SCRAPER_REGISTRY);
  }

  if (sitesToRun.length === 0) {
    return {
      jobs: [],
      rawCount: 0,
      siteBreakdown: {},
      errors: [],
      durationMs: Date.now() - startTime,
    };
  }

  console.log(
    `[SearchService] Running ${sitesToRun.length} scrapers: ${sitesToRun.join(', ')}`,
  );

  // Build ScraperInputDto (same pattern as ever-jobs)
  const scraperInput = new ScraperInputDto({
    searchTerm: input.searchTerm,
    location: input.location,
    hoursOld: input.hoursOld,
    companySlug: input.companySlug,
    resultsWanted: input.resultsWanted ?? 50,
    country: input.country as any,
    retries: input.retries,
    retryDelay: input.retryDelay,
  });

  // Run all scrapers concurrently (like ever-jobs Promise.allSettled)
  const settled = await Promise.allSettled(
    sitesToRun.map(site => {
      const scraper = SCRAPER_REGISTRY[site];
      return runScraperWithTimeout(site, scraper, scraperInput);
    }),
  );

  // Aggregate results
  const allJobs: JobPostDto[] = [];
  const siteBreakdown: Record<string, number> = {};
  const errors: Array<{ site: string; error: string }> = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      const { site, jobs, error } = result.value;
      allJobs.push(...jobs);
      siteBreakdown[site] = jobs.length;
      if (error) {
        errors.push({ site, error });
      }
    } else {
      // Promise rejected (shouldn't happen with our wrapper, but just in case)
      errors.push({ site: 'unknown', error: String(result.reason) });
    }
  }

  // Sort by date (most recent first)
  allJobs.sort((a, b) => {
    const dateA = a.datePosted ? new Date(a.datePosted).getTime() : 0;
    const dateB = b.datePosted ? new Date(b.datePosted).getTime() : 0;
    return dateB - dateA;
  });

  const durationMs = Date.now() - startTime;
  console.log(
    `[SearchService] Found ${allJobs.length} jobs in ${durationMs}ms (sites: ${Object.entries(siteBreakdown).map(([k, v]) => `${k}:${v}`).join(', ')})`,
  );

  return {
    jobs: allJobs,
    rawCount: allJobs.length,
    siteBreakdown,
    errors,
    durationMs,
  };
}

/**
 * List all available scrapers.
 */
export function listScrapers() {
  return {
    ats: Object.keys(ATS_SCRAPER_REGISTRY),
    boards: Object.keys(BOARD_SCRAPER_REGISTRY),
    total: Object.keys(SCRAPER_REGISTRY).length,
  };
}
