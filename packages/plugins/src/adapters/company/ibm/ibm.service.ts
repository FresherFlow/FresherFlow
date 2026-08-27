
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto, Site, LocationDto,
} from '../../../base/models/index.js';
import { createHttpClient, stripHtmlTags } from '../../../common/index.js';
import { IBM_CAREERS_URL, IBM_JOB_BASE_URL } from './ibm.constants.js';
import { IbmJob } from './ibm.types.js';

export class IbmService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const jobs: JobPostDto[] = [];
    const resultsWanted = input.resultsWanted ?? 50;

    try {
      const client = createHttpClient({
        proxies: input.proxies,
        timeout: input.requestTimeout ?? 30,
      });

      const searchUrl = `${IBM_CAREERS_URL}?field_keyword_18[0]=${encodeURIComponent(input.searchTerm ?? '')}`;
      const { data: html } = await client.get<string>(searchUrl);

      // Extract job data from __NEXT_DATA__ embedded JSON
      const dataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (dataMatch?.[1]) {
        try {
          const nextData = JSON.parse(dataMatch[1]);
          const listings: IbmJob[] = nextData?.props?.pageProps?.jobs
            ?? nextData?.props?.pageProps?.initialJobs ?? [];

          for (const listing of listings) {
            if (jobs.length >= resultsWanted) break;

            const title = listing.title ?? '';
            if (!title) continue;

            const jobId = listing.id ?? listing.req_id ?? '';
            const id = `ibm-${jobId || Math.abs(this.hashCode(title))}`;

            const locationStr = listing.locations?.join(', ')
              ?? listing.location ?? null;
            const location = locationStr
              ? new LocationDto({ city: locationStr })
              : null;

            jobs.push(
              new JobPostDto({
                id,
                site: Site.IBM,
                title,
                companyName: 'IBM',
                jobUrl: listing.url ?? `${IBM_JOB_BASE_URL}/${jobId}`,
                location,
                description: listing.description
                  ? stripHtmlTags(listing.description)
                  : null,
                datePosted: listing.posted_date ?? listing.date_posted ?? null,
                isRemote: locationStr?.toLowerCase().includes('remote') ?? false,
                department: listing.team ?? listing.department ?? null,
              }),
            );
          }
        } catch {
          console.warn('IBM: failed to parse __NEXT_DATA__');
        }
      }

      console.log(`IBM: scraped ${jobs.length} jobs`);
    } catch (err: any) {
      console.error(`IBM scrape failed: ${err.message}`);
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
