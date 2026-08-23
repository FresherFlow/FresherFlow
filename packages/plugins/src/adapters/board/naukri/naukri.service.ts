import * as cheerio from 'cheerio';
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto,
  LocationDto, CompensationDto, Country, DescriptionFormat, Site,
  getJobTypeFromString,
} from '../../../base/models/index.js';
import {
  createHttpClient, NaukriException, markdownConverter, extractEmails, randomSleep,
} from '../../../common/index.js';
import { NAUKRI_HEADERS } from './naukri.constants.js';

export class NaukriService implements IScraper {
  private readonly baseUrl = 'https://www.naukri.com/jobapi/v3/search';
  private readonly jobsPerPage = 20;
  private readonly delay = 2;
  private readonly bandDelay = 3;

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(NAUKRI_HEADERS);

    const jobList: JobPostDto[] = [];
    const resultsWanted = input.resultsWanted ?? 15;
    const seenIds = new Set<string>();
    let page = Math.floor((input.offset ?? 0) / this.jobsPerPage) + 1;

    try {
      while (jobList.length < resultsWanted && page <= 50) {
        console.log(`Fetching Naukri jobs, page ${page}`);

        const searchTerm = input.searchTerm ?? '';
        const params: Record<string, any> = {
          noOfResults: this.jobsPerPage,
          urlType: 'search_by_keyword',
          searchType: 'adv',
          keyword: searchTerm,
          pageNo: page,
          k: searchTerm,
          seoKey: `${searchTerm.toLowerCase().replace(/\s+/g, '-')}-jobs`,
          src: 'jobsearchDesk',
          latLong: '',
        };
        if (input.location) params.location = input.location;
        if (input.isRemote) params.remote = 'true';
        if (input.hoursOld) params.days = Math.ceil(input.hoursOld / 24);

        const response = await client.get(this.baseUrl, { params });

        if (response.status < 200 || response.status >= 400) {
          console.warn(`Naukri API status ${response.status}, falling back to public HTML`);
          break;
        }

        const jobDetails = response.data?.jobDetails ?? [];
        if (jobDetails.length === 0) break;

        for (const job of jobDetails) {
          if (jobList.length >= resultsWanted) break;
          const jobId = job.jobId;
          if (!jobId || seenIds.has(jobId)) continue;
          seenIds.add(jobId);

          try {
            const jobPost = this.processJob(job, jobId, input);
            if (jobPost) jobList.push(jobPost);
          } catch (err: any) {
            console.warn(`Naukri process error for ${jobId}: ${err.message}`);
          }
        }

        page++;
        await randomSleep(this.delay * 1000, (this.delay + this.bandDelay) * 1000);
      }
    } catch (err: any) {
      console.warn(`Naukri API error: ${err.message}, attempting HTML scraping fallback...`);
    }

    // If API returned nothing or was blocked (406/403), fallback to public search HTML
    if (jobList.length === 0 && input.searchTerm) {
      const htmlJobs = await this.scrapePublicHtml(input.searchTerm, resultsWanted);
      jobList.push(...htmlJobs);
    }

