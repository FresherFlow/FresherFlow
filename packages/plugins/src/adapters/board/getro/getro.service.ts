import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  JobType,
  Site,
  DescriptionFormat,
} from '../../../base/models/index.js';
import {
  createHttpClient,
  HttpClient,
  markdownConverter,
  parseLocationList,
} from '../../../common/index.js';
import {
  GETRO_API_URL,
  GETRO_HEADERS,
  GETRO_MAX_RETRIES,
  GETRO_RETRY_BACKOFF,
} from './getro.constants.js';
import { GetroJob, GetroSearchResponse } from './getro.types.js';

export class GetroService implements IScraper {
  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const collectionId = input.companySlug;
    if (!collectionId) {
      console.warn('No collectionId (companySlug) provided for Getro scraper');
      return new JobResponseDto([]);
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(GETRO_HEADERS);

    const jobs: JobPostDto[] = [];
    let page = 0;
    const hitsPerPage = 50;

    try {
      while (true) {
        const url = `${GETRO_API_URL}/collections/${encodeURIComponent(collectionId)}/search/jobs`;
        const body: Record<string, any> = {
          hitsPerPage,
          page,
          query: input.location || input.searchTerm || '',
          filters: {
            seniority: ['internship', 'entry_level'],
          },
        };

        const response = await this.postWithRetry(client, url, body);
        const data: GetroSearchResponse = response.data ?? {};
        const rawJobs = data.results?.jobs || [];

        if (rawJobs.length === 0) break;

        for (const rj of rawJobs) {
          const parsed = this.parseJob(rj, input);
          if (parsed) {
            jobs.push(parsed);
          }
        }

        const totalCount = data.results?.count || 0;
        if (jobs.length >= totalCount || rawJobs.length < hitsPerPage) {
          break;
        }
        page++;
        if (page >= 10) break; // Safeguard
      }

      return new JobResponseDto(jobs);
    } catch (err: any) {
      console.error(`Getro scraping failed for collection ${collectionId}: ${err.message}`);
      return new JobResponseDto(jobs);
    }
  }

  private parseJob(rj: GetroJob, input: ScraperInputDto): JobPostDto | null {
    if (!rj.title) return null;

    // Reject if Getro JSON explicitly tags as senior/mid/lead/director/manager/staff
    const seniority = Array.isArray(rj.seniority) ? rj.seniority : (rj.seniority ? [rj.seniority] : []);
    const seniorities = seniority.map(s => String(s).toLowerCase());
    const isSenior = seniorities.some(s => ['senior', 'sr', 'lead', 'principal', 'director', 'executive', 'manager', 'head', 'vp', 'staff', 'mid'].includes(s));
    if (isSenior) return null;

    const companyName = rj.organization?.name || input.searchTerm || 'Company';
    const applyUrl = rj.apply_url || rj.url || '';
    if (!applyUrl) return null;

    const rawLocs = (rj.locations || []).map(l => {
      if (typeof l === 'string') return l;
      return [l.city, l.state, l.country].filter(Boolean).join(', ');
    }).filter(Boolean);

    const parsedLocations = parseLocationList(rawLocs);

    const rawDesc = rj.description || '';
    let description: string | undefined;
    if (rawDesc) {
      const conv = input.descriptionFormat === DescriptionFormat.HTML
        ? rawDesc
        : markdownConverter(rawDesc);
      description = conv || undefined;
    }

    const rawTime = typeof rj.created_at === 'number'
      ? (rj.created_at < 10000000000 ? rj.created_at * 1000 : rj.created_at)
      : (rj.created_at ? new Date(rj.created_at).getTime() : null);

    const datePosted = rawTime
      ? new Date(rawTime).toISOString().split('T')[0]
      : null;

    const isRemote = rj.work_mode === 'remote' || Boolean(parsedLocations.remoteMentioned);
    const workFromHomeType = rj.work_mode === 'remote' ? 'Remote' : (rj.work_mode === 'hybrid' ? 'Hybrid' : 'On-site');
    const jobType = rj.seniority === 'internship' ? [JobType.INTERNSHIP] : [JobType.FULL_TIME];

    const tags = Array.from(new Set([
      ...(rj.organization?.industry_tags || []),
      ...(rj.organization?.topics || []),
      ...(rj.skills || [])
    ])).filter(Boolean);

    return new JobPostDto({
      id: `getro-${rj.id}`,
      title: rj.title,
      companyName,
      location: parsedLocations.location,
      isRemote,
      workFromHomeType,
      jobType,
      companyLogo: rj.organization?.logo_url || undefined,
      companyUrl: rj.organization?.domain ? (rj.organization.domain.startsWith('http') ? rj.organization.domain : `https://${rj.organization.domain}`) : undefined,
      companyStage: rj.organization?.stage || undefined,
      companyNumEmployees: rj.organization?.head_count ? String(rj.organization.head_count) : undefined,
      skills: rj.skills && rj.skills.length > 0 ? rj.skills : undefined,
      tags: tags.length > 0 ? tags : undefined,
      companyIndustry: rj.organization?.industry_tags && rj.organization.industry_tags.length > 0
        ? rj.organization.industry_tags.join(', ')
        : undefined,
      description: description || undefined,
      jobUrl: applyUrl,
      datePosted: datePosted || undefined,
      site: Site.GETRO,
    });
  }

  private async postWithRetry(
    client: HttpClient,
    url: string,
    body: any,
    retries = GETRO_MAX_RETRIES,
  ): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await client.post(url, body);
      } catch (err: any) {
        if (attempt === retries) throw err;
        const delay = GETRO_RETRY_BACKOFF * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
}
