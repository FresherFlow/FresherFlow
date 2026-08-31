import type { Metadata } from 'next';
import { fetchCompaniesMetadata, fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { CompanySlugger } from '@/features/companies/utils/companySlugger';
import { parseJobUrl } from '@fresherflow/parser';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import CompaniesDirectoryClient, { CompanyDirectoryItem } from '@/features/companies/components/CompaniesDirectoryClient';

function detectAtsProvider(links: (string | null | undefined)[]): string | undefined {
    for (const link of links) {
        if (!link) continue;
        const parsed = parseJobUrl(link);
        if (parsed?.adapter) return parsed.adapter;
    }
    return undefined;
}

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Companies Hiring Freshers in India',
    description: 'Browse companies hiring freshers in India and discover their active entry-level jobs, internships and off-campus opportunities.',
    alternates: { canonical: `${SITE_URL}/companies` },
};

export default async function CompaniesIndexPage() {
    const [companyList, feed] = await Promise.all([
        fetchCompaniesMetadata(),
        fetchBootstrapFeed(false, undefined, true),
    ]);

    const opportunities = feed?.opportunities || [];

    // Map opportunities to company slugs and collect links for ATS detection
    const companyData: Record<string, {
        name: string;
        slug: string;
        count: number;
        logoUrl?: string | null;
        website?: string | null;
        links: string[];
        companyStage?: string | null;
        companySize?: string | null;
        companyIndustry?: string[];
        companyTopics?: string[];
    }> = {};

    const directory = companyList || [];
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
                companyStage: opp.companyStage,
                companySize: opp.companySize,
                companyIndustry: opp.companyIndustry || [],
                companyTopics: opp.companyTopics || [],
            };
        }
        companyData[slug].count++;
        if (opp.companyWebsite) companyData[slug].links.push(opp.companyWebsite);
        if (opp.applyLink) companyData[slug].links.push(opp.applyLink);
        if (opp.sourceLink) companyData[slug].links.push(opp.sourceLink);
        if (!companyData[slug].companyStage && opp.companyStage) companyData[slug].companyStage = opp.companyStage;
        if (!companyData[slug].companySize && opp.companySize) companyData[slug].companySize = opp.companySize;
        for (const ind of opp.companyIndustry || []) {
            if (!companyData[slug].companyIndustry!.includes(ind)) companyData[slug].companyIndustry!.push(ind);
        }
        for (const topic of opp.companyTopics || []) {
            if (!companyData[slug].companyTopics!.includes(topic)) companyData[slug].companyTopics!.push(topic);
        }
    }

    // Enrich active companies with logo/website from directory, but don't add dead ones.
    for (const item of directory) {
        const name = item.name;
        if (!name) continue;
        const slug = item.slug || slugify(name);
        // Only enrich — do NOT create new entries for companies with 0 live jobs.
        if (companyData[slug]) {
            if (item.url && !companyData[slug].website) {
                companyData[slug].website = item.url;
                companyData[slug].links.push(item.url);
            }
            if (item.logo_url && !companyData[slug].logoUrl) {
                companyData[slug].logoUrl = item.logo_url;
            }
        }
    }

    // Sort: active first (by count desc), then alphabetically
    const companies: CompanyDirectoryItem[] = Object.values(companyData)
        .filter((co) => co.count > 0)
        .map((co) => ({
            name: co.name,
            slug: co.slug,
            count: co.count,
            logoUrl: co.logoUrl,
            website: co.website,
            atsProvider: detectAtsProvider([co.website, ...co.links]),
            companyStage: co.companyStage,
            companySize: co.companySize,
            companyIndustry: co.companyIndustry,
            companyTopics: co.companyTopics,
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const totalJobs = opportunities.length;

    return (
        <div className="bg-background font-sans">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Companies' }]} />
                </HeaderPortal>
                <CompaniesDirectoryClient companies={companies} totalJobs={totalJobs} />
            </div>
        </div>
    );
}