    return new JobResponseDto(jobList.slice(0, resultsWanted));
  }

  private async scrapePublicHtml(keyword: string, limit: number): Promise<JobPostDto[]> {
    const jobs: JobPostDto[] = [];
    const encodedSlug = keyword.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const searchUrl = `https://www.naukri.com/${encodedSlug}-jobs-in-india?experience=0&sort=1`;

    try {
      const headers = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      };

      const resp = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(15000) });
      if (!resp.ok) return [];

      const html = await resp.text();
      const $ = cheerio.load(html);

      // 1. Check for JSON-LD structured data
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const raw = $(el).html();
          if (!raw) return;
          const data = JSON.parse(raw);
          if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
            for (const item of data.itemListElement) {
              if (jobs.length >= limit) break;
              const jobItem = item.item || item;
              if (jobItem.title && (jobItem.url || jobItem['@id'])) {
                const jobUrl = jobItem.url || jobItem['@id'];
                jobs.push(new JobPostDto({
                  id: `nk-${Math.abs(this.hashCode(jobUrl))}`,
                  title: jobItem.title,
                  companyName: jobItem.hiringOrganization?.name || undefined,
                  location: new LocationDto({ city: jobItem.jobLocation?.address?.addressLocality || 'India', country: Country.INDIA }),
                  jobUrl,
                  description: jobItem.description || `${jobItem.title} opportunity in India`,
                  datePosted: jobItem.datePosted || new Date().toISOString().split('T')[0],
                  isRemote: false,
                  site: Site.NAUKRI,
                }));
              }
            }
          }
        } catch {
          // Continue
        }
      });

      // 2. Regular DOM cards fallback
      $('article.jobTuple, div.srp-jobtuple, div.cust-job-tuple, div[data-job-id], .jobTuple').each((_, el) => {
        if (jobs.length >= limit) return false;
        const card = $(el);
        const title = card.find('a.title, a.job-title').text().trim();
        const jobHref = card.find('a.title, a.job-title').attr('href') || card.attr('data-url') || '';
        const company = card.find('a.comp-name, a.company-name, .comp-name').text().trim();
        const locationStr = card.find('.locWdth, .loc-wrap, .loc, .location').text().trim();
        const exp = card.find('.expwdth, .exp-wrap, .exp').text().trim();
        const desc = card.find('.job-desc, .job-description, .job-desc-ni').text().trim();

        if (title && jobHref) {
          const jobUrl = jobHref.startsWith('http') ? jobHref : `https://www.naukri.com${jobHref}`;
          jobs.push(new JobPostDto({
            id: `nk-${Math.abs(this.hashCode(jobUrl))}`,
            title,
            companyName: company || undefined,
            location: new LocationDto({ city: locationStr || undefined, country: Country.INDIA }),
            jobUrl,
            description: `${desc}\nExperience: ${exp}`,
            datePosted: new Date().toISOString().split('T')[0],
            isRemote: /remote|wfh/i.test(locationStr || ''),
            site: Site.NAUKRI,
          }));
        }
      });
    } catch (err: any) {
      console.warn(`Naukri HTML scraping fallback error: ${err.message}`);
    }

    return jobs;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private processJob(job: any, jobId: string, input: ScraperInputDto): JobPostDto | null {
    const title = job.title ?? 'N/A';
    const company = job.companyName ?? 'N/A';

    // Location
    const location = this.getLocation(job.placeholders ?? []);

    // Compensation (Indian salary format)
    const compensation = this.getCompensation(job.placeholders ?? []);

    // Date
    const datePosted = this.parseDate(job.footerPlaceholderLabel, job.createdDate);

    // URL
    const jobUrl = `https://www.naukri.com${job.jdURL ?? `/job/${jobId}`}`;

    // Description
    let description = job.jobDescription ?? null;
    if (description && input.descriptionFormat === DescriptionFormat.MARKDOWN) {
      description = markdownConverter(description) ?? description;
    }

    // Remote detection
    const remoteKeywords = ['remote', 'work from home', 'wfh'];
    const fullText = `${title} ${description ?? ''} ${location.displayLocation()}`.toLowerCase();
    const isRemote = remoteKeywords.some((kw) => fullText.includes(kw));

    // Work from home type
    const workFromHomeType = this.inferWorkFromHomeType(job.placeholders ?? [], title, description ?? '');

    // Skills
    const skills = job.tagsAndSkills
      ? job.tagsAndSkills.split(',').map((s: string) => s.trim())
      : null;

    return new JobPostDto({
      id: `nk-${jobId}`,
      title,
      companyName: company,
      companyUrl: job.staticUrl ? `https://www.naukri.com/${job.staticUrl}` : null,
      location,
      isRemote,
      datePosted: datePosted?.toISOString().split('T')[0] ?? null,
      jobUrl,
      compensation,
      description,
      emails: extractEmails(description),
      companyLogo: job.logoPathV3 ?? job.logoPath ?? null,
      skills,
      experienceRange: job.experienceText ?? null,
      companyRating: job.ambitionBoxData?.AggregateRating ? parseFloat(job.ambitionBoxData.AggregateRating) : null,
      companyReviewsCount: job.ambitionBoxData?.ReviewsCount ?? null,
      vacancyCount: job.vacancy ?? null,
      workFromHomeType,
      site: Site.NAUKRI,
    });
  }

  private getLocation(placeholders: any[]): LocationDto {
    for (const p of placeholders) {
      if (p.type === 'location') {
        const parts = (p.label ?? '').split(', ');
        return new LocationDto({
          city: parts[0] || null,
          state: parts.length > 1 ? parts[1] : null,
          country: Country.INDIA,
        });
      }
    }
    return new LocationDto({ country: Country.INDIA });
  }

  private getCompensation(placeholders: any[]): CompensationDto | null {
    for (const p of placeholders) {
      if (p.type === 'salary') {
        const text = (p.label ?? '').trim();
        if (text === 'Not disclosed') return null;

        const match = text.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(Lacs|Lakh|Cr)/i);
        if (!match) return null;

        let minSalary = parseFloat(match[1]);
        let maxSalary = parseFloat(match[2]);
        const unit = match[3].toLowerCase();

        if (unit === 'lacs' || unit === 'lakh') {
          minSalary *= 100000;
          maxSalary *= 100000;
        } else if (unit === 'cr') {
          minSalary *= 10000000;
          maxSalary *= 10000000;
        }

        return new CompensationDto({
          minAmount: Math.round(minSalary),
          maxAmount: Math.round(maxSalary),
          currency: 'INR',
        });
      }
    }
    return null;
  }

  private parseDate(label: string | null, createdDate: number | null): Date | null {
    const now = new Date();
    if (!label) {
      if (createdDate) return new Date(createdDate);
      return null;
    }
    const lbl = label.toLowerCase();
    if (lbl.includes('today') || lbl.includes('just now') || lbl.includes('few hours')) {
      return now;
    }
    if (lbl.includes('ago')) {
      const match = lbl.match(/(\d+)\s*day/);
      if (match) {
        const days = parseInt(match[1], 10);
        return new Date(now.getTime() - days * 86400000);
      }
    }
    if (createdDate) return new Date(createdDate);
    return null;
  }

  private inferWorkFromHomeType(placeholders: any[], title: string, description: string): string | null {
    const locStr = (placeholders.find((p: any) => p.type === 'location')?.label ?? '').toLowerCase();
    const fullText = `${locStr} ${title.toLowerCase()} ${description.toLowerCase()}`;
    if (fullText.includes('hybrid')) return 'Hybrid';
    if (fullText.includes('remote')) return 'Remote';
    if (fullText.includes('work from office')) return 'Work from office';
    return null;
  }
}
