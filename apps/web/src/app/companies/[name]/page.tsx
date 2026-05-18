import { Suspense } from 'react';
import { Opportunity } from '@fresherflow/types';
import JobCard from '@/features/opportunities/components/JobCard';
import { SkeletonJobCard } from '@/components/ui/Skeleton';
import { ArrowLeftIcon, GlobeAltIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

export const revalidate = 3600;
export const dynamicParams = false; // Throw 404 for unknown companies instantly

export async function generateStaticParams() {
    const { fetchBootstrapFeed } = await import('@/lib/api/cdnFeed');
    const feed = await fetchBootstrapFeed();
    
    if (!feed?.opportunities) return [];
    
    const companyNames = new Set<string>();
    feed.opportunities.forEach(opp => {
        if (opp.company) companyNames.add(encodeURIComponent(opp.company));
    });
    
    return Array.from(companyNames).map(name => ({ name }));
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ name: string }> }) {
    const { name: encodedName } = await params;
    const companyName = decodeURIComponent(encodedName);

    const { fetchBootstrapFeed } = await import('@/lib/api/cdnFeed');
    const feed = await fetchBootstrapFeed();
    
    const allOpportunities = feed?.opportunities || [];
    const companyJobs = allOpportunities.filter(
        (opp) => opp.company?.toLowerCase() === companyName.toLowerCase()
    );

    if (companyJobs.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Company not found</h1>
                    <p className="text-muted-foreground">No active job listings found for {companyName}.</p>
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
            <div className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Link
                        href="/jobs"
                        className="p-2 hover:bg-muted rounded-xl transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <span className="font-bold truncate">{profile.name}</span>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border/60">
                    <div className="flex items-start gap-5">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            {profile.logo ? (
                                <div className="relative w-2/3 h-2/3">
                                    <Image
                                        src={profile.logo}
                                        alt={profile.name}
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <BriefcaseIcon className="w-1/2 h-1/2 text-muted-foreground/40" />
                            )}
                        </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {companyJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                jobId={job.id}
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
