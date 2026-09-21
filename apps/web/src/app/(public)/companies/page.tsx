import type { Metadata } from 'next';
import { fetchCompaniesMetadata, fetchFeedIndex } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { CompanySlugger } from '@/features/companies/utils/companySlugger';
import { getAtsName } from '@/features/jobs/utils/atsSource';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/features/navigation/HeaderPortal';
import CompaniesDirectoryClient, { CompanyDirectoryItem } from '@/features/companies/components/CompaniesDirectoryClient';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Companies Hiring Freshers in India',
    description: 'Browse companies hiring freshers in India and discover their active entry-level jobs, internships and off-campus opportunities.',
    alternates: { canonical: `${SITE_URL}/companies` },
};

export default async function CompaniesIndexPage() {
    const [companyList, feed] = await Promise.all([
        fetchCompaniesMetadata(),
        fetchFeedIndex(false, undefined, true),
    ]);

    const opportunities = feed?.opportunities || [];

    // Map opportunities to company slugs.
    // Source per opportunity uses the same getAtsName(applyLink || sourceLink || companyWebsite)
    // as the jobs Source filter, so role counts per source agree across pages.
    const companyData: Record<string, {
        name: string;
        slug: string;
        count: number;
        logoUrl?: string | null;
        website?: string | null;
        links: string[];
        sourceRoles: Record<string, number>;
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
                sourceRoles: {},
                companyStage: opp.companyStage,
                companySize: opp.companySize,
                companyIndustry: opp.companyIndustry || [],
                companyTopics: opp.companyTopics || [],
            };
        }
        companyData[slug].count++;
        const source = getAtsName(opp.applyLink || opp.sourceLink || opp.companyWebsite) || 'Website';
        companyData[slug].sourceRoles[source] = (companyData[slug].sourceRoles[source] || 0) + 1;
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
            sources: Object.entries(co.sourceRoles)
                .map(([name, roles]) => ({ name, roles }))
                .sort((a, b) => b.roles - a.roles || a.name.localeCompare(b.name)),
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
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Home</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Companies</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </HeaderPortal>
                <CompaniesDirectoryClient companies={companies} totalJobs={totalJobs} />
            </div>
        </div>
    );
}
