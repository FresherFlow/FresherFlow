
// WIP: OData access varies per company config. HTML fallback may need selector updates.
import * as cheerio from 'cheerio';
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  LocationDto,
  Site,
} from '../../../base/models/index.js';
import {
  createHttpClient,
  randomSleep,
  htmlToPlainText,
  extractEmails,
} from '../../../common/index.js';
import {
  SF_HEADERS,
  SF_PAGE_SIZE,
  SF_DELAY_MIN,
  SF_DELAY_MAX,
  parseSfSlug,
  buildSfODataUrl,
  buildSfCareerUrl,
} from './successfactors.constants';
import { SfJobPosting, SfODataResponse } from './successfactors.types';

export class SuccessFactorsService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      console.warn('No companySlug provided for SuccessFactors scraper');
      return new JobResponseDto([]);
    }

    const { instance, companyId } = parseSfSlug(companySlug);
    const resultsWanted = input.resultsWanted ?? 100;

    // Try OData API first
    const odataJobs = await this.scrapeOData(input, instance, companyId, resultsWanted);
    if (odataJobs.length > 0) {
      console.log(`SuccessFactors OData returned ${odataJobs.length} jobs for ${instance}`);
      return new JobResponseDto(odataJobs);
    }

    // Fallback to HTML scraping if OData returned nothing
    console.log('SuccessFactors: OData returned zero results, falling back to HTML scraping');
    const htmlJobs = await this.scrapeHtml(input, instance, companyId, resultsWanted);
    return new JobResponseDto(htmlJobs);
  }

  private async scrapeOData(
    input: ScraperInputDto,
    instance: string,
    companyId: string,
    resultsWanted: number,
  ): Promise<JobPostDto[]> {
    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(SF_HEADERS);

    const baseUrl = buildSfODataUrl(instance);
    const jobPosts: JobPostDto[] = [];
    let offset = 0;

    try {
      console.log(`Fetching SuccessFactors OData jobs for ${instance} (company: ${companyId})`);

      while (jobPosts.length < resultsWanted) {
        const params = new URLSearchParams({
          $select:
            'jobReqId,jobTitle,jobDescription,locationObj,department,postingStartDate,jobType,employmentType,companyName,externalJobUrl',
          $top: String(SF_PAGE_SIZE),
          $skip: String(offset),
          $orderby: 'postingStartDate desc',
          $inlinecount: 'allpages',
          $format: 'json',
        });

        const url = `${baseUrl}?${params.toString()}`;
        const response = await client.get<any>(url);
        const data: SfODataResponse = response.data ?? {};
        const listings = data.d?.results ?? [];

        if (listings.length === 0) break;

        const totalCount = data.d?.__count ? parseInt(data.d.__count, 10) : undefined;
        console.log(
          `SuccessFactors: fetched ${listings.length} jobs at offset ${offset} for ${instance}` +
            `${totalCount ? ` (total: ${totalCount})` : ''}`,
        );

        for (const listing of listings) {
          if (jobPosts.length >= resultsWanted) break;

          try {
            const post = this.processODataListing(listing, instance, companyId);
            if (post) {
              jobPosts.push(post);
            }
          } catch (err: any) {
            console.warn(`Error processing SuccessFactors OData listing: ${err.message}`);
          }
        }

        offset += listings.length;

        // If we got less than page size, no more results
        if (listings.length < SF_PAGE_SIZE) break;

        // Respect rate limiting
        await randomSleep(SF_DELAY_MIN, SF_DELAY_MAX);
      }

      console.log(`SuccessFactors OData total: ${jobPosts.length} jobs for ${instance}`);
    } catch (err: any) {
      console.warn(`SuccessFactors OData request failed for ${instance}: ${err.message}`);
    }

    return jobPosts;
  }

  private async scrapeHtml(
    input: ScraperInputDto,
    instance: string,
    companyId: string,
    resultsWanted: number,
  ): Promise<JobPostDto[]> {
    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(SF_HEADERS);

    try {
      const careerUrl = buildSfCareerUrl(
        instance,
        companyId,
        input.searchTerm ?? undefined,
      );

      console.log(`SuccessFactors HTML: fetching ${careerUrl}`);
      const response = await client.get<any>(careerUrl);
      const html = typeof response.data === 'string' ? response.data : '';

      const jobs = this.parseHtml(html, instance, companyId);

      if (jobs.length === 0) {
        console.warn(
          'SuccessFactors HTML: zero jobs extracted -- selectors may need updating',
        );
      }

      console.log(`SuccessFactors HTML: extracted ${jobs.length} jobs for ${instance}`);
      return jobs.slice(0, resultsWanted);
    } catch (err: any) {
      console.error(`SuccessFactors HTML scrape failed for ${instance}: ${err.message}`);
      return [];
    }
  }

  private processODataListing(
    listing: SfJobPosting,
    instance: string,
    companyId: string,
  ): JobPostDto | null {
    const title = listing.jobTitle ?? listing.formattedJobTitle;
    if (!title) return null;

    const jobReqId = listing.jobReqId ?? null;

    // Build job URL
    const jobUrl = listing.externalJobUrl
      ? listing.externalJobUrl
      : `https://${instance}.successfactors.com/career?company=${encodeURIComponent(companyId)}&jobId=${encodeURIComponent(jobReqId ?? '')}`;

    // Build location from locationObj
    const locObj = listing.locationObj;
    const locationParts: string[] = [];
    if (locObj?.city) locationParts.push(locObj.city);
    if (locObj?.state) locationParts.push(locObj.state);
    if (locObj?.country) locationParts.push(locObj.country);
    const locationStr = locationParts.length > 0 ? locationParts.join(', ') : null;

    const location = locationStr
      ? new LocationDto({ city: locObj?.city ?? locationStr, state: locObj?.state, country: locObj?.country })
      : null;

    // Remote detection
    const isRemote = locationStr?.toLowerCase().includes('remote') ?? false;

    // Date from postingStartDate
    const rawDate = listing.postingStartDate ?? null;
    const datePosted = rawDate
      ? (() => {
          try {
            return new Date(rawDate).toISOString().split('T')[0];
          } catch {
            return rawDate;
          }
        })()
      : null;

    return new JobPostDto({
      id: `sf-${instance}-${jobReqId ?? title.replace(/\s+/g, '-').toLowerCase()}`,
      title,
      companyName: listing.companyName ?? companyId,
      jobUrl,
      location,
      datePosted,
      isRemote,
      site: Site.SUCCESSFACTORS,
      // ATS-specific fields
      atsId: jobReqId,
      atsType: 'successfactors',
      department: listing.department ?? null,
      employmentType: listing.employmentType ?? null,
    });
  }

  private parseHtml(
    html: string,
    instance: string,
    companyId: string,
  ): JobPostDto[] {
    const $ = cheerio.load(html);
    const jobs: JobPostDto[] = [];

    // SuccessFactors layouts vary per company; try multiple selectors
    const selectors = [
      '.jobResultItem',
      '.job-result',
      '[data-job-id]',
      'tr.jobRow',
    ];

    let cards: cheerio.Cheerio<any> | null = null;
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 0) {
        cards = found;
        break;
      }
    }

    if (!cards || cards.length === 0) {
      return [];
    }

    cards.each((_, el) => {
      try {
        const card = $(el);

        // Extract title from link or heading
        const titleEl = card
          .find('a.jobTitle, h2 a, h3 a, a[href*="jobId"], a[href*="job"]')
          .first();
        const title =
          titleEl.text().trim() || card.find('a').first().text().trim();
        if (!title) return;

        // Extract URL
        let href =
          titleEl.attr('href') ?? card.find('a').first().attr('href') ?? '';
        if (href && !href.startsWith('http')) {
          href = `https://${instance}.successfactors.com${href}`;
        }

        // Extract job ID from URL or data attribute
        const dataJobId = card.attr('data-job-id') ?? null;
        const urlIdMatch = href.match(/jobId=([^&]+)/);
        const jobReqId = dataJobId ?? urlIdMatch?.[1] ?? null;

        const id = jobReqId
          ? `sf-${instance}-${jobReqId}`
          : `sf-${instance}-${Math.abs(this.hashCode(href || title))}`;

        // Extract location
        const locationStr =
          card.find('.jobLocation, .location, [class*="location"]').text().trim() || null;
        const location = locationStr
          ? new LocationDto({ city: locationStr })
          : null;

        const isRemote =
          locationStr?.toLowerCase().includes('remote') ?? false;

        // Extract date
        const dateStr =
          card.find('.jobDate, .date, [class*="date"]').text().trim() || null;
        const datePosted = dateStr
          ? (() => {
              try {
                return new Date(dateStr).toISOString().split('T')[0];
              } catch {
                return dateStr;
              }
            })()
          : null;

        jobs.push(
          new JobPostDto({
            id,
            title,
            companyName: companyId,
            jobUrl: href || '',
            location,
            datePosted,
            isRemote,
            site: Site.SUCCESSFACTORS,
            atsId: jobReqId,
            atsType: 'successfactors',
          }),
        );
      } catch (err: any) {
        // Skip individual card parse errors
      }
    });

    return jobs;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }
}
