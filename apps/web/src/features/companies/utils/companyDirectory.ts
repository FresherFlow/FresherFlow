import type { Opportunity } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils/slugify';
import { getAtsName } from '@/features/jobs/utils/atsSource';
import { CompanySlugger } from './companySlugger';
import type { CompanyDirectoryItem, CompanyDirectoryMeta, CompanyFollowSummary } from '../types';

interface CompanyAggregate {
    name: string;
    slug: string;
    count: number;
    logoUrl?: string | null;
    website?: string | null;
    links: string[];
    sourceRoles: Record<string, number>;
    companyStage?: string | null;
    companySize?: string | null;
    companyIndustry: string[];
    companyTopics: string[];
}

/**
 * Rolls the feed up per company. Slugs are resolved with CompanySlugger so a
 * company's roles land under the same slug the /companies/{slug} pages use —
 * this is why the count on a followed company matches its directory row.
 */
function aggregateCompanies(
    opportunities: Opportunity[],
    directory: CompanyDirectoryMeta[],
): Record<string, CompanyAggregate> {
    const companyData: Record<string, CompanyAggregate> = {};
    const slugger = new CompanySlugger(directory);

    for (const opp of opportunities) {
        if (!opp.company) continue;

        const slug = slugger.getSlug(opp);
        if (!slug) continue;

        if (!companyData[slug]) {
            companyData[slug] = {
                name: slugger.getCanonicalName(slug, opp.company),
                slug,
                count: 0,
                logoUrl: opp.companyLogoUrl,
                website: opp.companyWebsite,
                links: [],
                sourceRoles: {},
                companyStage: opp.companyStage,
                companySize: opp.companySize,
                companyIndustry: opp.companyIndustry || [],
                companyTopics: opp.companyTopics || [],
            };
        }

        const entry = companyData[slug];
        entry.count++;
        const source = getAtsName(opp.applyLink || opp.sourceLink || opp.companyWebsite) || 'Website';
        entry.sourceRoles[source] = (entry.sourceRoles[source] || 0) + 1;
        if (opp.companyWebsite) entry.links.push(opp.companyWebsite);
        if (opp.applyLink) entry.links.push(opp.applyLink);
        if (opp.sourceLink) entry.links.push(opp.sourceLink);
        if (!entry.companyStage && opp.companyStage) entry.companyStage = opp.companyStage;
        if (!entry.companySize && opp.companySize) entry.companySize = opp.companySize;
        for (const ind of opp.companyIndustry || []) {
            if (!entry.companyIndustry.includes(ind)) entry.companyIndustry.push(ind);
        }
        for (const topic of opp.companyTopics || []) {
            if (!entry.companyTopics.includes(topic)) entry.companyTopics.push(topic);
        }
    }

    // Enrich active companies with logo/website from the directory — but never
    // create entries for companies with 0 live jobs.
    for (const item of directory) {
        if (!item.name) continue;
        const entry = companyData[item.slug || slugify(item.name)];
        if (!entry) continue;
        if (item.url && !entry.website) {
            entry.website = item.url;
            entry.links.push(item.url);
        }
        if (item.logo_url && !entry.logoUrl) {
            entry.logoUrl = item.logo_url;
        }
    }

    return companyData;
}

/**
 * A company can arrive under two different slugs when its roles carry two
 * different logo domains: `CompanySlugger` derives the slug from the Clearbit
 * domain first, so `modulr.com` and `modulrfinance.com` both render as
 * "Modulr" but aggregate to two separate rows with split role counts. The
 * website is the authoritative identity, so entries sharing a host are the
 * same company and their counts are summed.
 */
function mergeByWebsite(items: CompanyDirectoryItem[]): CompanyDirectoryItem[] {
    const byHost = new Map<string, CompanyDirectoryItem>();

    for (const item of items) {
        let host: string | null = null;
        if (item.website) {
            try {
                host = new URL(item.website).hostname.toLowerCase().replace(/^www\./, '');
            } catch {
                host = null;
            }
        }
        if (!host) {
            byHost.set(`~${item.slug}`, item);
            continue;
        }

        const existing = byHost.get(host);
        if (!existing) {
            byHost.set(host, item);
            continue;
        }

        byHost.set(host, {
            ...existing,
            // Keep whichever slug carries more roles so the link points at the
            // busier of the two, and sum so neither set of roles goes missing.
            slug: item.count > existing.count ? item.slug : existing.slug,
            count: existing.count + item.count,
            logoUrl: existing.logoUrl ?? item.logoUrl,
            website: existing.website ?? item.website,
            sources: [...(existing.sources ?? []), ...(item.sources ?? [])],
        });
    }

    return Array.from(byHost.values());
}

/** The /companies directory: live companies only, busiest first, then A–Z. */
export function buildCompanyDirectory(
    opportunities: Opportunity[],
    directory: CompanyDirectoryMeta[],
): CompanyDirectoryItem[] {
    return mergeByWebsite(
        Object.values(aggregateCompanies(opportunities, directory))
            .filter((co) => co.count > 0)
            .map((co) => ({
                name: co.name,
                slug: co.slug,
                count: co.count,
                logoUrl: co.logoUrl,
                website: co.website,
                sources: Object.entries(co.sourceRoles)
                    .map(([name, roles]) => ({ name, roles }))
                    .sort((a, b) => b.roles - a.roles || a.name.localeCompare(b.name)),
                companyStage: co.companyStage,
                companySize: co.companySize,
                companyIndustry: co.companyIndustry,
                companyTopics: co.companyTopics,
            }))
    ).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * slug → the few fields the followed-companies list renders (real name, logo,
 * website, live role count). Built from the same aggregation as the directory,
 * so a followed company can never disagree with its /companies row.
 */
export function buildCompanyFollowMap(
    opportunities: Opportunity[],
    directory: CompanyDirectoryMeta[],
): Record<string, CompanyFollowSummary> {
    const map: Record<string, CompanyFollowSummary> = {};
    for (const company of buildCompanyDirectory(opportunities, directory)) {
        map[company.slug] = {
            name: company.name,
            logoUrl: company.logoUrl ?? null,
            website: company.website ?? null,
            count: company.count,
        };
    }
    return map;
}
