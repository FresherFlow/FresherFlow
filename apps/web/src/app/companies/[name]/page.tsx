import { Suspense } from 'react';
import { Opportunity } from '@fresherflow/types';
import { getCompanyDomain } from '@fresherflow/utils';
import JobCard from '@/features/opportunities/components/JobCard';
import { SkeletonJobCard } from '@/components/ui/Skeleton';
import { ArrowLeftIcon, GlobeAltIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import CompanyLogo from '@/components/ui/CompanyLogo';

export const revalidate = 21600;
export const dynamicParams = true; // Allow dynamic generation for newly added/unlisted jobs dynamically

export async function generateStaticParams() {
    const { fetchBootstrapFeed } = await import('@/lib/api/cdnFeed');
    const feed = await fetchBootstrapFeed();
    
    if (!feed?.opportunities) return [];
    
    // Support both direct company name routing and domain routing in static params
    const names = new Set<string>();
    feed.opportunities.forEach(opp => {
        if (opp.company) {
            names.add(opp.company);
            names.add(opp.company.toLowerCase().trim());
        }
        const domain = getCompanyDomain({
            companyWebsite: opp.companyWebsite,
            applyLink: opp.applyLink,
            sourceLink: opp.sourceLink,
        });
        if (domain) {
            names.add(domain);
        }
    });
    
    return Array.from(names).map(name => ({ name }));
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ name: string }> }) {
    const { name: encodedName } = await params;
    const slug = decodeURIComponent(encodedName); // could be a domain (wipro.com) or fallback name

    const { fetchBootstrapFeed } = await import('@/lib/api/cdnFeed');
    const feed = await fetchBootstrapFeed();
    
    const allOpportunities = feed?.opportunities || [];

    // Match by domain first, or fall back to company name matching to ensure the page always resolves correctly
    const companyJobs = allOpportunities.filter(opp => {
        const domain = getCompanyDomain({
            companyWebsite: opp.companyWebsite,
            applyLink: opp.applyLink,
            sourceLink: opp.sourceLink,
        });
        
        const slugLower = slug.toLowerCase().trim();
        
        // 1. Match by domain
        if (domain && domain.toLowerCase() === slugLower) return true;
        
        // 2. Match by company name directly
        if (opp.company?.toLowerCase().trim() === slugLower) return true;
        
        // 3. Fallback: handle clean matches (e.g. slugified versions or without spaces)
        const cleanSlug = slugLower.replace(/[^a-z0-9]/g, '');
        const cleanOppName = opp.company?.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanSlug && cleanSlug === cleanOppName) return true;
        
        return false;
    });

    if (companyJobs.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Company not found</h1>
                    <p className="text-muted-foreground">No active job listings found for {slug}.</p>
                    <Link href="/jobs" className="premium-button !w-fit px-6 inline-block">Browse all jobs</Link>
                </div>
            </div>
        );
    }

    const firstJob = companyJobs[0];
    const profile = {
        name: firstJob.company,
        logo: firstJob.companyLogoUrl,
        website: firstJob.companyWebsite, // if available in the feed
        stats: {
            activeJobs: companyJobs.length,
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border/60">
                    <div className="flex items-start gap-5">
                        <CompanyLogo
                            companyName={profile.name}
                            companyWebsite={profile.website}
                            companyLogoUrl={profile.logo}
                            applyLink={firstJob.applyLink}
                            className="w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem]"
                        />
                        <div className="space-y-2 pt-1">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                                {profile.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium">
                                {profile.website && (
                                    <a
                                        href={profile.website as string}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                                    >
                                        <GlobeAltIcon className="w-4 h-4" />
                                        Official Website
                                    </a>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <BriefcaseIcon className="w-4 h-4" />
                                    {profile.stats.activeJobs} Active Listings
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Open Opportunities</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {companyJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={{
                                    ...job,
                                    normalizedRole: job.title,
                                    salary: (job.salaryMin !== undefined && job.salaryMax !== undefined) ? { min: job.salaryMin, max: job.salaryMax } : undefined,
                                }}
                                jobId={job.id}
                                isApplied={(job.actions || []).some((a: any) => a.actionType === 'APPLIED')}
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
