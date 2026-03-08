import { ParserService } from './parser.service';

type ParsedFromUrl = {
    title?: string;
    company?: string;
    companyWebsite?: string;
    type?: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    locations?: string[];
    requiredSkills?: string[];
    experienceMin?: number;
    experienceMax?: number;
    salaryRange?: string;
    salaryPeriod?: 'YEARLY' | 'MONTHLY';
    allowedDegrees?: string[];
    allowedPassoutYears?: number[];
    applyLink?: string;
    description?: string;
    notesHighlights?: string;
    workMode?: 'ONSITE' | 'HYBRID' | 'REMOTE';
    expiresAt?: string;
};

type ParseMeta = {
    sourceType: 'GENERIC' | 'JSON_LD' | 'BREEZY' | 'SAP' | 'WORKDAY';
    confidence: number;
    missing: string[];
    warnings: string[];
    finalUrl: string;
};

export class UrlParserService {
    static async parseUrl(url: string): Promise<{ parsed: ParsedFromUrl; meta: ParseMeta }> {
        const normalizedUrl = this.normalizeUrl(url);
        const domain = this.extractDomain(normalizedUrl);
        const sourceType = this.detectSource(domain);
        const warnings: string[] = [];

        if (sourceType === 'WORKDAY') {
            const workdayParsed = await this.parseWorkday(normalizedUrl);
            if (workdayParsed) {
                const meta = this.buildMeta(sourceType, workdayParsed, normalizedUrl, warnings);
                return { parsed: workdayParsed, meta };
            }
            warnings.push('Workday detail API was not directly accessible. Using shell page fallback.');
        }

        const response = await fetch(normalizedUrl, {
            redirect: 'follow',
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
                'accept-language': 'en-US,en;q=0.9'
            }
        });

        const finalUrl = response.url || normalizedUrl;
        const html = await response.text();

        const fromJsonLd = this.extractFromJsonLd(html);
        const fromMeta = this.extractFromMeta(html, finalUrl);
        const rawText = this.extractReadableText(html);
        const semantic = ParserService.parse([fromMeta.title, fromMeta.description, rawText].filter(Boolean).join('\n'));

        const parsed: ParsedFromUrl = {
            title: fromJsonLd.title || fromMeta.title || semantic.title,
            company: fromJsonLd.company || fromMeta.company || semantic.company,
            companyWebsite: fromJsonLd.companyWebsite || fromMeta.companyWebsite || this.origin(finalUrl),
            type: this.inferType(fromJsonLd.type, fromMeta.title, rawText, semantic.type),
            locations: this.unique([...(fromJsonLd.locations || []), ...(fromMeta.locations || []), ...(semantic.locations || [])]),
            requiredSkills: this.unique([...(semantic.skills || [])]).slice(0, 20),
            experienceMin: semantic.experienceMin,
            experienceMax: semantic.experienceMax,
            salaryRange: this.makeSalaryRange(semantic.salaryMin, semantic.salaryMax),
            salaryPeriod: semantic.salaryPeriod,
            allowedDegrees: semantic.allowedDegrees || [],
            allowedPassoutYears: semantic.allowedPassoutYears || [],
            applyLink: fromJsonLd.applyLink || finalUrl,
            description: fromJsonLd.description || fromMeta.description || rawText.slice(0, 6000),
            notesHighlights: fromMeta.notesHighlights,
            workMode: semantic.isRemote ? 'REMOTE' : 'ONSITE',
            expiresAt: semantic.expiresAt,
        };

        if (!fromJsonLd.title && !fromMeta.title) warnings.push('Could not find strongly structured title fields.');
        if (!fromJsonLd.company && !semantic.company) warnings.push('Company was inferred heuristically.');
        if (response.status >= 300) warnings.push(`Fetched with HTTP status ${response.status}.`);

