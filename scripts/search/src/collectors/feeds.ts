import { AtsJob } from '@fresherflow/plugins';
import { BOARD_SCRAPER_REGISTRY, ScraperInputDto } from '@fresherflow/plugins';

/**
 * High-speed Zero-Auth public feeds: RemoteOK, WeWorkRemotely, HackerNews, Remotive, Himalayas, Jobicy
 */
export async function collectPublicFeeds(options: {
  searchTerm?: string;
  resultsWanted?: number;
  hoursOld?: number;
} = {}): Promise<AtsJob[]> {
  console.log(`\n=== Phase 1: Public High-Speed Job Feeds ===`);
  const allJobs: AtsJob[] = [];
  const limit = options.resultsWanted ?? 30;

  const tasks: { name: string; run: () => Promise<AtsJob[]> }[] = [
    // 1. RemoteOK
    {
      name: 'RemoteOK',
      run: async () => {
        try {
          const res = await BOARD_SCRAPER_REGISTRY['remoteok']?.scrape(
            new ScraperInputDto({
              searchTerm: options.searchTerm,
              resultsWanted: limit,
              hoursOld: options.hoursOld,
            })
          );
          return (res?.jobs || []).map((j) => ({
            title: j.title || 'Untitled',
            company: j.companyName || 'Unknown',
            location: j.location?.displayLocation() || 'Remote',
            applyLink: j.jobUrl || j.applyUrl || '',
            description: j.description || '',
            descriptionSource: 'API' as const,
            postedAt: j.datePosted ? String(j.datePosted) : new Date().toISOString(),
            source: 'RemoteOK',
            sourceType: 'AGGREGATOR' as const,
            isRemote: true,
          }));
        } catch (err: any) {
          console.warn(`[Feeds] RemoteOK error: ${err.message}`);
          return [];
        }
      },
    },

    // 2. WeWorkRemotely RSS
    {
      name: 'WeWorkRemotely',
      run: async () => {
        try {
          const res = await BOARD_SCRAPER_REGISTRY['weworkremotely']?.scrape(
            new ScraperInputDto({
              searchTerm: options.searchTerm,
              resultsWanted: limit,
              hoursOld: options.hoursOld,
            })
          );
          return (res?.jobs || []).map((j) => ({
            title: j.title || 'Untitled',
            company: j.companyName || 'Unknown',
            location: j.location?.displayLocation() || 'Remote',
            applyLink: j.jobUrl || j.applyUrl || '',
            description: j.description || '',
            descriptionSource: 'API' as const,
            postedAt: j.datePosted ? String(j.datePosted) : new Date().toISOString(),
            source: 'WeWorkRemotely',
            sourceType: 'AGGREGATOR' as const,
            isRemote: true,
          }));
        } catch (err: any) {
          console.warn(`[Feeds] WeWorkRemotely error: ${err.message}`);
          return [];
        }
      },
    },

    // 3. HackerNews Who is Hiring
    {
      name: 'HackerNews',
      run: async () => {
        try {
          const res = await BOARD_SCRAPER_REGISTRY['hackernews']?.scrape(
            new ScraperInputDto({
              searchTerm: options.searchTerm,
              resultsWanted: limit,
              hoursOld: options.hoursOld,
            })
          );
          return (res?.jobs || []).map((j) => ({
            title: j.title || 'Untitled',
            company: j.companyName || 'Unknown',
            location: j.location?.displayLocation() || 'Remote',
            applyLink: j.jobUrl || j.applyUrl || '',
            description: j.description || '',
            descriptionSource: 'API' as const,
            postedAt: j.datePosted ? String(j.datePosted) : new Date().toISOString(),
            source: 'HackerNews',
            sourceType: 'AGGREGATOR' as const,
            isRemote: true,
          }));
        } catch (err: any) {
          console.warn(`[Feeds] HackerNews error: ${err.message}`);
          return [];
        }
      },
    },

    // 4. Remotive API
    {
      name: 'Remotive',
      run: async () => {
        try {
          const url = 'https://remotive.com/api/remote-jobs?category=software-dev';
          const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
          if (!resp.ok) return [];
          const data = await resp.json();
          const rawJobs = Array.isArray(data?.jobs) ? data.jobs : [];
          return rawJobs.slice(0, limit).map((j: any) => ({
            title: j.title || '',
            company: j.company_name || 'Unknown',
            location: j.candidate_required_location || 'Remote',
            applyLink: j.url || '',
            description: j.description || '',
            descriptionSource: 'API' as const,
            postedAt: j.publication_date || new Date().toISOString(),
            source: 'Remotive',
            sourceType: 'AGGREGATOR' as const,
            isRemote: true,
          }));
        } catch (err: any) {
          console.warn(`[Feeds] Remotive error: ${err.message}`);
          return [];
        }
      },
    },

    // 5. Himalayas Entry-Level API
    {
      name: 'Himalayas',
      run: async () => {
        try {
          const url = 'https://himalayas.app/jobs/api?seniority=entry-level&limit=30';
          const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
          if (!resp.ok) return [];
          const data = await resp.json();
          const rawJobs = Array.isArray(data?.jobs) ? data.jobs : [];
          return rawJobs.map((j: any) => ({
            title: j.title || '',
            company: j.companyName || 'Unknown',
            location: (j.locationRestrictions || []).join(', ') || 'Remote',
            applyLink: j.applicationUrl || j.url || '',
            description: j.description || j.excerpt || '',
            descriptionSource: 'API' as const,
            postedAt: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : new Date().toISOString(),
            source: 'Himalayas',
            sourceType: 'AGGREGATOR' as const,
            isRemote: true,
          }));
        } catch (err: any) {
          console.warn(`[Feeds] Himalayas error: ${err.message}`);
          return [];
        }
      },
    },

    // 6. Jobicy Remote Jobs API
    {
      name: 'Jobicy',
      run: async () => {
        try {
          const url = 'https://jobicy.com/api/v2/remote-jobs?count=30&industry=engineering';
          const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
          if (!resp.ok) return [];
          const data = await resp.json();
          const rawJobs = Array.isArray(data?.jobs) ? data.jobs : [];
          return rawJobs.map((j: any) => ({
            title: j.jobTitle || '',
            company: j.companyName || 'Unknown',
            location: j.jobGeo || 'Remote',
            applyLink: j.url || '',
            description: j.jobDescription || j.jobExcerpt || '',
            descriptionSource: 'API' as const,
            postedAt: j.pubDate || new Date().toISOString(),
            source: 'Jobicy',
            sourceType: 'AGGREGATOR' as const,
            isRemote: true,
          }));
        } catch (err: any) {
          console.warn(`[Feeds] Jobicy error: ${err.message}`);
          return [];
        }
      },
    },
  ];

  const results = await Promise.allSettled(
    tasks.map(async (t) => {
      const startTime = Date.now();
      const jobs = await t.run();
      console.log(`  └─ [${t.name}] Fetched ${jobs.length} jobs in ${Date.now() - startTime}ms`);
      return jobs;
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled') {
      allJobs.push(...r.value);
    }
  }

  console.log(`[Feeds Summary] Total collected from public feeds: ${allJobs.length} raw jobs\n`);
  return allJobs;
}
