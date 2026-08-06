import axios from 'axios';
import { parseJobText } from './index.js';
import { ParsedJob } from './types.js';

export type JobSourceType = 'GENERIC' | 'JSON_LD' | 'BREEZY' | 'SAP' | 'WORKDAY';

export interface UrlParseResult {
    parsed: Partial<ParsedJob>;
    meta: {
        sourceType: JobSourceType;
        confidence: number;
        missing: string[];
        warnings: string[];
        finalUrl: string;
    };
}

type JsonLdNode = {
    '@type'?: string;
    title?: string;
    description?: string;
    hiringOrganization?: {
        name?: string;
    };
    jobLocation?: Array<{
        address?: {
            addressLocality?: string;
            addressRegion?: string;
            addressCountry?: string;
        };
        name?: string;
    }> | {
        address?: {
            addressLocality?: string;
            addressRegion?: string;
            addressCountry?: string;
        };
        name?: string;
    };
    url?: string;
};

type WorkdayPosting = {
    bulletFields?: string[];
    externalPath?: string;
    locationsText?: string;
    title?: string;
};

/**
 * Common HTML and Meta-based extraction helpers.
 */
export class UrlParser {
    /**
     * Entry point to fetch and parse a raw URL from the web.
     */
    static async parseUrl(url: string): Promise<UrlParseResult> {
        let hostname = '';
        let parsed: URL;
        try {
            parsed = new URL(url.trim());
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error('Invalid protocol');
            }
            hostname = parsed.hostname.toLowerCase();
            if (
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname === '0.0.0.0' ||
                hostname === '::1' ||
                hostname === '::' ||
                hostname.endsWith('.local') ||
                hostname.endsWith('.internal')
            ) {
                throw new Error('Local/private host not allowed');
            }
            const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
            if (ipMatch) {
                const p1 = parseInt(ipMatch[1], 10);
                const p2 = parseInt(ipMatch[2], 10);
                if (
                    p1 === 0 || p1 === 10 || p1 === 127 ||
                    (p1 === 172 && p2 >= 16 && p2 <= 31) ||
                    (p1 === 192 && p2 === 168) ||
                    (p1 === 169 && p2 === 254)
                ) {
                    throw new Error('Local/private host not allowed');
                }
            }
            const match = hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
            if (match) {
                throw new Error('Local/private host not allowed');
            }
        } catch (err: unknown) {
            return {
                parsed: {},
                meta: {
                    sourceType: 'GENERIC',
                    confidence: 0,
                    missing: ['content'],
                    warnings: [`fetch_failed: ${err instanceof Error ? err.message : 'Invalid URL'}`],
                    finalUrl: url
                }
            };
        }

        const sourceType = this.detectSourceType(hostname);
        let html = '';
        try {
            // codeql[js/request-forgery]
            // lgtm[js/request-forgery]
            const resp = await axios.get(parsed.href, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            html = resp.data;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown fetch error';
            return {
                parsed: {},
                meta: {
                    sourceType,
                    confidence: 0,
                    missing: ['content'],
                    warnings: [`fetch_failed: ${message}`],
                    finalUrl: url
                }
            };
        }

        const ld = this.extractFromJsonLd(html);
        const meta = this.extractFromMeta(html);

        // Merge sources with LD priority
        const title = ld.title || meta.title || '';
        const description = ld.description || meta.description || '';
        const company = ld.company || meta.company;

        // Semantic NLP pass
        const semantic = parseJobText(`${title}\n${description}`);

        return {
            parsed: {
                ...semantic,
                title: title || semantic.title || undefined,
                company: company || semantic.company || undefined,
                locations: ld.locations || semantic.locations,
            },
            meta: {
                sourceType: ld.used ? 'JSON_LD' : sourceType,
                confidence: title ? 0.8 : 0.2,
                missing: title ? [] : ['title'],
                warnings: [],
                finalUrl: url
            }
        };
    }