        const meta = this.buildMeta(
            fromJsonLd.used ? 'JSON_LD' : sourceType,
            parsed,
            finalUrl,
            warnings
        );
        return { parsed, meta };
    }

    private static normalizeUrl(url: string): string {
        const trimmed = String(url || '').trim();
        if (!trimmed) throw new Error('URL is required');
        if (!/^https?:\/\//i.test(trimmed)) throw new Error('URL must start with http:// or https://');
        return trimmed;
    }

    private static extractDomain(url: string): string {
        return new URL(url).hostname.toLowerCase();
    }

    private static origin(url: string): string {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}`;
    }

    private static detectSource(domain: string): ParseMeta['sourceType'] {
        if (domain.includes('breezy.hr')) return 'BREEZY';
        if (domain.includes('hr.cloud.sap')) return 'SAP';
        if (domain.includes('myworkdayjobs.com')) return 'WORKDAY';
        return 'GENERIC';
    }

    private static unique(values: string[]): string[] {
        return Array.from(new Set(values.map((v) => String(v || '').trim()).filter(Boolean)));
    }

    private static cleanHtml(value: string): string {
        return value
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private static extractReadableText(html: string): string {
        return this.cleanHtml(html).slice(0, 12000);
    }

    private static extractFromMeta(html: string, finalUrl: string): {
        title?: string;
        description?: string;
        company?: string;
        companyWebsite?: string;
        locations?: string[];
        notesHighlights?: string;
    } {
        const titleTag = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1]?.trim();
        const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]?.trim();
        const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1]?.trim();
        const h1 = this.cleanHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');

        const title = ogTitle || h1 || titleTag || undefined;
        const description = ogDesc || undefined;

        let company: string | undefined;
        if (titleTag && /job details\s*\|\s*/i.test(titleTag)) {
            company = titleTag.split('|').pop()?.trim();
        }
        if (!company && title && /\sat\s/i.test(title)) {
            company = title.split(/\sat\s/i).pop()?.trim();
        }

        const companyWebsite = this.origin(finalUrl);
        const notesHighlights = [titleTag, ogTitle].filter(Boolean).join(' | ');
        return { title, description, company, companyWebsite, locations: [], notesHighlights };
    }

    private static extractFromJsonLd(html: string): {
        used: boolean;
        title?: string;
        description?: string;
        company?: string;
        companyWebsite?: string;
        locations?: string[];
        applyLink?: string;
        type?: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    } {
        const scripts = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
            .map((match) => match[1]);

        for (const raw of scripts) {
            try {
                const parsed = JSON.parse(raw);
                const nodes = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
                for (const node of nodes) {
                    const type = String(node?.['@type'] || '').toLowerCase();
                    if (!type.includes('jobposting')) continue;
                    const locationNodes = Array.isArray(node.jobLocation) ? node.jobLocation : node.jobLocation ? [node.jobLocation] : [];
                    const locations = locationNodes
                        .map((loc: any) => loc?.address?.addressLocality || loc?.address?.addressRegion || loc?.address?.addressCountry || loc?.name)
                        .filter(Boolean)
                        .map((value: unknown) => String(value));
                    return {
                        used: true,
                        title: node.title || undefined,
                        description: typeof node.description === 'string' ? this.cleanHtml(node.description) : undefined,
                        company: node.hiringOrganization?.name || undefined,
                        companyWebsite: node.hiringOrganization?.sameAs || undefined,
                        locations,
                        applyLink: node.url || undefined,
                        type: this.inferType(undefined, node.title, node.description, undefined),
                    };
                }
            } catch {
                continue;
            }
        }

        return { used: false };
    }

    private static inferType(
        ldType: ParsedFromUrl['type'] | undefined,
        title?: string,
        description?: string,
        semanticType?: 'JOB' | 'INTERNSHIP' | 'WALKIN'
    ): 'JOB' | 'INTERNSHIP' | 'WALKIN' {
        if (ldType) return ldType;
        if (semanticType && semanticType !== 'JOB') return semanticType;
        const text = `${title || ''} ${description || ''}`.toLowerCase();
        if (/\bintern(ship)?\b/.test(text)) return 'INTERNSHIP';
        if (/\bwalk[\s-]?in\b|\bdrive\b/.test(text)) return 'WALKIN';
        return 'JOB';
    }

    private static makeSalaryRange(min?: number, max?: number): string | undefined {
        if (min === undefined || max === undefined) return undefined;
        return `${min}-${max}`;
    }

    private static buildMeta(
        sourceType: ParseMeta['sourceType'],
        parsed: ParsedFromUrl,
        finalUrl: string,
        warnings: string[]
    ): ParseMeta {
        const missing = ['title', 'company', 'applyLink'].filter((key) => {
            const value = (parsed as any)[key];
            return !value || (typeof value === 'string' && value.trim().length === 0);
        });

        let confidence = 0.25;
        if (parsed.title) confidence += 0.3;
        if (parsed.company) confidence += 0.2;
        if (parsed.applyLink) confidence += 0.15;
        if (parsed.description) confidence += 0.1;
        if ((parsed.locations || []).length > 0) confidence += 0.1;
        if ((parsed.requiredSkills || []).length > 0) confidence += 0.1;
        confidence = Math.max(0.2, Math.min(0.98, confidence));

        return {
            sourceType,
            confidence: Number(confidence.toFixed(2)),
            missing,
            warnings,
            finalUrl,
        };
    }

    private static async parseWorkday(url: string): Promise<ParsedFromUrl | null> {
        const parsedUrl = new URL(url);
        const host = parsedUrl.host;
        const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
        const tenant = pathParts[0];
        const site = pathParts[1];
        if (!tenant || !site) return null;

        const careersPath = `${parsedUrl.protocol}//${host}/${tenant}/${site}`;
        const jobsApi = `${parsedUrl.protocol}//${host}/wday/cxs/${tenant}/${site}/jobs`;
        const jobCode = url.match(/_([A-Za-z0-9-]+)$/)?.[1] || '';

        const response = await fetch(jobsApi, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'user-agent': 'Mozilla/5.0',
                'origin': careersPath,
                'referer': careersPath
            },
            body: JSON.stringify({ limit: 200, offset: 0, searchText: '' })
        });
        if (!response.ok) return null;

        const data = await response.json() as {
            jobPostings?: Array<{ title?: string; externalPath?: string; locationsText?: string; bulletFields?: string[] }>;
        };

        const postings = data.jobPostings || [];
        const picked = postings.find((item) =>
            (jobCode && (item.bulletFields || []).some((field) => String(field).includes(jobCode)))
            || (jobCode && String(item.externalPath || '').includes(jobCode))
        ) || postings.find((item) => String(url).includes(String(item.externalPath || '')));

        if (!picked) return null;

        const locations = picked.locationsText
            ? picked.locationsText.split('|').map((x) => x.trim()).filter(Boolean)
            : [];

        return {
            title: picked.title || undefined,
            company: tenant.charAt(0).toUpperCase() + tenant.slice(1),
            companyWebsite: careersPath,
            type: this.inferType(undefined, picked.title, '', undefined),
            locations,
            applyLink: `${careersPath}${picked.externalPath || ''}`,
            notesHighlights: 'Parsed from Workday listing API',
        };
    }
}
