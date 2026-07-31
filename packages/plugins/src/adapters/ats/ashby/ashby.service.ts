
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  CompensationDto,
  Site,
  DescriptionFormat,
  getCompensationInterval,
} from '../../../base/models/index.js';
import {
  createHttpClient,
  HttpClient,
  htmlToPlainText,
  extractEmails,
  parseLocationList,
  resolveCompensation,
  aggregateCompensation,
} from '../../../common/index.js';
import {
  ASHBY_API_URL,
  ASHBY_HEADERS,
  ASHBY_INCLUDE_COMPENSATION_QUERY,
  ASHBY_PUBLIC_MAX_RETRIES,
  ASHBY_RETRY_BACKOFF,
} from './ashby.constants';
import {
  AshbyJob,
  AshbyResponse,
  AshbyCompensationTier,
  AshbyFlatCompensationComponent,
} from './ashby.types';

export class AshbyService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      console.warn('No companySlug provided for Ashby scraper');
      return new JobResponseDto([]);
    }

    // Check for API key: per-request auth overrides env var
    const apiKey = input.auth?.ashby?.apiKey ?? process.env.ASHBY_API_KEY;
    if (apiKey) {
      try {
        const result = await this.scrapeWithApi(apiKey, companySlug, input);
        return result;
      } catch (err: any) {
        console.warn(
          `Ashby authenticated API failed for ${companySlug}: ${err.message}. Falling back to public scraping.`,
        );
      }
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(ASHBY_HEADERS);

    const url = this.buildBoardUrl(companySlug);

    try {
      console.log(`Fetching Ashby jobs for company: ${companySlug}`);
      const response = await this.getWithRetry(client, url);
      const data: AshbyResponse = response.data ?? { jobs: [] };
      const jobs = data.jobs ?? [];

      console.log(`Ashby: found ${jobs.length} raw jobs for ${companySlug}`);

      const resultsWanted = input.resultsWanted ?? 100;
      const jobPosts: JobPostDto[] = [];

      for (const job of jobs) {
        if (jobPosts.length >= resultsWanted) break;
        if (job.isListed === false) continue;

        try {
          const post = this.processJob(job, companySlug, input.descriptionFormat);
          if (post) {
            jobPosts.push(post);
          }
        } catch (err: any) {
          console.warn(`Error processing Ashby job ${job.id}: ${err.message}`);
        }
      }

      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      console.error(`Ashby scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  /**
   * Fetch jobs using the authenticated Ashby Posting API.
   * Uses Basic Auth with the API key and reuses processJob() for mapping.
   */
  private async scrapeWithApi(
    apiKey: string,
    companySlug: string,
    input: ScraperInputDto,
  ): Promise<JobResponseDto> {
    console.log(
      `Ashby: using authenticated API for company: ${companySlug}`,
    );

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });

    const url = this.buildBoardUrl(companySlug);
    const authToken = Buffer.from(`${apiKey}:`).toString('base64');

    const response = await client.post(url, undefined, {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${authToken}`,
      },
    });

    const data: AshbyResponse = response.data ?? { jobs: [] };
    const jobs = data.jobs ?? [];

    console.log(
      `Ashby (authenticated): found ${jobs.length} jobs for ${companySlug}`,
    );

    const resultsWanted = input.resultsWanted ?? 100;
    const jobPosts: JobPostDto[] = [];

    for (const job of jobs) {
      if (jobPosts.length >= resultsWanted) break;
      if (job.isListed === false) continue;

      try {
        const post = this.processJob(job, companySlug, input.descriptionFormat);
        if (post) {
          jobPosts.push(post);
        }
      } catch (err: any) {
        console.warn(
          `Error processing Ashby API job ${job.id}: ${err.message}`,
        );
      }
    }

    return new JobResponseDto(jobPosts);
  }

  /**
   * Build the job-board URL for a company slug. Both the public GET and the
   * authenticated POST hit the same endpoint; includeCompensation=true opts
   * the response into the compensation payload (the public API omits it
   * entirely otherwise) and is harmless on the authenticated path.
   */
  private buildBoardUrl(companySlug: string): string {
    return `${ASHBY_API_URL}/${encodeURIComponent(companySlug)}?${ASHBY_INCLUDE_COMPENSATION_QUERY}`;
  }

  /**
   * GET with a small retry loop for the public job-board endpoint, whose
   * server-side latency can exceed client timeouts. Retries up to
   * ASHBY_PUBLIC_MAX_RETRIES times on network errors/timeouts (no HTTP
   * status) and HTTP 5xx; 4xx responses fail immediately. Backoff:
   * baseDelayMs * 2^attempt + random(0..jitterMaxMs).
   */
  private async getWithRetry(
    client: Pick<HttpClient, 'get'>,
    url: string,
    backoff: { baseDelayMs: number; jitterMaxMs: number } = ASHBY_RETRY_BACKOFF,
  ): Promise<{ data?: AshbyResponse }> {
    let lastError: any;
    for (let attempt = 0; attempt <= ASHBY_PUBLIC_MAX_RETRIES; attempt++) {
      try {
        return await client.get(url);
      } catch (err: any) {
        lastError = err;
        const status: number | undefined = err?.response?.status;
        const retryable = status === undefined || status >= 500;
        if (!retryable || attempt >= ASHBY_PUBLIC_MAX_RETRIES) {
          throw err;
        }
        const delay =
          backoff.baseDelayMs * Math.pow(2, attempt) +
          Math.random() * backoff.jitterMaxMs;
        console.warn(
          `Ashby public GET failed (attempt ${attempt + 1}/${
            ASHBY_PUBLIC_MAX_RETRIES + 1
          }): ${err?.message ?? err}. Retrying in ${Math.round(delay)}ms`,
        );
        await this.sleep(delay);
      }
    }
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private processJob(
    job: AshbyJob,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.title;
    if (!title) return null;

    // Description
    let description: string | null = null;
    if (format === DescriptionFormat.HTML && job.descriptionHtml) {
      description = job.descriptionHtml;
    } else if (job.descriptionPlain) {
      description = job.descriptionPlain;
    } else if (job.descriptionHtml) {
      description = htmlToPlainText(job.descriptionHtml);
    }

    const parsedLocations = parseLocationList(this.locationLabels(job));

    // Compensation - structured tiers first, then fall back to parsing the
    // job description (Spec 5018). Always parse a plain-text body so HTML mode
    // does not feed tags to the salary matcher.
    const salaryText =
      job.descriptionPlain ??
      (job.descriptionHtml ? htmlToPlainText(job.descriptionHtml) : null);
    const compensation = resolveCompensation({
      structured: this.extractCompensation(job),
      text: salaryText,
    });

    // The public job-board API and the authenticated Posting API disagree on
    // these field names (publishedAt vs publishedDate, department vs
    // departmentName, team vs teamName). Prefer the public name, fall back to
    // the authenticated one so both paths populate.
    const publishedRaw = job.publishedAt ?? job.publishedDate;
    const datePosted = publishedRaw
      ? new Date(publishedRaw).toISOString().split('T')[0]
      : null;

    return new JobPostDto({
      id: `ashby-${job.id}`,
      title,
      companyName: companySlug,
      jobUrl: job.jobUrl ?? `https://jobs.ashbyhq.com/${companySlug}/${job.id}`,
      location: parsedLocations.location,
      description,
      compensation,
      datePosted,
      isRemote: Boolean(job.isRemote) || parsedLocations.remoteMentioned,
      workFromHomeType: parsedLocations.workFromHomeType,
      emails: extractEmails(description),
      site: Site.ASHBY,
      // ATS-specific fields
      atsId: job.id ?? null,
      atsType: 'ashby',
      department: job.department ?? job.departmentName ?? null,
      team: job.team ?? job.teamName ?? null,
      employmentType: job.employmentType ?? null,
      applyUrl: job.applyUrl ?? null,
    });
  }

  private locationLabels(job: AshbyJob): string[] {
    const labels: string[] = [];

    const primaryAddress = this.postalAddressLabel(job.address);
    if (primaryAddress) {
      labels.push(primaryAddress);
    } else if (job.location) {
      labels.push(job.location);
    }

    for (const secondary of job.secondaryLocations ?? []) {
      const secondaryAddress = this.postalAddressLabel(secondary?.address);
      if (secondaryAddress) {
        labels.push(secondaryAddress);
      } else if (secondary?.location) {
        labels.push(secondary.location);
      }
    }

    return labels;
  }

  private postalAddressLabel(address: AshbyJob['address']): string | null {
    const postal = address?.postalAddress;
    if (!postal) return null;
    const parts = [
      postal.addressLocality,
      postal.addressRegion,
      postal.addressCountry,
    ].filter((part): part is string => Boolean(part?.trim()));
    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Extract compensation from an Ashby job. Two wire shapes are supported:
   *
   * 1. Tiered: `compensationComponents[].tiers[]` with
   *    tierFloor/tierCeiling/interval/currency.
   * 2. Flat (served by the public API with includeCompensation=true; live
   *    probe 2026-06-11): `summaryComponents[]` and
   *    `compensationTiers[].components[]` with
   *    minValue/maxValue/interval/currencyCode.
   */
  private extractCompensation(job: AshbyJob): CompensationDto | null {
    const comp = job.compensation;
    if (!comp) return null;

    return (
      this.extractFromTieredComponents(job) ??
      this.extractFromFlatComponents(job)
    );
  }

  /** Tiered shape: compensationComponents[].tiers[] (tierFloor/tierCeiling). */
  private extractFromTieredComponents(job: AshbyJob): CompensationDto | null {
    const comp = job.compensation!;

    // Try compensationComponents first, then summaryComponents
    const components = comp.compensationComponents ?? comp.summaryComponents ?? [];
    if (components.length === 0) return null;

    // Find the base salary component (first component or one labeled 'salary'/'base')
    const salaryComponent = components.find(
      (c) =>
        c.compensationType?.toLowerCase().includes('salary') ||
        c.compensationType?.toLowerCase() === 'base' ||
        c.label?.toLowerCase().includes('salary'),
    ) ?? components[0];

    const tiers = salaryComponent?.tiers ?? [];
    if (tiers.length === 0) return null;

    // Fold every tier (e.g. per-location/level bands) into the overall
    // min-max envelope rather than reporting only the first (Spec 5019).
    return aggregateCompensation(
      tiers.map((tier: AshbyCompensationTier) => ({
        minAmount: tier.tierFloor,
        maxAmount: tier.tierCeiling,
        currency: tier.currency ?? 'USD',
        interval: this.resolveInterval(tier.interval),
      })),
    );
  }

  /** Flat shape: summaryComponents[] / compensationTiers[].components[]. */
  private extractFromFlatComponents(job: AshbyJob): CompensationDto | null {
    const comp = job.compensation!;

    const candidates: AshbyFlatCompensationComponent[] = [
      ...(comp.summaryComponents ?? []),
      ...(comp.compensationTiers ?? []).flatMap((t) => t.components ?? []),
    ].filter((c) => c.minValue != null || c.maxValue != null);
    if (candidates.length === 0) return null;

    // Prefer the base salary component; fall back to the first bounded one.
    const salaryComponent =
      candidates.find(
        (c) =>
          c.compensationType?.toLowerCase().includes('salary') ||
          c.compensationType?.toLowerCase() === 'base',
      ) ?? candidates[0];

    // Fold every component sharing the chosen salary's type (e.g. per-location
    // bands) into one overall min-max envelope; bonus/equity rows stay out
    // since they carry a different compensationType (Spec 5019).
    const salaryBands = candidates.filter(
      (c) =>
        (c.compensationType ?? null) ===
        (salaryComponent.compensationType ?? null),
    );

    return aggregateCompensation(
      salaryBands.map((c) => ({
        minAmount: c.minValue,
        maxAmount: c.maxValue,
        currency: c.currencyCode ?? 'USD',
        interval: this.resolveInterval(c.interval),
      })),
    );
  }

  private resolveInterval(raw: string | null | undefined) {
    if (!raw) return null;
    return getCompensationInterval(raw);
  }
}
