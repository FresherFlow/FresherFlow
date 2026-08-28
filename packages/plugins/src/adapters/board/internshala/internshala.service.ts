
import * as cheerio from 'cheerio';
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto,
  LocationDto, DescriptionFormat, Site, JobType, CompensationDto, CompensationInterval,
} from '../../../base/models/index.js';
import {
  HttpClient, createHttpClient, markdownConverter, plainConverter, randomSleep, extractEmails,
} from '../../../common/index.js';

/** Internshala base URLs and selectors */
const INTERNSHALA_BASE = 'https://internshala.com';
const INTERNSHALA_JOBS_URL = `${INTERNSHALA_BASE}/fresher-jobs`;
const INTERNSHALA_INTERNSHIPS_URL = `${INTERNSHALA_BASE}/internships`;

const INTERNSHALA_HEADERS: Record<string, string> = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export class InternshalaService implements IScraper {
  
  private readonly delay = 2;
  private readonly bandDelay = 3;

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
      rateDelayMin: input.rateDelayMin,
      rateDelayMax: input.rateDelayMax,
    });
    client.setHeaders(INTERNSHALA_HEADERS);

    const jobList: JobPostDto[] = [];
    const resultsWanted = input.resultsWanted ?? 15;
    const searchTerm = input.searchTerm ?? '';
    let page = 1;

    // Browse mode: when no search term is provided, scrape the main listing
    // pages (/fresher-jobs and /internships) which carry ~100 discrete postings
    // per page — a far higher yield than keyword-scoped pages.
    const browseMode = searchTerm.trim().length === 0;
    console.log(`Scraping Internshala for: "${searchTerm || 'ALL (browse mode)'}"`);

    // Deduplicate by job URL: listing pages can surface the same posting more
    // than once (e.g. a "similar internships" block next to the main card).
    const seenUrls = new Set<string>();

    try {
      while (jobList.length < resultsWanted) {
        const url = this.buildSearchUrl(searchTerm, input, page);
        console.log(`Fetching page ${page}: ${url}`);

        const resp = await client.get(url);
        const $ = cheerio.load(resp.data);

        // Find job/internship listing cards
        const cards = $('.individual_internship, .individual_job, .job-listing-card').toArray();

        if (cards.length === 0) {
          console.log(`No more results found on page ${page}`);
          break;
        }

        for (const card of cards) {
          if (jobList.length >= resultsWanted) break;

          const job = this.parseJobCard($, card, input.descriptionFormat);
          if (!job) continue;
          if (seenUrls.has(job.jobUrl)) continue; // skip duplicate posting
          seenUrls.add(job.jobUrl);
          jobList.push(job);
        }

        page++;
        await randomSleep(this.delay * 1000, (this.delay + this.bandDelay) * 1000);
      }
    } catch (err: any) {
      console.error(`Internshala scrape error: ${err.message}`);
    }

    // Listing cards never carry the real job description (only stipend/duration/
    // apply-by snippets) � fetch each job's own detail page for the full body.
    // Detail pages also carry the structured salary for fresher jobs (their
    // listing cards omit it) — prefer the detail-page compensation.
    for (const job of jobList) {
      try {
        const detail = await this.fetchJobDetail(client, job.jobUrl, input.descriptionFormat);
        if (detail) {
          if (detail.description) {
            job.description = job.description ? `${detail.description}\n\n${job.description}` : detail.description;
            job.emails = extractEmails(job.description) ?? job.emails;
          }
          job.compensation = detail.compensation ?? job.compensation;
        }
      } catch (err: any) {
        console.warn(`Error fetching description for ${job.jobUrl}: ${err.message}`);
      }
      await randomSleep(this.delay * 1000, (this.delay + this.bandDelay) * 1000);
    }

    console.log(`Internshala: found ${jobList.length} jobs/internships`);
    return new JobResponseDto(jobList);
  }

  private async fetchJobDetail(
    client: HttpClient,
    jobUrl: string,
    format?: DescriptionFormat,
  ): Promise<{ description: string | null; compensation: CompensationDto | null }> {
    const resp = await client.get(jobUrl);
    const $ = cheerio.load(resp.data);

    let description: string | null = null;
    const el = $('.internship_details .text-container, .detail_view').first();
    if (el.length) {
      const html = el.html() ?? '';
      if (format === DescriptionFormat.PLAIN) {
        description = plainConverter(html);
      } else {
        description = markdownConverter(html);
      }
    }

    return {
      description,
      compensation: this.parseDetailCompensation($),
    };
  }

  private buildSearchUrl(searchTerm: string, input: ScraperInputDto, page: number): string {
    // Internshala URL patterns:
    //   Browse (all):     /fresher-jobs  or  /internships   (paginated: /page-2)
    //   Fresher jobs:     /fresher-jobs/<keyword>-fresher-job-in-<location>/page-N
    //   Internships:      /internships/<keyword>-internship-in-<location>/page-N
    const isInternship = input.jobType === JobType.INTERNSHIP || (input.jobType as any) === 'internship';
    const baseUrl = isInternship ? INTERNSHALA_INTERNSHIPS_URL : INTERNSHALA_JOBS_URL;

    const slug = searchTerm.toLowerCase().replace(/\s+/g, '-');

    // Browse mode: no keyword, just the main listing page + pagination.
    // Note: we deliberately do NOT append a location suffix here — the main
    // listings are India-focused already, Internshala returns a 404 for some
    // `-in-<location>` variants on the internship side, and the downstream
    // verifier filters out any non-India/remote postings.
    if (!slug) {
      if (page > 1) {
        return `${baseUrl}/page-${page}`;
      }
      return baseUrl;
    }

    const typeSuffix = isInternship ? 'internship' : 'fresher-job';

    // e.g. /fresher-jobs/software-developer-fresher-job  or  /internships/python-internship
    let url = slug ? `${baseUrl}/${slug}-${typeSuffix}` : baseUrl;

    // Add location: -in-india
    if (input.location) {
      const locationSlug = input.location.toLowerCase().replace(/\s+/g, '-');
      url += `-in-${locationSlug}`;
    }

    // Add remote/WFH filter
    if (input.isRemote) {
      url += '/work-from-home';
    }

    // Add page
    if (page > 1) {
      url += `/page-${page}`;
    }

    return url;
  }

  private parseJobCard($: cheerio.CheerioAPI, card: any, format?: DescriptionFormat): JobPostDto | null {
    const $card = $(card);

    // Extract title
    const title = $card.find('.job-title-href, .profile, h3 a, .heading_4_5').first().text().trim()
      || $card.find('a').first().text().trim();
    if (!title) return null;

    // Extract company. `.company-name` (the inner <p>) holds just the clean name;
    // the wrapping `.company_name` div also matches an "Actively hiring" badge
    // as a child, so it must only be a fallback, never tried first.
    let companyEl = $card.find('.company-name').first();
    if (!companyEl.length) companyEl = $card.find('.company_name, .link_display_like_text').first();
    companyEl.find('.actively-hiring-badge').remove();
    const companyName = companyEl.text().trim() || $card.find('p.company-name a').text().trim();

    // Extract URL
    let jobUrl = $card.find('a.job-title-href, a.view_detail_button, h3 a, a').first().attr('href') ?? '';
    if (jobUrl && !jobUrl.startsWith('http')) {
      jobUrl = `${INTERNSHALA_BASE}${jobUrl.startsWith('/') ? '' : '/'}${jobUrl}`;
    }

    // Generate stable ID from URL
    const urlHash = Math.abs(this.hashCode(jobUrl)).toString();
    const id = `is-${urlHash}`;

    // Extract location
    const locationText = ($card.find('.location_link, .individual_location_name, .ic-16-map-marker + span, #location_names span').first().text().trim()
      || $card.find('.locations').text().trim()).replace(/\s+/g, ' ').trim();

    const location = new LocationDto({
      city: locationText || undefined,
      country: 'India',
    });

    // Check if remote/WFH
    const cardText = $card.text().toLowerCase();
    const isRemote = cardText.includes('work from home') || cardText.includes('wfh');

    // Extract stipend/salary
    const stipendText = $card.find('.stipend, .salary, .ic-16-money + span').text().trim();

    // Extract duration (internship-specific)
    const durationText = $card.find('.ic-16-calendar + span, .duration').text().trim();

    // Extract date posted / apply by
    const applyByText = $card.find('.apply_by .item_body, .ic-16-clock + span').text().trim();

    // Build description snippet
    let description: string | null = null;
    const descSnippet = $card.find('.job-description-text, .detail_view').text().trim();
    if (descSnippet) {
      const descHtml = $card.find('.job-description-text, .detail_view').html() ?? descSnippet;
      if (format === DescriptionFormat.PLAIN) {
        description = plainConverter(descHtml);
      } else {
        description = markdownConverter(descHtml);
      }
    }

    // Extract emails
    const emails = extractEmails(description) ?? extractEmails($card.text());

    // Extra info line for internship details
    const extras: string[] = [];
    if (stipendText) extras.push(`Stipend: ${stipendText}`);
    if (durationText) extras.push(`Duration: ${durationText}`);
    if (applyByText) extras.push(`Apply by: ${applyByText}`);

    if (extras.length > 0 && description) {
      description += '\n\n' + extras.join(' | ');
    } else if (extras.length > 0) {
      description = extras.join(' | ');
    }

    return new JobPostDto({
      id,
      title,
      companyName: companyName || undefined,
      jobUrl: jobUrl || `${INTERNSHALA_BASE}/jobs`,
      location,
      description,
      isRemote,
      emails,
      workFromHomeType: isRemote ? 'Remote' : undefined,
      compensation: this.parseCompensation(stipendText),
      site: Site.INTERNSHALA,
    });
  }

  /**
   * Parse a structured compensation from a job detail page.
   *
   * Internship detail pages carry `<span class="stipend">₹ 8,000 - 12,000 /month</span>`;
   * fresher-job detail pages carry structured salary text in the body, e.g.
   * "Annual CTC: ₹ 5,00,000 - 12,00,000 /year", "Fixed pay: ₹ 4 LPA - 7 LPA".
   * Better-marked text nodes are tried first, so incidental figures ("₹ 2 lakh
   * worth of stock", ...) are only consulted when no explicit salary line exists.
   */
  private parseDetailCompensation($: cheerio.CheerioAPI): CompensationDto | null {
    const stipendText = $('.internship_details .stipend, .detail_view .stipend').first().text().trim()
      || $('.stipend').first().text().trim();
    const fromStipend = this.parseCompensation(stipendText);
    if (fromStipend) return fromStipend;

    const candidates: string[] = [];
    $('p, li, span').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text && text.length <= 300 && /annual ctc|\bctc\b|fixed pay|\bsalary\b|stipend|\blpa\b|lakh|per annum|\/(?:year|annum|yr|pa|month|mo)\b/i.test(text)) {
        candidates.push(text);
      }
    });

    const strength = (t: string): number =>
      (/annual ctc/i.test(t) ? 4 : 0)
      + (/\bctc\b/i.test(t) ? 3 : 0)
      + (/fixed pay/i.test(t) ? 3 : 0)
      + (/\/(?:year|annum|month|mo|yr)\b/i.test(t) ? 3 : 0)
      + (/\blpa\b/i.test(t) ? 2 : 0)
      + (/stipend/i.test(t) ? 2 : 0)
      + (/\bsalary\b/i.test(t) ? 1 : 0)
      + (/\blakh\b/i.test(t) ? 1 : 0);
    candidates.sort((a, b) => strength(b) - strength(a));

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    if (bodyText && /annual ctc|\bctc\b|fixed pay|\bsalary\b|stipend|\blpa\b|lakh|per annum|\/(?:year|annum|yr|pa|month|mo)\b/i.test(bodyText)) {
      candidates.push(bodyText.slice(0, 300));
    }

    for (const candidate of candidates) {
      const comp = this.parseCompensation(candidate);
      if (comp) return comp;
    }
    return null;
  }

  /**
   * Parse an Internshala compensation string into a structured, INR value.
   *
   * Internship cards/detail render monthly amounts ("₹ 10,000 - 15,000 /month");
   * fresher-job cards render annual amounts ("₹ 3 LPA - ₹ 7 LPA"); fresher-job
   * detail pages render a structured annual CTC ("₹ 5,00,000 - 12,00,000 /year").
   */
  private parseCompensation(textIn: string | null | undefined): CompensationDto | null {
    let raw = (textIn ?? '').trim();
    if (!raw) return null;

    // Bound the input before running the value regexes (strict, no nested
    // quantifiers blowup on untrusted long text).
    if (raw.length > 300) raw = raw.slice(0, 300);

    // Normalise the rupee symbol (U+20B9 / \u20b9), NBSP and whitespace.
    const cleaned = raw
      .replace(/[\u20b9₹]/g, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const parseNum = (s: string): number | null => {
      const n = parseFloat(s.replace(/,/g, ''));
      return Number.isFinite(n) ? n : null;
    };

    // Annual, exchange-agnostic rupee figure: "₹ 5,00,000 - 12,00,000 /year"
    const annualRupees = /(\d[\d,.]*)\s*(?:-\s*(\d[\d,.]*))?\s*\/\s*(?:year|annum|yr|pa)/i.exec(cleaned);
    if (annualRupees) {
      const min = parseNum(annualRupees[1]);
      const max = annualRupees[2] ? parseNum(annualRupees[2]) : min;
      if (min === null) return null;
      return new CompensationDto({
        interval: CompensationInterval.YEARLY,
        minAmount: min,
        maxAmount: max ?? min,
        currency: 'INR',
      });
    }

    // Annual LPA: "X LPA", "X - Y LPA", "X LPA - Y LPA", "X LPA"
    if (/\bLakhs?\b|\bLPA\b/i.test(cleaned)) {
      const nums = [...cleaned.matchAll(/(\d[\d.]*)\s*(?:LPA|Lakhs?)\b/gi)]
        .map((match) => parseFloat(match[1]))
        .filter((n) => Number.isFinite(n));
      const min = nums.length > 0 ? nums[0] * 100000 : null;
      const max = nums.length > 1 ? nums[nums.length - 1] * 100000 : min;
      if (min === null) return null;
      return new CompensationDto({
        interval: CompensationInterval.YEARLY,
        minAmount: min,
        maxAmount: max ?? min,
        currency: 'INR',
      });
    }

    // Monthly: "X - Y /month" or "X /month" (also bare "₹ 8,000 - 12,000")
    const monthly = /(\d[\d,.]*)\s*(?:-\s*(\d[\d,.]*))?\s*\/?\s*(?:month|mo)?$/i.exec(cleaned);
    if (monthly) {
      const min = parseNum(monthly[1]);
      const max = monthly[2] ? parseNum(monthly[2]) : min;
      if (min === null) return null;
      return new CompensationDto({
        interval: CompensationInterval.MONTHLY,
        minAmount: min,
        maxAmount: max ?? min,
        currency: 'INR',
      });
    }

    return null;
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
