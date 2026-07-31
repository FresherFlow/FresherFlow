
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto, Site, LocationDto,
} from '../../../base/models/index.js';
import { createHttpClient, stripHtmlTags } from '../../../common/index.js';

const API_URL = 'https://www.metacareers.com/graphql';
const CAREERS_BASE = 'https://www.metacareers.com/jobs/';

export class MetaService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const jobs: JobPostDto[] = [];
    const resultsWanted = input.resultsWanted ?? 50;

    try {
      const client = createHttpClient({
        proxies: input.proxies,
        timeout: input.requestTimeout ?? 30,
      });

      // Meta uses a JSON API on their careers page
      const searchUrl = `https://www.metacareers.com/jobs?q=${encodeURIComponent(input.searchTerm ?? '')}&location=${encodeURIComponent(input.location ?? '')}`;

      const { data: html } = await client.get<string>(searchUrl);

      // Extract job data from __NEXT_DATA__ or embedded JSON
      const dataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (dataMatch?.[1]) {
        try {
          const nextData = JSON.parse(dataMatch[1]);
          const listings = nextData?.props?.pageProps?.jobs
            ?? nextData?.props?.pageProps?.initialJobs ?? [];

          for (const listing of listings) {
            if (jobs.length >= resultsWanted) break;

            const title = listing.title ?? '';
            if (!title) continue;

            const jobId = listing.id ?? listing.req_id ?? '';
            const id = `meta-${jobId || Math.abs(this.hashCode(title))}`;

            const locationStr = listing.locations?.join(', ')
              ?? listing.location ?? null;
            const location = locationStr
              ? new LocationDto({ city: locationStr })
              : null;

            jobs.push(
              new JobPostDto({
                id,
                site: Site.META,
                title,
                companyName: 'Meta',
                jobUrl: listing.url ?? `${CAREERS_BASE}${jobId}`,
                location,
                description: listing.description
                  ? stripHtmlTags(listing.description)
                  : null,
                datePosted: listing.posted_date ?? null,
                isRemote: locationStr?.toLowerCase().includes('remote') ?? false,
                department: listing.team ?? listing.department ?? null,
              }),
            );
          }
        } catch {
          console.warn('Meta: failed to parse __NEXT_DATA__');
        }
      }

      console.log(`Meta: scraped ${jobs.length} jobs`);
    } catch (err: any) {
      console.error(`Meta scrape failed: ${err.message}`);
    }

    return { jobs };
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
