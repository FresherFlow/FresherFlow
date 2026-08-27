import { AtsJob, BOARD_SCRAPER_REGISTRY, JobType, ScraperInputDto, toAtsJob } from '@fresherflow/plugins';
import { isSeniorJob } from '@fresherflow/utils';
import { parseJobUrl } from '@fresherflow/parser';

export async function collectBoardSearches(keywords: string[], options: {
  resultsPerKeyword?: number;
  hoursOld?: number;
} = {}): Promise<AtsJob[]> {
  console.log(`\n=== Phase 2: Job Board Search Collectors (LinkedIn, Internshala, HasJob) ===`);
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

        // Run LinkedIn and Internshala (fresher jobs + internships) concurrently for this keyword
        const [linkedinRes, internshalaJobsRes, internshalaInternshipsRes] = await Promise.all([
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

          // 2a. Internshala Fresher Jobs (/fresher-jobs)
          BOARD_SCRAPER_REGISTRY['internshala']
            ?.scrape(
              new ScraperInputDto({
                searchTerm: keyword,
                location: 'India',
                jobType: JobType.FULL_TIME,
                resultsWanted: limitPerKeyword,
              })
            )
            .catch(() => null),

          // 2b. Internshala Internships (/internships)
          BOARD_SCRAPER_REGISTRY['internshala']
            ?.scrape(
              new ScraperInputDto({
                searchTerm: keyword,
                location: 'India',
                jobType: JobType.INTERNSHIP,
                resultsWanted: limitPerKeyword,
              })
            )
            .catch(() => null),
        ]);

        if (linkedinRes?.jobs) {
          for (const j of linkedinRes.jobs) {
            const rawJob = toAtsJob(j, 'LinkedIn', j.companyName || 'LinkedIn', 'AGGREGATOR');
            const title = rawJob.title || '';
            const desc = rawJob.description || '';

            // Step 1: Quick experience & senior rejection check using domain rules
            if (isSeniorJob(`${title} ${desc}`)) continue;

            // Check if there is an outside apply URL in the job description or metadata
            let resolvedApplyLink = rawJob.applyLink;
            if (desc) {
              const urlMatches = desc.match(/https?:\/\/[^\s\)\"\'\<\>]+/g) || [];
              for (const u of urlMatches) {
                const parsed = parseJobUrl(u);
                if (parsed && parsed.adapter) {
                  resolvedApplyLink = u;
                  break;
                }
                try {
                  const urlObj = new URL(u);
                  const host = urlObj.hostname.toLowerCase();
                  if (!host.includes('linkedin.com') && !host.includes('t.me') && !host.includes('whatsapp.com') && !host.includes('google.com')) {
                    if (host.includes('careers') || host.includes('jobs') || u.includes('form')) {
                      resolvedApplyLink = u;
                      break;
                    }
                  }
                } catch {}
              }
            }

            // Only keep LinkedIn jobs that resolved to a real company ATS link.
            // Jobs still pointing to linkedin.com have no real description accessible
            // (behind login wall) and produce low-quality results.
            try {
              const applyHost = new URL(resolvedApplyLink || '').hostname.toLowerCase();
              if (applyHost.includes('linkedin.com')) continue;
            } catch {
              // If the URL can't be parsed at all, skip it too
              continue;
            }

            rawJob.applyLink = resolvedApplyLink;
            keywordJobs.push(rawJob);
          }
        }

        if (internshalaJobsRes?.jobs) {
          keywordJobs.push(...internshalaJobsRes.jobs.map((j) => toAtsJob(j, 'Internshala', j.companyName || 'Internshala', 'AGGREGATOR')));
        }
        if (internshalaInternshipsRes?.jobs) {
          keywordJobs.push(...internshalaInternshipsRes.jobs.map((j) => toAtsJob(j, 'Internshala', j.companyName || 'Internshala', 'AGGREGATOR')));
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
