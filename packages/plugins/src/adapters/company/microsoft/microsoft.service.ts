
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto, Site, LocationDto,
} from '../../../base/models/index.js';
import { createHttpClient } from '../../../common/index.js';
import {
  MICROSOFT_SEARCH_ENDPOINT, MICROSOFT_HEADERS,
  MICROSOFT_PAGE_SIZE, MICROSOFT_REQUEST_DELAY_MS, MICROSOFT_BASE_URL,
} from './microsoft.constants.js';
import { EightfoldSearchResponse, EightfoldPosition } from './microsoft.types.js';

export class MicrosoftService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const jobs: JobPostDto[] = [];
    const maxResults = input.resultsWanted ?? 100;
    let start = 0;
    let consecutiveEmpty = 0;

    try {
      const client = createHttpClient({
        proxies: input.proxies,
        timeout: input.requestTimeout ?? 30,
      });
      client.setHeaders(MICROSOFT_HEADERS);

      while (jobs.length < maxResults && consecutiveEmpty < 3) {
        const { data } = await client.get<EightfoldSearchResponse>(
          MICROSOFT_SEARCH_ENDPOINT,
          {
            params: {
              domain: 'microsoft.com',
              query: input.searchTerm ?? '',
              location: input.location ?? '',
              start,
              sort_by: 'timestamp',
            },
          },
        );

        const positions = data?.data?.positions ?? [];
        if (!positions.length) {
          consecutiveEmpty++;
          start += MICROSOFT_PAGE_SIZE;
          await this.delay(MICROSOFT_REQUEST_DELAY_MS);
          continue;
        }

        consecutiveEmpty = 0;
        for (const p of positions) {
          if (jobs.length >= maxResults) break;
          const job = this.mapToJobPost(p);
          if (job) jobs.push(job);
        }

        start += MICROSOFT_PAGE_SIZE;
        await this.delay(MICROSOFT_REQUEST_DELAY_MS);
      }

      console.log(`Microsoft: scraped ${jobs.length} jobs`);
    } catch (err: any) {
      console.error(`Microsoft scrape failed: ${err.message}`);
    }

    return { jobs };
  }

  private mapToJobPost(p: EightfoldPosition): JobPostDto | null {
    if (!p.name) return null;

    const locStr = p.locations?.[0] ?? '';
    const locParts = locStr.split(',').map((s) => s.trim());

    const url = p.positionUrl
      ? `${MICROSOFT_BASE_URL}${p.positionUrl}`
      : undefined;

    return new JobPostDto({
      id: p.id ?? undefined,
      site: Site.MICROSOFT,
      title: p.name,
      companyName: 'Microsoft',
      jobUrl: url,
      location: new LocationDto({
        city: locParts[0] ?? null,
        state: locParts[1] ?? null,
        country: locParts[2] ?? null,
      }),
      department: p.department ?? undefined,
      datePosted: p.postedTs
        ? new Date(p.postedTs * 1000).toISOString().split('T')[0]
        : undefined,
      atsId: p.displayJobId ?? undefined,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
