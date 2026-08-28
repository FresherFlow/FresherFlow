import { AtsJob, BOARD_SCRAPER_REGISTRY, JobType, ScraperInputDto, toAtsJob } from '@fresherflow/plugins';
import { isSeniorJob } from '@fresherflow/utils';
import { parseJobUrl } from '@fresherflow/parser';

export async function collectBoardSearches(keywords: string[], options: {
  resultsPerKeyword?: number;
  hoursOld?: number;
} = {}): Promise<AtsJob[]> {
  console.log(`\n=== Phase 2: Job Board Search Collectors (Internshala, LinkedIn, HasJob, HackerNews, WeWorkRemotely) ===`);
  const allJobs: AtsJob[] = [];
  const limitPerKeyword = options.resultsPerKeyword ?? 10;

  // ── Broad, non-keyword-scoped board sources ─────────────────────────────
  // Internshala is scraped from its MAIN listing pages (/fresher-jobs and
  // /internships) which carry ~100 discrete postings each — a far higher and
  // fresher yield than per-keyword pages. Results are bounded because each
  // posting's full description is fetched for the downstream fresher/senior
  // verifier, and detail fetches are slow.
  const internshalaPerType = 15;

  const [internshalaJobsRes, internshalaInternshipsRes, hasJobRes, hnRes, wwrRes] = await Promise.all([
    BOARD_SCRAPER_REGISTRY['internshala']
      ?.scrape(
        new ScraperInputDto({
          searchTerm: '', // browse: main /fresher-jobs listing
          jobType: JobType.FULL_TIME,
          resultsWanted: internshalaPerType,
        })
      )
      .catch(() => null),
    BOARD_SCRAPER_REGISTRY['internshala']
      ?.scrape(
        new ScraperInputDto({
          searchTerm: '', // browse: main /internships listing
          jobType: JobType.INTERNSHIP,
          resultsWanted: internshalaPerType,
        })
      )
      .catch(() => null),
    BOARD_SCRAPER_REGISTRY['hasjob']
      ?.scrape(new ScraperInputDto({ resultsWanted: 20 }))
      .catch(() => null),
    BOARD_SCRAPER_REGISTRY['hackernews']
      ?.scrape(new ScraperInputDto({ searchTerm: 'engineer', resultsWanted: 20 }))
      .catch(() => null),
    BOARD_SCRAPER_REGISTRY['weworkremotely']
      ?.scrape(new ScraperInputDto({ searchTerm: 'engineering', resultsWanted: 20 }))
      .catch(() => null),
  ]);

  if (internshalaJobsRes?.jobs?.length) {
    allJobs.push(...internshalaJobsRes.jobs.map((j) => toAtsJob(j, 'Internshala', j.companyName || 'Internshala', 'AGGREGATOR')));
    console.log(`  └─ [Internshala] Fresher jobs: ${internshalaJobsRes.jobs.length}`);
  }
  if (internshalaInternshipsRes?.jobs?.length) {
    allJobs.push(...internshalaInternshipsRes.jobs.map((j) => toAtsJob(j, 'Internshala', j.companyName || 'Internshala', 'AGGREGATOR')));
    console.log(`  └─ [Internshala] Internships: ${internshalaInternshipsRes.jobs.length}`);
  }
  if (hasJobRes?.jobs?.length) {
    allJobs.push(...hasJobRes.jobs.map((j) => toAtsJob(j, 'HasJob', j.companyName || 'Startup', 'AGGREGATOR')));
    console.log(`  └─ [HasJob] Fetched ${hasJobRes.jobs.length} fresh Indian startup roles`);
  }
  if (hnRes?.jobs?.length) {
    allJobs.push(...hnRes.jobs.map((j) => toAtsJob(j, 'HackerNews', j.companyName || 'Startup', 'AGGREGATOR')));
    console.log(`  └─ [HackerNews] Fetched ${hnRes.jobs.length} startup roles`);
  }
  if (wwrRes?.jobs?.length) {
    allJobs.push(...wwrRes.jobs.map((j) => toAtsJob(j, 'WeWorkRemotely', j.companyName || 'Company', 'AGGREGATOR')));
    console.log(`  └─ [WeWorkRemotely] Fetched ${wwrRes.jobs.length} remote roles`);
  }

  // ── Keyword-scoped LinkedIn (resolves outside ATS apply links) ──────────
  const KEYWORD_CONCURRENCY = 3;
  for (let i = 0; i < keywords.length; i += KEYWORD_CONCURRENCY) {
    const batch = keywords.slice(i, i + KEYWORD_CONCURRENCY);

    const batchResults = await Promise.allSettled(
      batch.map(async (keyword) => {
        const keywordJobs: AtsJob[] = [];

        const linkedinRes = await BOARD_SCRAPER_REGISTRY['linkedin']
          ?.scrape(
            new ScraperInputDto({
              searchTerm: keyword,
              location: 'India',
              resultsWanted: limitPerKeyword,
              hoursOld: options.hoursOld,
            })
          )
          .catch(() => null);

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
