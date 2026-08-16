// ─── Shared types ─────────────────────────────────────────────────────────────
import { createHttpClient } from './http-client.js';

const defaultClient = createHttpClient({
    retries: 3,
    retryDelay: 1000,
    retryBackoff: 'exponential',
    timeout: 15,
    proxies: process.env.PROXY_URLS ? process.env.PROXY_URLS.split(',').map(s => s.trim()).filter(Boolean) : []
});

export interface ParsedLocation {
    raw: string;
    country?: string;       // Full country name e.g. "India"
    countryCode?: string;   // ISO 3166-1 alpha-2 e.g. "IN"
    city?: string;
    region?: string;        // State/province
    remote: boolean;
}

export interface AtsJob {
    id?: string;
    title: string;
    applyLink: string;
    applyUrl?: string;
    jobUrlDirect?: string;
    company: string;
    companyUrl?: string;
    companyUrlDirect?: string;
    companyIndustry?: string;
    companyDescription?: string;
    companyLogo?: string;
    companyNumEmployees?: string;
    companyRevenue?: string;
    companyRating?: number;
    companyReviewsCount?: number;
    companyAddresses?: string;
    bannerPhotoUrl?: string;
    location?: string;
    parsedLocation?: ParsedLocation;
    workFromHomeType?: string;
    isRemote?: boolean;
    description?: string;
    descriptionSource: 'API' | 'HTML' | 'NONE';
    postedAt?: string;
    publishedAt?: string | null;
    department?: string;
    team?: string;
    employmentType?: string;
    jobType?: string[];
    listingType?: string;
    jobLevel?: string;
    jobFunction?: string;
    batchYear?: string;
    degree?: string;
    experienceLevel?: string;
    experienceRange?: string;
    experienceYears?: number;
    vacancyCount?: number;
    skills?: string[];
    emails?: string[];
    compensation?: { interval: string; minAmount?: number; maxAmount?: number; currency?: string; };
    salarySource?: string;
    rawPayload?: unknown;
    source: string;
    sourceType: 'ATS' | 'AGGREGATOR';
    site?: string;
    atsId?: string;
    atsType?: string;
    boardToken?: string;
    liveness?: { state: 'active' | 'expired' | 'uncertain'; checkedAt?: string; } | null;
    legitimacy?: { state: 'verified' | 'likely' | 'uncertain'; reasons?: string[]; } | null;
}

export interface AtsAdapter {
    providerName: string;
    fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]>;
    fetchJobDetails?(
        job: AtsJob,
        page?: any
    ): Promise<string | { title: string; html: string; text: string; locations: string[]; company?: string } | undefined>;
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

export const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

export async function fetchJson<T>(
    url: string,
    init?: RequestInit,
    label?: string
): Promise<T | null> {
    try {
        const method = init?.method ?? 'GET';
        const config: any = {
            method,
            url,
            headers: {
                'Accept': 'application/json',
                ...((init?.headers as Record<string, string>) ?? {})
            }
        };
        
        if (init?.body) {
            config.data = init.body;
        }
        
        const response = await defaultClient.request<T>(config);
        return response.data;
    } catch (err: any) {
        if (err.response) {
            console.warn(`[${label ?? 'ATS'}] HTTP ${err.response.status} ${err.response.statusText} for ${url}`);
        } else {
            console.error(`[${label ?? 'ATS'}] fetch failed for ${url}:`, err.message);
        }
        throw err;
    }
}

import * as cheerio from 'cheerio';

