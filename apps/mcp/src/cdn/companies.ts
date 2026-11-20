/**
 * Company reads from the public CDN catalog.
 *
 * Two files answer "does this company have jobs?" without an API call:
 *  - `companies.json` — the company directory (name, slug, site, logo);
 *  - `companies/{slug}.json` — that company's listings.
 *
 * The shard is the reason this tool exists: `get_jobs(company=…)` has to scan
 * the whole index, while the shard is one small file and is exact.
 */

import { fetchCatalogJson, resolveCatalogBase } from './client.js';
import {
    isLiveOpportunity,
    newestFirst,
    toJobSummary,
    type FeedOpportunity,
    type JobSummary,
} from './jobs.js';

export type CompanyRef = {
    name: string;
    slug: string;
    url: string | null;
    logoUrl: string | null;
};

export type CompanyJobsResult = {
    found: boolean;
    company: CompanyRef | null;
    pageUrl: string | null;
    hasLiveJobs: boolean;
    total: number;
    returned: number;
    truncated: boolean;
    jobs: JobSummary[];
};

const COMPANIES_TTL_MS = 5 * 60_000;
const MAX_JOBS = 50;

let companiesCache: { key: string; expiresAt: number; companies: CompanyRef[] } | undefined;

function asText(value: unknown): string { return typeof value === 'string' ? value : ''; }
function asNullableText(value: unknown): string | null { return typeof value === 'string' && value ? value : null; }

function toCompanyRef(value: unknown): CompanyRef | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    const name = asText(record.name).trim();
    const slug = asText(record.slug).trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!name || !slug) return null;
    return {
        name,
        slug,
        url: asNullableText(record.url),
        logoUrl: asNullableText(record.logo_url),
    };
}

async function loadCompanies(base: URL): Promise<CompanyRef[]> {
    if (companiesCache?.key === base.origin && companiesCache.expiresAt > Date.now()) {
        return companiesCache.companies;
    }
    const data = await fetchCatalogJson('/companies.json', base, { maxBytes: 4 * 1024 * 1024 });
    const companies = Array.isArray(data)
        ? data.map(toCompanyRef).filter((company): company is CompanyRef => company !== null)
        : [];
    companiesCache = { key: base.origin, expiresAt: Date.now() + COMPANIES_TTL_MS, companies };
    return companies;
}

function matchCompany(companies: CompanyRef[], query: string): CompanyRef | null {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    return companies.find((company) => company.slug.toLowerCase() === needle)
        ?? companies.find((company) => company.name.toLowerCase() === needle)
        ?? companies.find((company) => company.name.toLowerCase().includes(needle))
        ?? null;
}

export async function getCompanyJobs(query: string, baseUrl?: string, siteUrl = ''): Promise<CompanyJobsResult> {
    const base = resolveCatalogBase(baseUrl);
    const companies = await loadCompanies(base);
    const matched = matchCompany(companies, query);

    // Fall back to a slug guess so a company that has a shard but is missing
    // from the directory is still answerable. The shard is authoritative.
    const fallbackSlug = query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = matched?.slug ?? fallbackSlug;
    if (!slug) {
        return { found: false, company: null, pageUrl: null, hasLiveJobs: false, total: 0, returned: 0, truncated: false, jobs: [] };
    }

    const shard = await fetchCatalogJson(`/companies/${encodeURIComponent(slug)}.json`, base, {
        maxBytes: 12 * 1024 * 1024,
        timeoutMs: 8_000,
        optional: true,
    }) as { opportunities?: unknown; company?: unknown; slug?: unknown } | null;

    if (!shard) {
        // A known directory entry with no shard has no listings; an unknown
        // company is reported as not found so the agent can say so plainly.
        const company = matched ?? null;
        return {
            found: company !== null,
            company,
            pageUrl: company ? `${siteUrl}/companies/${encodeURIComponent(company.slug)}` : null,
            hasLiveJobs: false,
            total: 0,
            returned: 0,
            truncated: false,
            jobs: [],
        };
    }

    const company = matched ?? toCompanyRef({ name: shard.company, slug: shard.slug });
    const rows: FeedOpportunity[] = Array.isArray(shard.opportunities)
        ? shard.opportunities as FeedOpportunity[]
        : [];
    const now = Date.now();
    const live = rows.filter((row) => isLiveOpportunity(row, now)).sort(newestFirst);
    const jobs = live.slice(0, MAX_JOBS).map((row) => toJobSummary(row, siteUrl));

    return {
        found: company !== null,
        company,
        pageUrl: company ? `${siteUrl}/companies/${encodeURIComponent(company.slug)}` : null,
        hasLiveJobs: live.length > 0,
        total: live.length,
        returned: jobs.length,
        truncated: live.length > jobs.length,
        jobs,
    };
}
