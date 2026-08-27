
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto, Site, LocationDto,
} from '../../../base/models/index.js';
import { createHttpClient } from '../../../common/index.js';
import { stripHtmlTags } from '../../../common/index.js';
import {
  APPLE_CSRF_ENDPOINT, APPLE_SEARCH_ENDPOINT, APPLE_HEADERS,
  APPLE_PAGE_SIZE, APPLE_REQUEST_DELAY_MS, APPLE_BASE_URL,
} from './apple.constants.js';
import { AppleSearchResponse, AppleJobResult } from './apple.types.js';

export class AppleService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const jobs: JobPostDto[] = [];
    const maxResults = input.resultsWanted ?? 100;

    try {
      const client = createHttpClient({
        proxies: input.proxies,
        timeout: input.requestTimeout ?? 30,
      });
      client.setHeaders(APPLE_HEADERS);

      // Step 1: Get CSRF token
      const csrfRes = await client.get(APPLE_CSRF_ENDPOINT);
      const csrfToken = csrfRes.headers['x-apple-csrf-token'];
      if (csrfToken) {
        client.setHeaders({ 'x-apple-csrf-token': csrfToken as string });
      }

      // Step 2: Paginate through search results
      let page = 1;
      while (jobs.length < maxResults) {
        const payload = {
          query: input.searchTerm ?? '',
          filters: {},
          page,
          locale: 'en-us',
          sort: '',
          format: { longDate: 'MMMM D, YYYY', mediumDate: 'MMM D, YYYY' },
        };

        const { data } = await client.post<AppleSearchResponse>(
          APPLE_SEARCH_ENDPOINT,
          payload,
        );

        const results = data?.res?.searchResults ?? [];
        if (!results.length) break;

        for (const r of results) {
          if (jobs.length >= maxResults) break;
          const job = this.mapToJobPost(r);
          if (job) jobs.push(job);
        }

        const total = data?.res?.totalRecords ?? 0;
        if (page * APPLE_PAGE_SIZE >= total) break;
        page++;
        await this.delay(APPLE_REQUEST_DELAY_MS);
      }

      console.log(`Apple: scraped ${jobs.length} jobs`);
    } catch (err: any) {
      console.error(`Apple scrape failed: ${err.message}`);
    }

    return { jobs };
  }

  private mapToJobPost(r: AppleJobResult): JobPostDto | null {
    if (!r.postingTitle) return null;

    const loc = r.locations?.[0];
    const slug = r.transformedPostingTitle ?? '';
    const url = r.positionId
      ? `${APPLE_BASE_URL}/en-us/details/${r.positionId}/${slug}`
      : undefined;

    return new JobPostDto({
      id: r.positionId ?? r.id ?? undefined,
      site: Site.APPLE,
      title: r.postingTitle,
      companyName: 'Apple',
      jobUrl: url,
      location: loc
        ? new LocationDto({
            city: loc.city ?? null,
            state: loc.stateProvince ?? null,
            country: loc.countryName ?? null,
          })
        : undefined,
      description: r.jobSummary ? stripHtmlTags(r.jobSummary) : null,
      datePosted: r.postingDate ?? undefined,
      department: r.team?.teamName ?? undefined,
      isRemote: r.homeOffice ?? false,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
