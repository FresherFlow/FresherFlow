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
  CONSIDER_HEADERS,
  CONSIDER_MAX_RETRIES,
  CONSIDER_RETRY_BACKOFF,
} from './consider.constants.js';
import { ConsiderJob } from './consider.types.js';

export class ConsiderService implements IScraper {
  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const portalUrl = input.companySlug || (input as any).url;
    if (!portalUrl) {
      console.warn('No portalUrl provided for Consider scraper');
      return new JobResponseDto([]);
    }

    const host = portalUrl.startsWith('http') ? portalUrl.replace(/\/$/, '') : `https://${portalUrl}`;

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout || 15,
    });
    client.setHeaders(CONSIDER_HEADERS);

    try {
      // 1. Fetch initial HTML to extract CSRF token and board ID
      const pageRes = await client.get(host);
      if (!pageRes || pageRes.status >= 400) {
        console.warn(`[Consider] Failed to load initial page for ${host}`);
        return new JobResponseDto([]);
      }

      const setCookie = pageRes.headers['set-cookie'];
      const rawCookies = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
      const cookieHeader = rawCookies.map((c: string) => c.split(';')[0]).join('; ');
      const html = typeof pageRes.data === 'string' ? pageRes.data : '';

      const initialMatch = html.match(/window\.serverInitialData\s*=\s*(\{[\s\S]*?\});/);
      if (!initialMatch) {
        console.warn(`[Consider] No serverInitialData found on ${host}`);
        return new JobResponseDto([]);
      }

      const initialData = JSON.parse(initialMatch[1]);
      const csrfToken = initialData.csrfToken;
      const board = initialData.board;

      if (!board || !board.id) {
        console.warn(`[Consider] No board found in serverInitialData on ${host}`);
        return new JobResponseDto([]);
      }

      // 2. Query /api-boards/search-jobs
      const searchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': CONSIDER_HEADERS['User-Agent'],
        'X-CSRF-Token': csrfToken,
      };
      if (cookieHeader) searchHeaders['Cookie'] = cookieHeader;

      client.setHeaders(searchHeaders);

      const searchRes = await client.post(`${host}/api-boards/search-jobs`, {
        meta: {},
        board: board,
        query: {},
        grouped: false,
        limit: 100,
      });

      if (!searchRes || !searchRes.data) {
        console.warn(`[Consider] /api-boards/search-jobs returned empty on ${host}`);
        return new JobResponseDto([]);
      }

      const data = searchRes.data;
      const rawJobs: ConsiderJob[] = data.jobs || [];
      const jobs: JobPostDto[] = [];

      for (const rj of rawJobs) {
        const parsed = this.parseJob(rj, input);
        if (parsed) {
          jobs.push(parsed);
        }
      }

      return new JobResponseDto(jobs);
    } catch (err: any) {
      console.error(`[Consider] Scraping failed for ${host}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  private parseJob(rj: ConsiderJob, input: ScraperInputDto): JobPostDto | null {
    if (!rj.title) return null;

    const companyName = rj.companyName || rj.company?.name || rj.parentName || input.searchTerm || 'Startup';
    const applyUrl = rj.applyUrl || rj.url || rj.jobUrl || '';
    if (!applyUrl) return null;

    const locArr = rj.locations || (rj.location ? [rj.location] : []);
    const parsedLocations = parseLocationList(locArr);

    const rawDesc = rj.description || rj.company?.description || '';
    let description: string | undefined;
    if (rawDesc) {
      const conv = input.descriptionFormat === DescriptionFormat.HTML
        ? rawDesc
        : markdownConverter(rawDesc);
      description = conv || undefined;
    }

    const rawTime = rj.timeStamp || rj.createdAt || rj.postedAt;
    const datePosted = rawTime
      ? new Date(typeof rawTime === 'number' && rawTime < 10000000000 ? rawTime * 1000 : rawTime).toISOString().split('T')[0]
      : null;

    const isRemote = Boolean(rj.remote || parsedLocations.remoteMentioned);
    const workFromHomeType = rj.remote ? 'Remote' : (rj.hybrid ? 'Hybrid' : 'On-site');

    // Extract skill strings from object array or string array
    const rawSkills = (rj.skills || []).map(s => (typeof s === 'string' ? s : (s.label || s.value || ''))).filter(Boolean);
    const rawReqSkills = (rj.requiredSkills || []).map(s => (typeof s === 'string' ? s : (s.label || s.value || ''))).filter(Boolean);
    const combinedSkills = Array.from(new Set([...rawSkills, ...rawReqSkills]));

    // Extract industry / market categories
    const marketTags = (rj.markets || []).map(m => (typeof m === 'string' ? m : (m.label || m.value || m.id || ''))).filter(Boolean);
    const stageTags = (rj.stages || []).map(s => (typeof s === 'string' ? s : (s.label || s.value || s.id || ''))).filter(Boolean);
    const companyStage = stageTags[0] || undefined;
    const companyNumEmployees = rj.companyStaffCount ? String(rj.companyStaffCount) : (companyStage || undefined);

    const tags = Array.from(new Set([...marketTags, ...stageTags, ...combinedSkills])).filter(Boolean);
    const companyIndustry = marketTags.length > 0 ? marketTags.join(', ') : undefined;

    const jobFunction = (rj.jobFunctions || [])[0]?.label || undefined;
    const isIntern = rj.jobSeniorities?.some(s => s.id === 'internship') || /intern/i.test(rj.title);
    const jobType = isIntern ? [JobType.INTERNSHIP] : [JobType.FULL_TIME];

    const companyLogo = rj.companyLogos?.manual?.src || rj.companyLogos?.linkedin?.src || rj.company?.logo || undefined;
    const companyUrl = rj.companyDomain ? (rj.companyDomain.startsWith('http') ? rj.companyDomain : `https://${rj.companyDomain}`) : undefined;

    const jobId = rj.jobId || rj.id || Math.random().toString(36).substring(7);

    return new JobPostDto({
      id: `consider-${jobId}`,
      title: rj.title,
      companyName,
      location: parsedLocations.location,
      isRemote,
      workFromHomeType,
      jobType,
      companyLogo,
      companyUrl,
      companyStage,
      companyNumEmployees,
      companyIndustry,
      jobFunction,
      skills: combinedSkills.length > 0 ? combinedSkills : undefined,
      tags: tags.length > 0 ? tags : undefined,
      description: description || undefined,
      jobUrl: applyUrl,
      datePosted: datePosted || undefined,
      site: Site.CONSIDER,
    });
  }
}
