import type { Metadata } from 'next';
import { fetchCompaniesMetadata, fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { detectAtsProvider } from '@/features/companies/utils/atsDetector';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import CompaniesDirectoryClient, { CompanyDirectoryItem } from '@/features/companies/components/CompaniesDirectoryClient';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Browse Companies Hiring Freshers | Monitored Directory',
    description: 'Explore all companies actively hiring freshers in India. Filter by active fresher jobs, ATS recruitment portals, and search by keywords.',
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
    }> = {};

    for (const opp of opportunities) {
        if (!opp.company) continue;
        const slug = slugify(opp.company);
        if (!companyData[slug]) {
            companyData[slug] = {
                name: opp.company,
                slug,
                count: 0,
                logoUrl: opp.companyLogoUrl,
                website: opp.companyWebsite,
                links: [],
            };
        }
        companyData[slug].count++;
        if (opp.companyWebsite) companyData[slug].links.push(opp.companyWebsite);
        if (opp.applyLink) companyData[slug].links.push(opp.applyLink);
        if (opp.sourceLink) companyData[slug].links.push(opp.sourceLink);
    }

    // Enrich active companies with logo/website from directory, but don't add dead ones.
    const directory = companyList || [];
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
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const totalJobs = opportunities.length;

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Companies' }]} />
                </HeaderPortal>
                <CompaniesDirectoryClient companies={companies} totalJobs={totalJobs} />
            </main>
        </div>
    );
}
