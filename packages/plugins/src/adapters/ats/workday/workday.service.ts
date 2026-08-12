
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  LocationDto,
  CompensationDto,
  Site,
  DescriptionFormat,
} from '../../../base/models/index.js';
import {
  createHttpClient,
  htmlToPlainText,
  markdownConverter,
  extractEmails,
  parseLocationList,
  regionNameFromCode,
  randomSleep,
  salaryToCompensation,
} from '../../../common/index.js';
import {
  WORKDAY_HEADERS,
  WORKDAY_PAGE_SIZE,
  WORKDAY_DETAIL_CONCURRENCY,
  parseWorkdaySlug,
  buildWorkdayUrl,
  buildWorkdayDetailUrl,
  parseWorkdayPostedOn,
} from './workday.constants';
import {
  WorkdayJobDetail,
  WorkdayJobListItem,
  WorkdaySearchResponse,
} from './workday.types';

export class WorkdayService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      console.warn('No companySlug provided for Workday scraper');
      return new JobResponseDto([]);
    }

    const { company, wdNumber, site } = parseWorkdaySlug(companySlug);
    const apiUrl = buildWorkdayUrl(company, wdNumber, site);

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(WORKDAY_HEADERS);

    const resultsWanted = input.resultsWanted ?? 100;
    const listingsToEnrich: WorkdayJobListItem[] = [];
    let offset = 0;

    try {
      console.log(`Fetching Workday jobs for ${company} (wd${wdNumber}/${site})`);

      while (listingsToEnrich.length < resultsWanted) {
        const payload = {
          appliedFacets: {},
          limit: WORKDAY_PAGE_SIZE,
          offset,
          searchText: '',
        };

        const response = await client.post(apiUrl, payload);
        const data: WorkdaySearchResponse = response.data ?? {};
        const listings = data.jobPostings ?? [];

        if (listings.length === 0) break;

        console.log(
          `Workday: fetched ${listings.length} jobs at offset ${offset} for ${company}` +
          `${data.total ? ` (total: ${data.total})` : ''}`,
        );

        for (const listing of listings) {
          if (listingsToEnrich.length >= resultsWanted) break;
          listingsToEnrich.push(listing);
        }

        offset += listings.length;

        // If we got less than page size, no more results
        if (listings.length < WORKDAY_PAGE_SIZE) break;

        // Respect rate limiting
        await randomSleep(1000, 2000);
      }

    } catch (err: any) {
      console.error(`Workday scrape error for ${company}: ${err.message}`);
    }

    return this.buildResponse(
      client,
      listingsToEnrich,
      company,
      wdNumber,
      site,
      input.descriptionFormat,
    );
  }

  private async buildResponse(
    client: ReturnType<typeof createHttpClient>,
    listings: WorkdayJobListItem[],
    company: string,
    wdNumber: string,
    site: string,
    format?: DescriptionFormat,
  ): Promise<JobResponseDto> {
    const details = await this.fetchDetails(client, listings, company, wdNumber, site);
    const jobPosts = listings
      .map((listing, index) => {
        try {
          return this.processListing(
            listing,
            details[index] ?? null,
            company,
            wdNumber,
            site,
            format,
          );
        } catch (err: any) {
          console.warn(`Error processing Workday listing: ${err.message}`);
          return null;
        }
      })
      .filter((post): post is JobPostDto => post !== null);

    console.log(`Workday total: ${jobPosts.length} jobs for ${company}`);
    return new JobResponseDto(jobPosts);
  }

  private async fetchDetails(
    client: ReturnType<typeof createHttpClient>,
    listings: WorkdayJobListItem[],
    company: string,
    wdNumber: string,
    site: string,
  ): Promise<Array<WorkdayJobDetail | null>> {
    const details: Array<WorkdayJobDetail | null> = [];

    for (let index = 0; index < listings.length; index += WORKDAY_DETAIL_CONCURRENCY) {
      const batch = listings.slice(index, index + WORKDAY_DETAIL_CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map(async (listing): Promise<WorkdayJobDetail | null> => {
          if (!listing.externalPath) return null;
          const url = buildWorkdayDetailUrl(company, wdNumber, site, listing.externalPath);
          const response = await client.get(url);
          return (response.data as WorkdayJobDetail | undefined) ?? null;
        }),
      );

      settled.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled') {
          details.push(result.value);
          return;
        }
        const listing = batch[batchIndex];
        console.warn(
          `Workday detail failed for ${listing.externalPath ?? listing.title ?? 'unknown job'}: ${result.reason?.message ?? result.reason}`,
        );
        details.push(null);
      });
    }

    return details;
  }

  private processListing(
    listing: WorkdayJobListItem,
    detail: WorkdayJobDetail | null,
    company: string,
    wdNumber: string,
    site: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = listing.title;
    if (!title) return null;
    const info = detail?.jobPostingInfo;
    const hiringOrganizationName = detail?.hiringOrganization?.name?.trim();

    // Extract subtitle info (often contains category/department, or company name)
    const subtitleTexts = listing.subtitles
      ?.flatMap((sub) => sub.instances?.map((i) => i.text) ?? [])
      .filter((t): t is string => Boolean(t?.trim())) ?? [];

    const bulletTexts = (listing.bulletFields ?? [])
      .filter((t): t is string => Boolean(t?.trim()));

    // Prefer hiringOrganizationName from detail API, then try list item's subtitles/bulletFields,
    // before falling back to the raw company slug.
    let companyName = hiringOrganizationName;
    if (!companyName) {
      const candidate = subtitleTexts.find((text) =>
        text &&
        !/^\d+[\s\w]*$/i.test(text) &&
        !/posted|ago|full-time|part-time|contract|remote|hybrid/i.test(text)
      ) || bulletTexts.find((text) =>
        text &&
        !/^\d+[\s\w]*$/i.test(text) &&
        !/posted|ago|full-time|part-time|contract|remote|hybrid/i.test(text)
      );
      companyName = candidate || company;
    }

    // Extract job path for URL construction
    const externalPath = listing.externalPath ?? '';
    const summaryJobUrl = externalPath
      ? `https://${company}.wd${wdNumber}.myworkdayjobs.com${externalPath.startsWith('/') ? '' : '/'}${externalPath}`
      : `https://${company}.wd${wdNumber}.myworkdayjobs.com/en-US/${site}/details/${encodeURIComponent(title)}`;
    const jobUrl = info?.externalUrl ?? summaryJobUrl;

    const description = this.formatDescription(info?.jobDescription, format);

    // Location: route every label (primary + additional + summary) through the
    // shared parser so multi-location postings are split, then fold in the
    // requisition's ISO-2 country code when the US-only parser left it bare.
    // `locationsText` is sometimes a bare "N Locations" count rather than a
    // place; drop it so the parser doesn't treat the count as a location.
    const summaryText = listing.locationsText?.trim();
    const locationLabels = [
      info?.location,
      ...(info?.additionalLocations ?? []),
      summaryText && !/^\d+\s+locations?$/i.test(summaryText) ? summaryText : null,
    ];
    const parsedLocations = parseLocationList(locationLabels);
    const location = this.applyCountry(
      parsedLocations.location,
      info?.jobRequisitionLocation?.country?.alpha2Code,
    );

    // Remote detection: Workday's remoteType enum, plus the parsed labels.
    const remoteType = [info?.remoteType, listing.remoteType]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const isRemote =
      remoteType.includes('remote') || parsedLocations.remoteMentioned;

    // workFromHomeType: prefer Workday's structured remoteType, else parsed labels.
    const workFromHomeType =
      this.workFromHomeTypeFromRemoteType(info?.remoteType ?? listing.remoteType) ??
      parsedLocations.workFromHomeType;

    // Date: prefer the absolute startDate (drift-free), fall back to the
    // relative postedOn label. Both go through the validated ISO/relative parser.
    const datePosted =
      parseWorkdayPostedOn(info?.startDate) ??
      parseWorkdayPostedOn(info?.postedOn ?? listing.postedOn);

    // Compensation: Workday CXS has no structured pay field; recover the
    // pay-transparency range from the description body text.
    const compensation = this.extractCompensationFromText(info?.jobDescription);

    // Extract job ID from externalPath (e.g., "/job/123456")
    const jobIdMatch = externalPath.match(/\/(\d+)(?:\/|$)/);
    const atsId = info?.jobReqId ?? jobIdMatch?.[1] ?? (externalPath || null);

    return new JobPostDto({
      id: `wd-${company}-${atsId ?? title.replace(/\s+/g, '-').toLowerCase()}`,
      title,
      companyName,
      jobUrl,
      location,
      description,
      compensation,
      datePosted,
      emails: extractEmails(description),
      isRemote,
      ...(workFromHomeType ? { workFromHomeType } : {}),
      site: Site.WORKDAY,
      // ATS-specific fields
      atsId,
      atsType: 'workday',
      department: info?.jobFamily?.[0]?.name ?? subtitleTexts[0] ?? null,
      employmentType: info?.timeType ?? info?.workerSubType ?? null,
    });
  }

  private formatDescription(
    html?: string | null,
    format?: DescriptionFormat,
  ): string | null {
    if (!html?.trim()) return null;
    if (format === DescriptionFormat.HTML) return html;
    if (format === DescriptionFormat.MARKDOWN) return markdownConverter(html);
    return htmlToPlainText(html);
  }

  /**
   * Fold the requisition's ISO-2 country code into the parsed location when the
   * (US-only) parser did not already derive a country. Uses the runtime CLDR
   * table via `regionNameFromCode`, mirroring the Lever/Greenhouse passes.
   */
  private applyCountry(
    location: LocationDto | null,
    countryCode: string | null | undefined,
  ): LocationDto | null {
    const country = regionNameFromCode(countryCode);
    if (!country) return location;
    if (!location) return new LocationDto({ country });
    if (location.country) return location;
    return new LocationDto({ ...location, country });
  }

  /**
   * Map Workday's free-text `remoteType` ("Hybrid", "Fully Remote",
   * "Remote Eligible", "Field/Customer Site") to a work-from-home label.
   * On-site values (e.g. "Field/Customer Site") resolve to null.
   */
  private workFromHomeTypeFromRemoteType(
    remoteType: string | null | undefined,
  ): string | null {
    const value = remoteType?.toLowerCase() ?? '';
    if (value.includes('hybrid')) return 'Hybrid';
    if (value.includes('remote')) return 'Remote';
    return null;
  }

  /**
   * Workday CXS exposes no structured pay field, so recover a pay-transparency
   * salary range from the description body text via the shared `extractSalary`,
   * honoring the real interval (yearly/hourly) rather than coercing.
   */
  private extractCompensationFromText(
    html?: string | null,
  ): CompensationDto | null {
    const text = html?.trim() ? htmlToPlainText(html) : null;
    return salaryToCompensation(text);
  }
}
