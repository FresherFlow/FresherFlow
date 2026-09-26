import type { Metadata } from 'next';
import { Suspense } from 'react';
import { fetchCompaniesMetadata, fetchFeedIndex } from '@/lib/api/cdnFeed';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import CompaniesDirectoryClient from '@/features/companies/components/CompaniesDirectoryClient';
import CompaniesTabsClient from '@/features/companies/components/CompaniesTabsClient';
import { buildCompanyDirectory } from '@/features/companies/utils/companyDirectory';

// ISR: directory HTML is cached and revalidated hourly; the client tab
// switch (?tab=following) never changes the served HTML.
export const revalidate = 3600;

export const metadata: Metadata = {
    // 38 chars base + 13-char " | FresherFlow" template = 51 total (50-60).
    title: 'Companies Hiring Freshers in India 2026',
    description: 'Browse companies hiring freshers in India and discover their active entry-level jobs, internships and off-campus opportunities.',
    alternates: { canonical: `${SITE_URL}/companies` },
};

export default async function CompaniesIndexPage() {
    const [companyList, feed] = await Promise.all([
        fetchCompaniesMetadata(),
        fetchFeedIndex(false, undefined, true),
    ]);

    const opportunities = feed?.opportunities || [];

    // Live companies only, busiest first. The per-company counts come from the
    // same builder the followed-companies list reads, so "N roles" means the
    // same thing on /companies and in a user's Following tab.
    const companies = buildCompanyDirectory(opportunities, companyList || []);
    const totalJobs = opportunities.length;

    return (
        <div className="bg-background font-sans">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                {/* ?tab= is read client-side so the route stays static; the
                    directory is the fallback, so the public HTML keeps it. */}
                <Suspense fallback={<CompaniesDirectoryClient companies={companies} totalJobs={totalJobs} />}>
                    <CompaniesTabsClient companies={companies} totalJobs={totalJobs} />
                </Suspense>
            </div>
        </div>
    );
}
