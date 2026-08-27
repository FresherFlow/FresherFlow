
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto,
  DescriptionFormat, Country, Site, getGlassdoorUrl,
} from '../../../base/models/index.js';
import {
  createHttpClient, GlassdoorException, markdownConverter, plainConverter,
  extractEmails, randomSleep,
} from '../../../common/index.js';
import { GLASSDOOR_HEADERS, FALLBACK_CSRF_TOKEN, GD_JOB_SEARCH_QUERY } from './glassdoor.constants.js';
import { parseCompensation, getCursorForPage, parseLocation } from './glassdoor.utils.js';

export class GlassdoorService implements IScraper {
  
  private readonly delay = 5;
  private readonly bandDelay = 5;

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const country = input.country ?? Country.USA;
    const baseUrl = getGlassdoorUrl(country);

    const client = createHttpClient(input);
    client.setHeaders(GLASSDOOR_HEADERS);

    // Fetch CSRF token
    let csrfToken = FALLBACK_CSRF_TOKEN;
    try {
      const homeResp = await client.get(baseUrl);
      const csrfMatch = (homeResp.data as string).match(/gdCSRF\s*=\s*"([^"]+)"/);
      if (csrfMatch) csrfToken = csrfMatch[1];
    } catch (err: any) {
      console.warn(`Could not fetch Glassdoor CSRF token: ${err.message}`);
    }

    const jobList: JobPostDto[] = [];
    const resultsWanted = input.resultsWanted ?? 15;
    let page = 1;
    let paginationCursors: { cursor: string; pageNumber: number }[] = [];
    const seenIds = new Set<string>();

    while (jobList.length < resultsWanted) {
      console.log(`Fetching Glassdoor jobs, page ${page}`);

      try {
        const cursor = page === 1 ? null : getCursorForPage(paginationCursors, page);
        const variables: any = {
          keyword: input.searchTerm ?? '',
          numPerPage: 30,
          seoUrl: false,
        };
        if (cursor) variables.pageCursor = cursor;

        const filterParams: any[] = [];
        if (input.isRemote) filterParams.push({ filterKey: 'remoteWorkType', values: '1' });
        if (input.hoursOld) {
          const days = Math.ceil(input.hoursOld / 24);
          filterParams.push({ filterKey: 'fromAge', values: String(days) });
        }
        if (filterParams.length > 0) variables.filterParams = filterParams;

        const response = await client.post(`${baseUrl}graph`, {
          operationName: 'JobSearchQuery',
          query: GD_JOB_SEARCH_QUERY,
          variables,
        }, {
          headers: { 'gd-csrf-token': csrfToken },
        });

        const data = response.data?.data?.jobListings;
        if (!data) break;

        if (data.paginationCursors) paginationCursors = data.paginationCursors;

        const listings = data.jobListings ?? [];
        if (listings.length === 0) break;

        for (const listing of listings) {
          if (jobList.length >= resultsWanted) break;
          const jobview = listing.jobview;
          if (!jobview) continue;

          const header = jobview.header;
          const jobData = jobview.job;
          const overview = jobview.overview;

          const jobId = `gd-${header.adOrderId ?? jobData?.listingId}`;
          if (seenIds.has(jobId)) continue;
          seenIds.add(jobId);

          const link = header.seoJobLink ?? header.jobLink ?? '';
          const jobUrl = link.startsWith('http') ? link : `${baseUrl}${link.replace(/^\//, '')}`;

          let description = jobData?.descriptionFragments?.join('\n') ?? null;
          if (description) {
            if (input.descriptionFormat === DescriptionFormat.MARKDOWN) {
              description = markdownConverter(description) ?? description;
            } else if (input.descriptionFormat === DescriptionFormat.PLAIN) {
              description = plainConverter(description) ?? description;
            }
          }

          const compensation = parseCompensation(header);
          const location = parseLocation(header);

          jobList.push(new JobPostDto({
            id: jobId,
            title: header.jobTitleText ?? 'N/A',
            companyName: header.employerNameFromSearch ?? overview?.shortName ?? null,
            jobUrl,
            location,
            compensation,
            datePosted: header.ageInDays != null
              ? new Date(Date.now() - header.ageInDays * 86400000).toISOString().split('T')[0]
              : null,
            isRemote: header.locationType === 'S' || false,
            description,
            emails: extractEmails(description),
            companyLogo: overview?.squareLogoUrl ?? null,
            listingType: header.sponsored ? 'sponsored' : null,
            site: Site.GLASSDOOR,
          }));
        }

        page++;
        await randomSleep(this.delay * 1000, (this.delay + this.bandDelay) * 1000);
      } catch (err: any) {
        console.error(`Glassdoor scrape error: ${err.message}`);
        break;
      }
    }

    return new JobResponseDto(jobList);
  }
}
