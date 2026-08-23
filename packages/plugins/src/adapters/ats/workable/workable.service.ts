
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  LocationDto,
  Site,
  DescriptionFormat,
  getJobTypeFromString,
} from '../../../base/models/index.js';
import {
  createHttpClient,
  htmlToPlainText,
  markdownConverter,
  resolveCompensation,
  BrowserPool,
} from '../../../common/index.js';
import {
  WORKABLE_API_URL,
  WORKABLE_DETAIL_CONCURRENCY,
  WORKABLE_HEADERS,
  workableDetailUrl,
} from './workable.constants';
import {
  WorkableJob,
  WorkableJobDetail,
  WorkableResponse,
  WorkableApiV3Job,
  WorkableApiV3Response,
} from './workable.types';

export class WorkableService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      console.warn('No companySlug provided for Workable scraper');
      return new JobResponseDto([]);
    }

    // Check for API token: per-request auth overrides env var
    const accessToken =
      input.auth?.workable?.accessToken ?? process.env.WORKABLE_API_TOKEN;
    const subdomain =
      input.auth?.workable?.subdomain ??
      process.env.WORKABLE_SUBDOMAIN ??
      companySlug;

    if (accessToken) {
      try {
        const result = await this.scrapeWithApi(
          accessToken,
          subdomain,
          companySlug,
          input,
        );
        return result;
      } catch (err: any) {
        console.warn(
          `Workable authenticated API failed for ${companySlug}: ${err.message}. Falling back to public scraping.`,
        );
      }
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(WORKABLE_HEADERS);

    const url = `${WORKABLE_API_URL}/${encodeURIComponent(companySlug)}`;

    try {
      console.log(`Fetching Workable jobs for company: ${companySlug}`);
      const response = await client.get(url);
      const data: WorkableResponse = response.data ?? { jobs: [] };
      const jobs = data.jobs ?? [];

      console.log(`Workable: found ${jobs.length} raw jobs for ${companySlug}`);

      const resultsWanted = input.resultsWanted ?? 100;
      const limited = jobs.slice(0, resultsWanted);

      // The widget list omits description and work-mode; overlay each job with
      // its public v2 detail (rich body + workplace) before mapping.
      const details = await this.fetchDetails(client, limited, companySlug);

      // Count how many details we actually got (non-null)
      const detailsFound = details.filter(d => d !== null).length;

      const jobPosts: JobPostDto[] = [];
      limited.forEach((job, index) => {
        try {
          const post = this.processJob(
            job,
            companySlug,
            input.descriptionFormat,
            details[index],
          );
          if (post) {
            jobPosts.push(post);
          }
        } catch (err: any) {
          console.warn(`Error processing Workable job ${job.shortcode}: ${err.message}`);
        }
      });

      // Return API jobs directly (full scraping is done downstream in job-processor)
      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      console.warn(`Workable scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  /**
   * Fetch jobs using the authenticated Workable API v3.
   * Uses Bearer token auth and returns published jobs.
   * @see https://workable.readme.io/reference/jobs
   */
  private async scrapeWithApi(
    accessToken: string,
    subdomain: string,
    companySlug: string,
    input: ScraperInputDto,
  ): Promise<JobResponseDto> {
    console.log(
      `Workable: using authenticated API v3 for subdomain: ${subdomain}`,
    );

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });

    const resultsWanted = input.resultsWanted ?? 100;
    const limit = Math.min(resultsWanted, 100);
    const baseUrl = `https://${encodeURIComponent(subdomain)}.workable.com/spi/v3/jobs`;
    const jobPosts: JobPostDto[] = [];
    let sinceId: string | null = null;

    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    while (jobPosts.length < resultsWanted) {
      let url = `${baseUrl}?state=published&limit=${limit}`;
      if (sinceId) {
        url += `&since_id=${encodeURIComponent(sinceId)}`;
      }

      const response = await client.get<WorkableApiV3Response>(url, { headers });

      const data = response.data ?? { jobs: [] };
      const jobs = data.jobs ?? [];

      if (jobs.length === 0) break;

      console.log(
        `Workable (authenticated): fetched ${jobs.length} jobs for ${subdomain}`,
      );

      for (const job of jobs) {
        if (jobPosts.length >= resultsWanted) break;

        try {
          const post = this.processApiJob(job, companySlug);
          if (post) {
            jobPosts.push(post);
          }
        } catch (err: any) {
          console.warn(
            `Error processing Workable API job ${job.shortcode}: ${err.message}`,
          );
        }
      }

      // Workable API uses cursor-based pagination via paging.next
      sinceId = data.paging?.next ?? null;
      if (!sinceId) break;
    }

    console.log(
      `Workable (authenticated) total: ${jobPosts.length} jobs for ${subdomain}`,
    );
    return new JobResponseDto(jobPosts);
  }

  /**
   * Map a Workable API v3 job to JobPostDto.
   */
  private processApiJob(
    job: WorkableApiV3Job,
    companySlug: string,
  ): JobPostDto | null {
    const title = job.full_title ?? job.title;
    if (!title) return null;

    const loc = job.location;
    const location = new LocationDto({
      city: loc?.city ?? null,
      state: loc?.region ?? null,
      country: loc?.country ?? null,
    });

    const isRemote = loc?.telecommuting ?? false;

    const jobType = job.employment_type
      ? (() => {
          const mapped = getJobTypeFromString(job.employment_type!);
          return mapped ? [mapped] : null;
        })()
      : null;

    const datePosted = job.published_on ?? job.created_at ?? null;

    return new JobPostDto({
      id: `workable-${job.shortcode ?? job.id}`,
      title,
      companyName: companySlug,
      jobUrl:
        job.url ??
        job.shortlink ??
        `https://apply.workable.com/${companySlug}/j/${job.shortcode}`,
      location,
      datePosted: datePosted
        ? new Date(datePosted).toISOString().split('T')[0]
        : null,
      isRemote,
      jobType,
      site: Site.WORKABLE,
      // ATS-specific fields
      atsId: job.shortcode ?? job.id ?? null,
      atsType: 'workable',
      department: job.department ?? null,
      employmentType: job.employment_type ?? null,
      applyUrl: job.application_url ?? null,
    });
  }

  private processJob(
    job: WorkableJob,
    companySlug: string,
    format?: DescriptionFormat,
    detail?: WorkableJobDetail | null,
  ): JobPostDto | null {
    const title = job.title;
    if (!title) return null;

    // Location
    const primaryLoc = job.locations?.[0];
    const location = new LocationDto({
      city: primaryLoc?.city ?? job.city ?? null,
      state: primaryLoc?.region ?? job.state ?? null,
      country: primaryLoc?.country ?? job.country ?? null,
    });

    // Remote detection: widget telecommuting OR the detail's work-mode signals.
    const isRemote =
      (job.telecommuting ?? false) ||
      (detail?.remote ?? false) ||
      detail?.workplace?.toLowerCase() === 'remote';

    // Job type
    const jobType = job.employment_type
      ? (() => {
          const mapped = getJobTypeFromString(job.employment_type!);
          return mapped ? [mapped] : null;
        })()
      : null;

    // Date
    const datePosted = job.published_on ?? job.created_at ?? null;

    const description = this.formatDescription(detail, format);
    const workFromHomeType = this.workFromHomeTypeFromWorkplace(detail?.workplace);

    // Workable exposes no structured compensation, so parse the plain-text
    // body for a stated salary range (Spec 5018).
    const compensation = resolveCompensation({
      text: this.formatDescription(detail, DescriptionFormat.PLAIN),
    });

    return new JobPostDto({
      id: `workable-${job.shortcode}`,
      title,
      companyName: companySlug,
      jobUrl: job.url ?? job.shortlink ?? `https://apply.workable.com/${companySlug}/j/${job.shortcode}`,
      location,
      description,
      ...(compensation ? { compensation } : {}),
      datePosted: datePosted
        ? new Date(datePosted).toISOString().split('T')[0]
        : null,
      isRemote,
      jobType,
      jobFunction: job.function ?? null,
      site: Site.WORKABLE,
      ...(workFromHomeType ? { workFromHomeType } : {}),
      // ATS-specific fields
      atsId: job.shortcode ?? null,
      atsType: 'workable',
      department: job.department ?? null,
      employmentType: job.employment_type ?? null,
      applyUrl: job.application_url ?? null,
    });
  }

  /**
   * Fetch the public v2 detail for each job under bounded concurrency.
   * Returns details aligned by index; a failed/empty fetch yields null so the
   * job still maps from the widget list.
   */
  private async fetchDetails(
    client: ReturnType<typeof createHttpClient>,
    jobs: WorkableJob[],
    companySlug: string,
  ): Promise<(WorkableJobDetail | null)[]> {
    const details: (WorkableJobDetail | null)[] = new Array(jobs.length).fill(
      null,
    );

    let consecutive429s = 0;

    for (
      let index = 0;
      index < jobs.length;
      index += WORKABLE_DETAIL_CONCURRENCY
    ) {
      // If we hit 3 consecutive batches of 429s, stop wasting time
      if (consecutive429s >= 3) {
        console.warn(`Workable: ${companySlug} — too many 429s, skipping remaining detail fetches`);
        break;
      }

      const batch = jobs.slice(index, index + WORKABLE_DETAIL_CONCURRENCY);
      let batch429s = 0;
      const settled = await Promise.allSettled(
        batch.map((job) => this.fetchDetail(client, job, companySlug)),
      );
      settled.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled') {
          details[index + batchIndex] = result.value;
        } else if (result.status === 'rejected' && result.reason?.message?.includes('429')) {
          batch429s++;
        }
      });

      if (batch429s === batch.length) {
        consecutive429s++;
      } else {
        consecutive429s = 0;
      }
    }

    return details;
  }

  private async fetchDetail(
    client: ReturnType<typeof createHttpClient>,
    job: WorkableJob,
    companySlug: string,
  ): Promise<WorkableJobDetail | null> {
    const shortcode = job.shortcode;
    if (!shortcode) return null;

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.get<WorkableJobDetail>(
          workableDetailUrl(companySlug, shortcode),
        );
        return response.data ?? null;
      } catch (err: any) {
        const is429 = err.response?.status === 429 || err.message?.includes('429');
        if (is429 && attempt < maxRetries) {
          // Respect Retry-After header, else exponential backoff
          const retryAfter = err.response?.headers?.['retry-after'];
          const delay = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 10000)
            : Math.min(2000 * Math.pow(2, attempt), 10000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // Non-429 error or exhausted retries — return null silently
        return null;
      }
    }
    return null;
  }

  /**
   * Build the posting body by concatenating the detail's description,
   * requirements, and benefits (Workable splits them), then render to the
   * requested format. Markdown is the default.
   */
  private formatDescription(
    detail: WorkableJobDetail | null | undefined,
    format?: DescriptionFormat,
  ): string | null {
    if (!detail) return null;
    const html = [detail.description, detail.requirements, detail.benefits]
      .filter(
        (part): part is string =>
          typeof part === 'string' && part.trim().length > 0,
      )
      .map((part) => part.trim())
      .join('\n');
    if (!html) return null;

    if (format === DescriptionFormat.HTML) return html;
    if (format === DescriptionFormat.PLAIN) return htmlToPlainText(html);
    return markdownConverter(html) ?? html;
  }  /** Map the Workable `workplace` enum to a workFromHomeType label. on_site ? none. */
  private workFromHomeTypeFromWorkplace(
    workplace?: string | null,
  ): string | null {
    switch (workplace?.toLowerCase()) {
      case 'hybrid': return 'Hybrid';
      case 'remote': return 'Remote';
      default: return null;
    }
  }

  /**
   * Browser-based fallback: load the public careers page and scrape job data
   * from the rendered DOM. Used when the v1 widget API returns jobs but all
   * detail fetches fail (e.g., 429 rate limiting).
   */
  private async scrapeViaBrowser(
    companySlug: string,
    input: ScraperInputDto,
  ): Promise<JobResponseDto> {
    let page;
    try {
      page = await BrowserPool.getPage({ stealth: true });
      const careersUrl = `https://apply.workable.com/${encodeURIComponent(companySlug)}/`;
      const timeoutMs = Math.min((input.requestTimeout ?? 30) * 1000, 30000);

      // Intercept v3 API responses that the SPA fires after loading
      const v3Jobs: WorkableApiV3Job[] = [];
      const jobPromise = new Promise<WorkableApiV3Job[]>((resolve) => {
        const timer = setTimeout(() => resolve(v3Jobs), timeoutMs);
        page!.on('response', async (resp: any) => {
          try {
            if (resp.url().includes(`/api/v3/accounts/${encodeURIComponent(companySlug)}/jobs`) && resp.status() === 200) {
              const json = await resp.json();
              v3Jobs.push(...(json.results ?? []));
            }
          } catch {}
        });
        // Cleanup timer if we resolve early
        const origResolve = resolve;
        (resolve as any) = (jobs: WorkableApiV3Job[]) => { clearTimeout(timer); origResolve(jobs); };
      });

      console.log(`Workable browser: loading ${careersUrl}`);
      await page.goto(careersUrl, { waitUntil: 'networkidle', timeout: timeoutMs }).catch(() => {});
      const v3Results = await jobPromise;

      if (v3Results.length === 0) {
        console.log(`Workable browser: 0 jobs from ${companySlug}`);
        return new JobResponseDto([]);
      }

      console.log(`Workable browser: found ${v3Results.length} jobs for ${companySlug}`);
      const resultsWanted = input.resultsWanted ?? 100;
      const posts = v3Results
        .slice(0, resultsWanted)
        .map((j) => this.processApiJob(j, companySlug))
        .filter((p): p is JobPostDto => p !== null);
      return new JobResponseDto(posts);
    } catch (err: any) {
      console.error(`Workable browser fallback failed for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    } finally {
      if (page) { await page.close().catch(() => {}); }
    }
  }
}