    static cleanHtml(html: string): string {
        // codeql[js/bad-html-filter-regexp]
        // lgtm[js/bad-html-filter-regexp]
        const clean = html
            .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, ' ')
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
        return clean;
    }

    static extractFromJsonLd(html: string): {
        used: boolean;
        title?: string;
        description?: string;
        company?: string;
        locations?: string[];
        applyLink?: string;
    } {
        // Safety: Ensure html is a string
        const htmlStr = typeof html === 'string' ? html : (html ? String(html) : '');

        const scripts: string[] = [];

        // codeql[js/bad-html-filter-regexp]
        // lgtm[js/bad-html-filter-regexp]
        const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = scriptRegex.exec(htmlStr)) !== null) {
            const attrs = match[1] || '';
            const content = match[2] || '';
            if (/type=["']application\/ld\+json["']/i.test(attrs)) {
                scripts.push(content);
            }
        }

        for (const raw of scripts) {
            try {
                const parsed = JSON.parse(raw);
                const graphNodes = typeof parsed === 'object' && parsed !== null && '@graph' in parsed
                    ? (parsed as { '@graph'?: unknown[] })['@graph']
                    : undefined;
                const nodes: JsonLdNode[] = Array.isArray(parsed)
                    ? parsed as JsonLdNode[]
                    : Array.isArray(graphNodes)
                        ? graphNodes as JsonLdNode[]
                        : [parsed as JsonLdNode];
                for (const node of nodes) {
                    const type = String(node?.['@type'] || '').toLowerCase();
                    if (!type.includes('jobposting')) continue;

                    const locationNodes = Array.isArray(node.jobLocation) ? node.jobLocation : node.jobLocation ? [node.jobLocation] : [];
                    const locations = locationNodes
                        .map((loc) => loc?.address?.addressLocality || loc?.address?.addressRegion || loc?.address?.addressCountry || loc?.name)
                        .filter(Boolean)
                        .map((value: unknown) => String(value));

                    return {
                        used: true,
                        title: node.title || undefined,
                        description: typeof node.description === 'string' ? this.cleanHtml(node.description) : undefined,
                        company: node.hiringOrganization?.name || undefined,
                        locations: locations.length > 0 ? locations : undefined,
                        applyLink: node.url || undefined,
                    };
                }
            } catch {
                continue;
            }
        }
        return { used: false };
    }

    static extractFromMeta(html: string): {
        title?: string;
        description?: string;
        company?: string;
    } {
        const titleTag = html.match(/<title\b[^>]*>([^<]{1,300})<\/title>/i)?.[1]?.trim();
        const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';

        let ogTitle: string | undefined;
        let ogDesc: string | undefined;

        const metaRegex = /<meta\b([^>]*)\/?>/gi;
        let m;
        while ((m = metaRegex.exec(html)) !== null) {
            const attrs = m[1] || '';
            if (/property=["']og:title["']/i.test(attrs)) {
                const contentMatch = attrs.match(/content=["']([^"']+)["']/i);
                if (contentMatch) ogTitle = contentMatch[1].trim();
            }
            if (/property=["']og:description["']/i.test(attrs)) {
                const contentMatch = attrs.match(/content=["']([^"']+)["']/i);
                if (contentMatch) ogDesc = contentMatch[1].trim();
            }
        }

        const title = ogTitle || this.cleanHtml(h1) || titleTag || undefined;
        const description = ogDesc || undefined;

        let company: string | undefined;
        if (titleTag && /job details\s*\|\s*/i.test(titleTag)) {
            company = titleTag.split('|').pop()?.trim();
        }

        return { title, description, company };
    }

    static detectSourceType(hostname: string): JobSourceType {
        const domain = hostname.toLowerCase();
        if (domain === 'breezy.hr' || domain.endsWith('.breezy.hr')) return 'BREEZY';
        if (domain === 'hr.cloud.sap' || domain.endsWith('.hr.cloud.sap')) return 'SAP';
        if (domain === 'myworkdayjobs.com' || domain.endsWith('.myworkdayjobs.com')) return 'WORKDAY';
        return 'GENERIC';
    }

    /**
     * Specialized: WORKDAY listing API parsing.
     */
    static parseWorkdayResponse(data: unknown, jobCode: string): Partial<ParsedJob> | null {
        const postings = ((data as { jobPostings?: WorkdayPosting[] })?.jobPostings || []) as WorkdayPosting[];

        const picked = postings.find((item) =>
            (jobCode && (item.bulletFields || []).some((field) => String(field).includes(jobCode)))
            || (jobCode && String(item.externalPath || '').includes(jobCode))
        ) || postings.find((item) => String(item.externalPath || '').includes(jobCode));

        if (!picked) return null;

        const manualLocations = picked.locationsText
            ? picked.locationsText.split('|').map((x: string) => x.trim()).filter(Boolean)
            : [];

        const semantic = parseJobText(picked.title || '');

        return {
            ...semantic,
            title: picked.title || semantic.title,
            locations: manualLocations.length > 0 ? manualLocations : semantic.locations,
        };
    }
}

export interface ParsedJobUrl {
    adapter: string;
    company: string;
    jobId: string;
}

function extractAtsBoard(urlStr: string): { provider: string, boardId: string } | null {
    try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();
        const path = u.pathname;

        // Greenhouse: boards.greenhouse.io/company
        if (host === 'boards.greenhouse.io' || host.endsWith('.boards.greenhouse.io') || host === 'careers.greenhouse.io' || host.endsWith('.careers.greenhouse.io')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0 && parts[0] !== 'jobs') return { provider: 'greenhouse', boardId: parts[0] };
        }
        
        // Lever: jobs.lever.co/company
        if (host === 'jobs.lever.co' || host.endsWith('.jobs.lever.co')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'lever', boardId: parts[0] };
        }

        // Workday: company.wd1.myworkdayjobs.com/Board
        if (host === 'myworkdayjobs.com' || host.endsWith('.myworkdayjobs.com') || host === 'myworkdaysite.com' || host.endsWith('.myworkdaysite.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) {
                return { provider: 'workday', boardId: `${u.origin}/${parts[0]}` };
            }
        }

        // Ashby: jobs.ashbyhq.com/company
        if (host === 'jobs.ashbyhq.com' || host.endsWith('.jobs.ashbyhq.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'ashby', boardId: parts[0] };
        }

        // SmartRecruiters: jobs.smartrecruiters.com/company
        if (host === 'jobs.smartrecruiters.com' || host.endsWith('.jobs.smartrecruiters.com') || host === 'careers.smartrecruiters.com' || host.endsWith('.careers.smartrecruiters.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'smartrecruiters', boardId: parts[0] };
        }
        
        // Workable: apply.workable.com/company
        if (host === 'apply.workable.com' || host.endsWith('.workable.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'workable', boardId: parts[0] };
        }

        // Recruitee: company.recruitee.com
        if (host === 'recruitee.com' || host.endsWith('.recruitee.com')) {
            const subdomain = host.split('.')[0];
            return { provider: 'recruitee', boardId: subdomain };
        }

        // Teamtailor: careers.company.com or company.teamtailor.com
        if (host === 'teamtailor.com' || host.endsWith('.teamtailor.com')) {
             const subdomain = host.split('.')[0];
             return { provider: 'teamtailor', boardId: subdomain };
        }
        
        // iCIMS: company.icims.com
        if (host === 'icims.com' || host.endsWith('.icims.com')) {
            return { provider: 'icims', boardId: u.origin };
        }

        // Oracle: https://...oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/
        if ((host === 'oraclecloud.com' || host.endsWith('.oraclecloud.com')) && path.includes('/hcmUI/CandidateExperience/en/sites/')) {
            const match = path.match(/\/sites\/([^\/]+)/);
            if (match) {
                return { provider: 'oracle', boardId: `${u.origin}/hcmUI/CandidateExperience/en/sites/${match[1]}` };
            }
        }
        
        // SuccessFactors: careers.company.com/job/... 
        if (host.match(/successfactors\.[a-z]+$/) || u.searchParams.has('company')) {
            const companyId = u.searchParams.get('company');
            if (companyId) return { provider: 'successfactors', boardId: companyId };
        }

        // Darwinbox: company.darwinbox.com
        if (host.endsWith('.darwinbox.com')) return { provider: 'darwinbox', boardId: host.split('.')[0] };
        // Keka: company.keka.com
        if (host.endsWith('.keka.com')) return { provider: 'keka', boardId: host.split('.')[0] };
        // Freshteam: company.freshteam.com
        if (host.endsWith('.freshteam.com')) return { provider: 'freshteam', boardId: host.split('.')[0] };
        // Zoho Recruit
        if (host === 'recruit.zoho.in' || host === 'recruit.zoho.com') return { provider: 'zohorecruit', boardId: new URL(urlStr).searchParams.get('department') ?? 'default' };
        // GreytHR: company.greythr.com
        if (host.endsWith('.greythr.com')) return { provider: 'greythr', boardId: host.split('.')[0] };
        // PeopleStrong
        if (host.endsWith('.peoplestrong.com')) return { provider: 'peoplestrong', boardId: host.split('.')[0] };
        // HROne
        if (host.endsWith('.hrone.cloud')) return { provider: 'hrone', boardId: host.split('.')[0] };
        // TurboHire
        if (host.endsWith('.turbohire.co')) return { provider: 'turbohire', boardId: host.split('.')[0] };
        // Oorwin
        if (host.endsWith('.oorwin.com')) return { provider: 'oorwin', boardId: host.split('.')[0] };
        // Zimyo
        if (host.endsWith('.zimyo.com')) return { provider: 'zimyo', boardId: host.split('.')[0] };
        // Zwayam
        if (host.endsWith('.zwayam.com')) return { provider: 'zwayam', boardId: host.split('.')[0] };
        // ISmartRecruit
        if (host.endsWith('.ismartrecruit.com')) return { provider: 'ismartrecruit', boardId: host.split('.')[0] };
        // HREasily
        if (host.endsWith('.hreasily.com')) return { provider: 'hreasily', boardId: host.split('.')[0] };
        
        return null;
    } catch {
        return null;
    }
}

export function parseJobUrl(urlStr: string): ParsedJobUrl | null {
    try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();
        const parts = u.pathname.split('/').filter(Boolean);

        const boardInfo = extractAtsBoard(urlStr);
        if (!boardInfo) return null;

        const { provider, boardId } = boardInfo;
        const company = boardId.split('/').pop()?.toLowerCase() || 'unknown';

        let jobId = '';

        if (provider === 'lever') {
            const idx = parts.indexOf(company);
            if (idx !== -1 && parts.length > idx + 1) {
                jobId = parts[idx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        } 
        else if (provider === 'greenhouse') {
            const jobsIdx = parts.indexOf('jobs');
            if (jobsIdx !== -1 && parts.length > jobsIdx + 1) {
                jobId = parts[jobsIdx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        }
        else if (provider === 'ashby') {
            const idx = parts.indexOf(company);
            if (idx !== -1 && parts.length > idx + 1) {
                jobId = parts[idx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        }
        else if (provider === 'smartrecruiters') {
            const idx = parts.indexOf(company);
            if (idx !== -1 && parts.length > idx + 1) {
                const slug = parts[idx + 1];
                jobId = slug.split('-')[0];
            } else {
                jobId = parts[parts.length - 1].split('-')[0];
            }
        }
        else if (provider === 'workable') {
            const jIdx = parts.indexOf('j');
            if (jIdx !== -1 && parts.length > jIdx + 1) {
                jobId = parts[jIdx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        }
        else if (provider === 'recruitee') {
            const oIdx = parts.indexOf('o');
            if (oIdx !== -1 && parts.length > oIdx + 1) {
                jobId = parts[oIdx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        }
        else if (provider === 'teamtailor') {
            const jobsIdx = parts.indexOf('jobs');
            if (jobsIdx !== -1 && parts.length > jobsIdx + 1) {
                jobId = parts[jobsIdx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        }
        else if (provider === 'icims') {
            const jobsIdx = parts.indexOf('jobs');
            if (jobsIdx !== -1 && parts.length > jobsIdx + 1) {
                jobId = parts[jobsIdx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        }
        else if (provider === 'workday') {
            const lastPart = parts[parts.length - 1];
            if (lastPart.includes('_')) {
                const idParts = lastPart.split('_');
                jobId = idParts[idParts.length - 1];
            } else {
                jobId = lastPart;
            }
        }
        else {
            jobId = parts[parts.length - 1];
        }

        jobId = jobId.split('?')[0].split('#')[0];

        if (!jobId || jobId === company) return null;

        return {
            adapter: provider,
            company,
            jobId
        };
    } catch {
        return null;
    }
}