export function decodeHtmlEntities(html: string): string {
    const entities: Record<string, string> = {
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x27;': "'",
        '&amp;': '&',
        '&nbsp;': ' ',
        '&ndash;': '–',
        '&mdash;': '—',
        '&bull;': '•'
    };
    return html.replace(/&lt;|&gt;|&quot;|&#39;|&#x27;|&amp;|&nbsp;|&ndash;|&mdash;|&bull;/g, m => entities[m]);
}

export function htmlToPlainText(html: string): string {
    if (!html) return '';
    const $ = cheerio.load(html);
    $('br').replaceWith('\\n');
    $('p, div, li, h1, h2, h3, h4, h5, h6, tr, blockquote').append('\\n');
    $('li').prepend('• ');
    let text = $.text();

    text = decodeHtmlEntities(text);
    return text
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map(l => l.trim())
        .join('\n')
        .trim();
}

export function extractEmails(text?: string | null): string[] {
    if (!text) return [];
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    return matches ? Array.from(new Set(matches)) : [];
}

// ─── ISO country code → full name ─────────────────────────────────────────────

export const COUNTRY_CODE_MAP: Record<string, string> = {
    IN: 'India', US: 'United States', GB: 'United Kingdom', SG: 'Singapore',
    DE: 'Germany', AU: 'Australia', CA: 'Canada', FR: 'France', NL: 'Netherlands',
    PL: 'Poland', IE: 'Ireland', JP: 'Japan', CN: 'China', AE: 'UAE',
    MY: 'Malaysia', PH: 'Philippines', VN: 'Vietnam', TH: 'Thailand',
    KR: 'South Korea', TW: 'Taiwan', BR: 'Brazil', MX: 'Mexico',
    ES: 'Spain', IT: 'Italy', SE: 'Sweden', HK: 'Hong Kong',
};


export interface LocationDto {
  country?: string;
  city?: string;
  state?: string;
  raw?: string;
}

export const randomSleep = (minMs = 500, maxMs = 1500): Promise<void> =>
  sleep(Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs);

export function regionNameFromCode(code?: string | null): string | undefined {
  if (!code) return undefined;
  return COUNTRY_CODE_MAP[code.toUpperCase()] ?? code;
}

export function parseLocationList(locations?: string[]): { location: LocationDto | null; remoteMentioned: boolean; workFromHomeType: string | null } {
  if (!locations || locations.length === 0) return { location: null, remoteMentioned: false, workFromHomeType: null };
  const raw = locations.join('; ');
  const remoteMentioned = /remote|work from home|wfh|hybrid/i.test(raw);
  let workFromHomeType: string | null = null;
  if (/hybrid/i.test(raw)) workFromHomeType = 'Hybrid';
  else if (/remote|wfh/i.test(raw)) workFromHomeType = 'Remote';
  return { location: { raw }, remoteMentioned, workFromHomeType };
}

export function getJobTypeFromString(str?: string | null): string | null {
  if (!str) return null;
  const s = str.toLowerCase();
  if (s.includes('full')) return 'Full-time';
  if (s.includes('part')) return 'Part-time';
  if (s.includes('intern')) return 'Internship';
  if (s.includes('contract')) return 'Contract';
  return str;
}

export type DescriptionFormat = 'PLAIN' | 'HTML' | 'MARKDOWN';

export type CompensationInterval = string;

export class CompensationDto {
  interval?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  currency?: string | null;
  constructor(init?: Partial<CompensationDto>) {
    if (init) Object.assign(this, init);
  }
}

export function resolveCompensation(opts: any): CompensationDto | null {
  if (!opts) return null;
  if (opts.structured) return opts.structured;
  return null;
}

export function aggregateCompensation(comps: CompensationDto[]): CompensationDto | null {
  return comps[0] ?? null;
}

export function getCompensationInterval(str?: string | null): string | null {
  if (!str) return null;
  if (/year|annual|yr/i.test(str)) return 'YEARLY';
  if (/month|mo/i.test(str)) return 'MONTHLY';
  if (/hour|hr/i.test(str)) return 'HOURLY';
  return str;
}

export function salaryToCompensation(salaryText?: string | null): CompensationDto | null {
  if (!salaryText) return null;
  return new CompensationDto({ currency: 'INR' });
}




export const CompensationInterval = 'YEARLY';

export function extractExperience(description?: string | null): { minExperienceYears?: number; maxExperienceYears?: number; experienceLevel?: string } {
    if (!description) return {};
    if (description.length > 5000) description = description.substring(0, 5000);
    const rangeMatch = description.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)/i);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        return {
            minExperienceYears: min,
            maxExperienceYears: max,
            experienceLevel: min === 0 ? 'Entry Level' : min < 3 ? 'Junior' : min < 7 ? 'Mid Level' : 'Senior',
        };
    }
    const plusMatch = description.match(/(\d+)\+\s*(?:years?|yrs?)/i);
    if (plusMatch) {
        const min = parseInt(plusMatch[1], 10);
        return {
            minExperienceYears: min,
            experienceLevel: min === 0 ? 'Entry Level' : min < 3 ? 'Junior' : min < 7 ? 'Mid Level' : 'Senior',
        };
    }
    return {};
}

export function extractSalary(description?: string | null): { minSalary?: number; maxSalary?: number; currency?: string; interval?: string } | null {
    if (!description) return null;
    if (description.length > 5000) description = description.substring(0, 5000);
    const lpaRange = description.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:LPA|Lakhs?|Lakhs?\s*PA)/i);
    if (lpaRange) {
        return {
            minSalary: Math.round(parseFloat(lpaRange[1]) * 100000),
            maxSalary: Math.round(parseFloat(lpaRange[2]) * 100000),
            currency: 'INR',
            interval: 'YEARLY',
        };
    }
    const lpaSingle = description.match(/(\d+(?:\.\d+)?)\s*(?:LPA|Lakhs?\s*PA)/i);
    if (lpaSingle) {
        const amount = Math.round(parseFloat(lpaSingle[1]) * 100000);
        return {
            minSalary: amount,
            maxSalary: amount,
            currency: 'INR',
            interval: 'YEARLY',
        };
    }
    return null;
}

