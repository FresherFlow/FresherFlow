
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  LocationDto,
  Site,
  DescriptionFormat,
} from '../../../base/models/index.js';
import {
  createHttpClient,
  htmlToPlainText,
  markdownConverter,
  extractEmails,
} from '../../../common/index.js';
import { JOBVITE_API_URL, JOBVITE_OFFICIAL_API_URL, JOBVITE_HEADERS } from './jobvite.constants.js';
import { JobviteResponse, JobviteJob } from './jobvite.types.js';

export class JobviteService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      console.warn('No companySlug provided for Jobvite scraper');
      return new JobResponseDto([]);
    }

    // Check for API credentials: per-request auth overrides env vars
    const apiKey =
      input.auth?.jobvite?.apiKey ?? process.env.JOBVITE_API_KEY;
    const apiSecret =
      input.auth?.jobvite?.apiSecret ?? process.env.JOBVITE_API_SECRET;

    if (apiKey && apiSecret) {
      try {
        const result = await this.scrapeWithApi(
          apiKey,
          apiSecret,
          companySlug,
          input,
        );
        return result;
      } catch (err: any) {
        console.warn(
          `Jobvite authenticated API failed for ${companySlug}: ${err.message}. Falling back to public scraping.`,
        );
      }
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(JOBVITE_HEADERS);

    const url = `${JOBVITE_API_URL}/${encodeURIComponent(companySlug)}`;

    try {
      console.log(`Fetching Jobvite jobs for company: ${companySlug}`);
      const response = await client.get(url);
      const data: JobviteResponse = response.data ?? { requisitions: [] };
      const jobs = data.requisitions ?? [];

      console.log(
        `Jobvite: found ${jobs.length} raw jobs for ${companySlug}`,
      );

      const resultsWanted = input.resultsWanted ?? 100;
      const jobPosts: JobPostDto[] = [];

      for (const job of jobs) {
        if (jobPosts.length >= resultsWanted) break;

        try {
          const post = this.mapJob(job, companySlug, input.descriptionFormat);
          if (post) {
            jobPosts.push(post);
          }
        } catch (err: any) {
          console.warn(
            `Error processing Jobvite job ${job.eId}: ${err.message}`,
          );
        }
      }

      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      console.error(
        `Jobvite scrape error for ${companySlug}: ${err.message}`,
      );
      return new JobResponseDto([]);
    }
  }

  /**
   * Fetch jobs using the authenticated Jobvite API.
   * Uses API key + secret as query parameters and reuses mapJob() for mapping.
   * @see https://developer.jobvite.com
   */
  private async scrapeWithApi(
    apiKey: string,
    apiSecret: string,
    companySlug: string,
    input: ScraperInputDto,
  ): Promise<JobResponseDto> {
    console.log(
      `Jobvite: using authenticated API for company: ${companySlug}`,
    );

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });

    const url =
      `${JOBVITE_OFFICIAL_API_URL}?api=${encodeURIComponent(apiKey)}` +
      `&sc=${encodeURIComponent(apiSecret)}` +
      `&companyId=${encodeURIComponent(companySlug)}`;

    const response = await client.get(url, {
      headers: { Accept: 'application/json' },
    });

    const data: JobviteResponse = response.data ?? { requisitions: [] };
    const jobs = data.requisitions ?? [];

    console.log(
      `Jobvite (authenticated): found ${jobs.length} jobs for ${companySlug}`,
    );

    const resultsWanted = input.resultsWanted ?? 100;
    const jobPosts: JobPostDto[] = [];

    for (const job of jobs) {
      if (jobPosts.length >= resultsWanted) break;

      try {
        const post = this.mapJob(job, companySlug, input.descriptionFormat);
        if (post) {
          jobPosts.push(post);
        }
      } catch (err: any) {
        console.warn(
          `Error processing Jobvite API job ${job.eId}: ${err.message}`,
        );
      }
    }

    return new JobResponseDto(jobPosts);
  }

  private mapJob(
    job: JobviteJob,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.title;
    if (!title) return null;

    // Description
    let description: string | null = null;
    const rawDesc = job.description ?? job.briefDescription ?? null;
    if (rawDesc) {
      if (format === DescriptionFormat.HTML) {
        description = rawDesc;
      } else if (format === DescriptionFormat.MARKDOWN) {
        description = markdownConverter(rawDesc) ?? rawDesc;
      } else {
        description = htmlToPlainText(rawDesc);
      }
    }

    // Location
    const location = new LocationDto({
      city: job.city ?? null,
      state: job.state ?? null,
      country: job.country ?? null,
    });

    // Remote detection
    const locationStr = job.location ?? '';
    const isRemote = locationStr.toLowerCase().includes('remote');

    // Job URL
    const jobUrl =
      job.detailUrl ??
      job.applyUrl ??
      `https://jobs.jobvite.com/${encodeURIComponent(companySlug)}/job/${job.eId ?? ''}`;

    return new JobPostDto({
      id: `jobvite-${job.eId ?? job.requisitionId ?? ''}`,
      title,
      companyName: companySlug,
      jobUrl,
      location,
      description,
      datePosted: job.date
        ? new Date(job.date).toISOString().split('T')[0]
        : null,
      isRemote,
      emails: extractEmails(description),
      site: Site.JOBVITE,
      atsId: job.eId ?? job.requisitionId ?? null,
      atsType: 'jobvite',
      department: job.department ?? job.category ?? null,
      employmentType: job.type ?? null,
      applyUrl: job.applyUrl ?? null,
    });
  }
}
