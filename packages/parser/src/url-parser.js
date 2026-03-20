"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlParser = void 0;
const axios_1 = __importDefault(require("axios"));
const index_1 = require("./index");
/**
 * Common HTML and Meta-based extraction helpers.
 */
class UrlParser {
    /**
     * Entry point to fetch and parse a raw URL from the web.
     */
    static async parseUrl(url) {
        const sourceType = this.detectSourceType(new URL(url).hostname);
        let html = '';
        try {
            const resp = await axios_1.default.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            html = resp.data;
        }
        catch (error) {
            return {
                parsed: {},
                meta: {
                    sourceType,
                    confidence: 0,
                    missing: ['content'],
                    warnings: [`fetch_failed: ${error.message}`],
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
        const semantic = (0, index_1.parseJobText)(`${title}\n${description}`);
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
    static cleanHtml(html) {
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
    }
    static extractFromJsonLd(html) {
        const scripts = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
            .map((match) => match[1]);
        for (const raw of scripts) {
            try {
                const parsed = JSON.parse(raw);
                const nodes = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
                for (const node of nodes) {
                    const type = String(node?.['@type'] || '').toLowerCase();
                    if (!type.includes('jobposting'))
                        continue;
                    const locationNodes = Array.isArray(node.jobLocation) ? node.jobLocation : node.jobLocation ? [node.jobLocation] : [];
                    const locations = locationNodes
                        .map((loc) => loc?.address?.addressLocality || loc?.address?.addressRegion || loc?.address?.addressCountry || loc?.name)
                        .filter(Boolean)
                        .map((value) => String(value));
                    return {
                        used: true,
                        title: node.title || undefined,
                        description: typeof node.description === 'string' ? this.cleanHtml(node.description) : undefined,
                        company: node.hiringOrganization?.name || undefined,
                        locations: locations.length > 0 ? locations : undefined,
                        applyLink: node.url || undefined,
                    };
                }
            }
            catch {
                continue;
            }
        }
        return { used: false };
    }
    static extractFromMeta(html) {
        const titleTag = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1]?.trim();
        const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]?.trim();
        const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1]?.trim();
        const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
        const title = ogTitle || this.cleanHtml(h1) || titleTag || undefined;
        const description = ogDesc || undefined;
        let company;
        if (titleTag && /job details\s*\|\s*/i.test(titleTag)) {
            company = titleTag.split('|').pop()?.trim();
        }
        return { title, description, company };
    }
    static detectSourceType(hostname) {
        const domain = hostname.toLowerCase();
        if (domain.includes('breezy.hr'))
            return 'BREEZY';
        if (domain.includes('hr.cloud.sap'))
            return 'SAP';
        if (domain.includes('myworkdayjobs.com'))
            return 'WORKDAY';
        return 'GENERIC';
    }
    /**
     * Specialized: WORKDAY listing API parsing.
     */
    static parseWorkdayResponse(data, jobCode) {
        const postingsData = data?.jobPostings;
        const postings = (postingsData || []);
        const picked = postings.find((item) => (jobCode && (item.bulletFields || []).some((field) => String(field).includes(jobCode)))
            || (jobCode && String(item.externalPath || '').includes(jobCode))) || postings.find((item) => String(item.externalPath || '').includes(jobCode));
        if (!picked)
            return null;
        const manualLocations = picked.locationsText
            ? picked.locationsText.split('|').map((x) => x.trim()).filter(Boolean)
            : [];
        const semantic = (0, index_1.parseJobText)(picked.title || '');
        return {
            ...semantic,
            title: picked.title || semantic.title,
            locations: manualLocations.length > 0 ? manualLocations : semantic.locations,
        };
    }
}
exports.UrlParser = UrlParser;