export function markdownConverter(html?: string | null): string {
    if (!html) return '';
    return htmlToPlainText(html);
}

export function normalizeLocation(input: string | null | undefined): string {
    if (!input) return '';
    if (input.length > 500) input = input.substring(0, 500);
    let s = input
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    if (/\b(?:remote|work\s*from\s*home|wfh|anywhere|telecommute|virtual)\b/i.test(s) && !s.includes(' in ')) {
        return 'remote';
    }
    s = s.replace(/[,;]+/g, ' ').replace(/[.,;:!?'`"‘’“”()\[\]{}<>]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
}

export function parseJsonLd<T = any>(html?: string | null): T | null {
    if (!html) return null;
    const match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match || !match[1]) return null;
    try {
        return JSON.parse(match[1].trim()) as T;
    } catch {
        return null;
    }
}

export function toAtsJob(
    job: any,
    providerName: string,
    companyName: string,
    sourceType: 'ATS' | 'AGGREGATOR' = 'ATS'
): AtsJob {
    let locStr: string | undefined = undefined;
    if (typeof job.location === 'string') {
        locStr = job.location;
    } else if (job.location && typeof job.location.displayLocation === 'function') {
        locStr = job.location.displayLocation();
    } else if (job.location) {
        locStr = [job.location.city, job.location.state, job.location.country].filter(Boolean).join(', ');
        if (!locStr && job.location.raw) {
            locStr = job.location.raw;
        }
    }

    let postedAt: string | undefined = undefined;
    if (job.datePosted) {
        try {
            const d = new Date(job.datePosted);
            if (!isNaN(d.getTime())) postedAt = d.toISOString();
        } catch {}
    }

    return {
        id: job.id || job.atsId || undefined,
        title: job.title || 'Unknown Title',
        applyLink: job.jobUrl || job.applyLink || '',
        applyUrl: job.applyUrl || undefined,
        jobUrlDirect: job.jobUrlDirect || undefined,
        company: (job.companyName && job.companyName !== 'unknown') ? job.companyName : (companyName || ''),
        companyUrl: job.companyUrl || undefined,
        companyUrlDirect: job.companyUrlDirect || undefined,
        companyIndustry: job.companyIndustry || undefined,
        companyDescription: job.companyDescription || undefined,
        companyLogo: job.companyLogo || undefined,
        companyNumEmployees: job.companyNumEmployees || undefined,
        companyRevenue: job.companyRevenue || undefined,
        companyRating: job.companyRating || undefined,
        companyReviewsCount: job.companyReviewsCount || undefined,
        companyAddresses: job.companyAddresses || undefined,
        bannerPhotoUrl: job.bannerPhotoUrl || undefined,
        location: locStr || undefined,
        parsedLocation: job.location && typeof job.location === 'object' ? {
            raw: job.location.raw || locStr || '',
            country: job.location.country,
            city: job.location.city,
            region: job.location.state || job.location.region,
            remote: job.isRemote ?? false
        } : undefined,
        workFromHomeType: job.workFromHomeType || (job.isRemote ? 'Remote' : undefined),
        isRemote: job.isRemote ?? undefined,
        description: job.description || undefined,
        descriptionSource: job.description ? 'API' : 'NONE',
        postedAt,
        department: job.department || undefined,
        team: job.team || undefined,
        employmentType: job.employmentType || undefined,
        jobType: job.jobType || undefined,
        listingType: job.listingType || undefined,
        jobLevel: job.jobLevel || undefined,
        jobFunction: job.jobFunction || undefined,
        experienceRange: job.experienceRange || undefined,
        vacancyCount: job.vacancyCount || undefined,
        skills: job.skills || undefined,
        emails: job.emails || undefined,
        compensation: job.compensation ? {
            interval: job.compensation.interval || 'YEARLY',
            minAmount: job.compensation.minAmount || undefined,
            maxAmount: job.compensation.maxAmount || undefined,
            currency: job.compensation.currency || 'USD'
        } : undefined,
        salarySource: job.salarySource || undefined,
        source: 'ATS_' + providerName.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        sourceType,
        site: job.site || providerName.toLowerCase(),
        atsId: job.atsId || undefined,
        atsType: job.atsType || undefined,
        boardToken: job.boardToken || undefined,
        liveness: job.liveness || undefined,
        legitimacy: job.legitimacy || undefined,
    };
}
