import { AtsJob, BOARD_SCRAPER_REGISTRY, ScraperInputDto, toAtsJob } from '@fresherflow/plugins';

export async function collectBoardSearches(keywords: string[], options: {
  resultsPerKeyword?: number;
  hoursOld?: number;
} = {}): Promise<AtsJob[]> {
  console.log(`\n=== Phase 2: Job Board Search Collectors (LinkedIn, Internshala, Naukri, HasJob) ===`);
  const allJobs: AtsJob[] = [];
  const limitPerKeyword = options.resultsPerKeyword ?? 10;

  // Also collect general Indian startup tech roles from HasJob Atom feed once
  try {
    const hasJobRes = await BOARD_SCRAPER_REGISTRY['hasjob']?.scrape(
      new ScraperInputDto({ resultsWanted: 20 })
    );
    if (hasJobRes?.jobs?.length) {
      const hasJobs = hasJobRes.jobs.map((j) => toAtsJob(j, 'HasJob', j.companyName || 'Startup', 'AGGREGATOR'));
      console.log(`  └─ [HasJob] Fetched ${hasJobs.length} fresh Indian startup roles`);
      allJobs.push(...hasJobs);
    }
  } catch (err: any) {
    console.warn(`  └─ [HasJob] Error: ${err.message}`);
  }

  // Process keywords in parallel batches
  const KEYWORD_CONCURRENCY = 3;
  for (let i = 0; i < keywords.length; i += KEYWORD_CONCURRENCY) {
    const batch = keywords.slice(i, i + KEYWORD_CONCURRENCY);

    const batchResults = await Promise.allSettled(
      batch.map(async (keyword) => {
        const keywordJobs: AtsJob[] = [];

        // Run LinkedIn, Internshala, Naukri concurrently for this keyword
        const [linkedinRes, internshalaRes, naukriRes] = await Promise.all([
          // 1. LinkedIn
          BOARD_SCRAPER_REGISTRY['linkedin']
            ?.scrape(
              new ScraperInputDto({
                searchTerm: keyword,
                location: 'India',
                resultsWanted: limitPerKeyword,
                hoursOld: options.hoursOld,
              })
            )
            .catch(() => null),

          // 2. Internshala
          BOARD_SCRAPER_REGISTRY['internshala']
            ?.scrape(
              new ScraperInputDto({
                searchTerm: keyword,
                location: 'India',
                resultsWanted: limitPerKeyword,
              })
            )
            .catch(() => null),

          // 3. Naukri
          BOARD_SCRAPER_REGISTRY['naukri']
            ?.scrape(
              new ScraperInputDto({
                searchTerm: keyword,
                location: 'India',
                resultsWanted: limitPerKeyword,
              })
            )
            .catch(() => null),
        ]);

        if (linkedinRes?.jobs) {
          keywordJobs.push(...linkedinRes.jobs.map((j) => toAtsJob(j, 'LinkedIn', j.companyName || 'LinkedIn', 'AGGREGATOR')));
        }

        if (internshalaRes?.jobs) {
          keywordJobs.push(...internshalaRes.jobs.map((j) => toAtsJob(j, 'Internshala', j.companyName || 'Internshala', 'AGGREGATOR')));
        }

        if (naukriRes?.jobs) {
          keywordJobs.push(...naukriRes.jobs.map((j) => toAtsJob(j, 'Naukri', j.companyName || 'Naukri', 'AGGREGATOR')));
        }

        console.log(`  └─ Board search for "${keyword}": found ${keywordJobs.length} jobs`);
        return keywordJobs;
      })
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        allJobs.push(...r.value);
      }
    }
  }

  console.log(`\n[Boards Summary] Total collected from job boards: ${allJobs.length} raw jobs\n`);
  return allJobs;
}
