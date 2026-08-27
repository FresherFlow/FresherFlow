
// WIP: iCIMS layouts vary significantly per company. Selectors may need updating.
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
} from '../../../common/index.js';
import { BrowserPool } from '../../../common/index.js';
import {
  ICIMS_HEADERS,
  ICIMS_PAGE_SIZE,
  ICIMS_DELAY_MIN,
  ICIMS_DELAY_MAX,
  buildIcimsSearchUrl,
  buildIcimsGatewayUrl,
} from './icims.constants.js';
import {
  IcimsJobListItem,
  IcimsGatewayResponse,
} from './icims.types.js';

export class IcimsService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const company = input.companySlug;
    if (!company) {
      console.warn('No companySlug provided for iCIMS scraper');
      return new JobResponseDto([]);
    }

    const resultsWanted = input.resultsWanted ?? 100;

    // Try the gateway JSON endpoint first
    const gatewayJobs = await this.scrapeGateway(input, company, resultsWanted);
    if (gatewayJobs.length > 0) {
      console.log(`iCIMS gateway returned ${gatewayJobs.length} jobs for ${company}`);
      return new JobResponseDto(gatewayJobs);
    }

    // Fallback to Playwright if gateway returned nothing
    console.log('iCIMS: gateway returned zero results, falling back to Playwright');
    const playwrightJobs = await this.scrapeWithPlaywright(input, company, resultsWanted);
    return new JobResponseDto(playwrightJobs);
  }

  private async scrapeGateway(
    input: ScraperInputDto,
    company: string,
    resultsWanted: number,
  ): Promise<JobPostDto[]> {
    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(ICIMS_HEADERS);

    const allJobs: JobPostDto[] = [];
    let offset = 0;

    try {
      while (allJobs.length < resultsWanted) {
        const url = buildIcimsGatewayUrl(company, offset);
        console.log(`Fetching iCIMS gateway offset=${offset} for ${company}`);

        const response = await client.get<any>(url);
        const data: IcimsGatewayResponse = response.data ?? {};

        const parsed = this.parseGatewayResponse(data, company);
        if (parsed.length === 0) break;

        allJobs.push(...parsed);
        offset += ICIMS_PAGE_SIZE;

        // If we got less than page size, no more results
        if (parsed.length < ICIMS_PAGE_SIZE) break;

        await randomSleep(ICIMS_DELAY_MIN, ICIMS_DELAY_MAX);
      }
    } catch (err: any) {
      console.warn(`iCIMS gateway request failed for ${company}: ${err.message}`);
    }

    return allJobs.slice(0, resultsWanted);
  }

  private async scrapeWithPlaywright(
    input: ScraperInputDto,
    company: string,
    resultsWanted: number,
  ): Promise<JobPostDto[]> {
    const proxy = input.proxies?.[0] ?? undefined;
    let page;

    try {
      page = await BrowserPool.getPage({ proxy, stealth: true });
      const timeoutMs = (input.requestTimeout ?? 30) * 1000;

      const url = buildIcimsSearchUrl(
        company,
        input.searchTerm ?? undefined,
        input.location ?? undefined,
      );

      console.log(`iCIMS Playwright: navigating to ${url}`);
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs,
      });

      // Wait for JS hydration (iCIMS is a JS-rendered SPA)
      await this.delay(5000);

      const html = await page.content();
      const jobs = this.parseHtml(html, company);

      if (jobs.length === 0) {
        // TODO: Validate selectors against live iCIMS rendered DOM
        console.warn('iCIMS Playwright: zero jobs extracted � selectors may need updating');
      }

      console.log(`iCIMS Playwright: extracted ${jobs.length} jobs for ${company}`);
      return jobs.slice(0, resultsWanted);
    } catch (err: any) {
      console.error(`iCIMS Playwright scrape failed for ${company}: ${err.message}`);
      return [];
    } finally {
      if (page) {
        const context = page.context();
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    }
  }

  private parseGatewayResponse(
    data: IcimsGatewayResponse,
    company: string,
  ): JobPostDto[] {
    const listings = data.jobs ?? [];
    const jobs: JobPostDto[] = [];

    for (const listing of listings) {
      try {
        const title = listing.title;
        if (!title) continue;

        const jobId = listing.id ?? null;
        const id = jobId
          ? `icims-${company}-${jobId}`
          : `icims-${company}-${Math.abs(this.hashCode(title))}`;

        let jobUrl = listing.url ?? '';
        if (jobUrl && !jobUrl.startsWith('http')) {
          jobUrl = `https://${company}.icims.com${jobUrl}`;
        }
        if (!jobUrl && jobId) {
          jobUrl = `https://${company}.icims.com/jobs/${jobId}/job`;
        }

        const locationStr = listing.location ?? null;
        const location = locationStr
          ? new LocationDto({ city: locationStr })
          : null;

        const isRemote =
          locationStr?.toLowerCase().includes('remote') ?? false;

        const datePosted = listing.datePosted ?? null;

        jobs.push(
          new JobPostDto({
            id,
            title,
            companyName: company,
            jobUrl,
            location,
            datePosted,
            isRemote,
            site: Site.ICIMS,
            atsId: jobId,
            atsType: 'icims',
            department: listing.category ?? null,
          }),
        );
      } catch (err: any) {
        // Skip individual listing parse errors
      }
    }

    return jobs;
  }

  private parseHtml(html: string, company: string): JobPostDto[] {
    const $ = cheerio.load(html);
    const jobs: JobPostDto[] = [];

    // iCIMS layouts vary per company; try multiple selectors
    const selectors = [
      '.iCIMS_JobsTable .row',
      '.listingTable tr',
      '[data-job-id]',
      '.iCIMS_MainContainer .listItem',
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
          .find('a.iCIMS_Anchor, .iCIMS_JobTitle a, h2 a, h3 a, a[href*="/jobs/"]')
          .first();
        const title =
          titleEl.text().trim() || card.find('a').first().text().trim();
        if (!title) return;

        // Extract URL
        let href =
          titleEl.attr('href') ?? card.find('a').first().attr('href') ?? '';
        if (href && !href.startsWith('http')) {
          href = `https://${company}.icims.com${href}`;
        }

        // Extract job ID from URL or data attribute
        const dataJobId = card.attr('data-job-id') ?? null;
        const urlIdMatch = href.match(/\/jobs\/(\d+)\//);
        const jobId = dataJobId ?? urlIdMatch?.[1] ?? null;

        const id = jobId
          ? `icims-${company}-${jobId}`
          : `icims-${company}-${Math.abs(this.hashCode(href || title))}`;

        // Extract location
        const locationStr =
          card.find('.iCIMS_JobLocation, .jobLocation, [class*="location"]').text().trim() || null;
        const location = locationStr
          ? new LocationDto({ city: locationStr })
          : null;

        const isRemote =
          locationStr?.toLowerCase().includes('remote') ?? false;

        // Extract category / department
        const category =
          card.find('.iCIMS_JobCategory, .jobCategory, [class*="category"]').text().trim() || null;

        jobs.push(
          new JobPostDto({
            id,
            title,
            companyName: company,
            jobUrl: href || '',
            location,
            isRemote,
            site: Site.ICIMS,
            atsId: jobId,
            atsType: 'icims',
            department: category,
          }),
        );
      } catch (err: any) {
        // Skip individual card parse errors
      }
    });

    return jobs;
  }

  async onModuleDestroy(): Promise<void> {
    await BrowserPool.close();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
