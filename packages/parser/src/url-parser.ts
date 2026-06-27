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
        try {
            const parsed = new URL(url.trim());
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error('Invalid protocol');
            }
            hostname = parsed.hostname.toLowerCase();
            if (
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname === '::1' ||
                hostname.startsWith('10.') ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('172.16.') ||
                hostname.startsWith('169.254.')
            ) {
                throw new Error('Local/private host not allowed');
            }
            const match = hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
            if (match) {
                throw new Error('Local/private host not allowed');
            }
        } catch (err: any) {
            return {
                parsed: {},
                meta: {
                    sourceType: 'GENERIC',
                    confidence: 0,
                    missing: ['content'],
                    warnings: [`fetch_failed: ${err?.message || 'Invalid URL'}`],
                    finalUrl: url
                }
            };
        }

        const sourceType = this.detectSourceType(hostname);
        let html = '';
        try {
            const resp = await axios.get(url, {
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
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
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
