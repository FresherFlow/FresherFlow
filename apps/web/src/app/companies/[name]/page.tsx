import { Suspense } from 'react';
import type { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { Opportunity } from '@fresherflow/types';
import { getCompanyDomain } from '@fresherflow/utils';
import JobCard from '@/features/opportunities/components/JobCard';
import { SkeletonJobCard } from '@/components/ui/Skeleton';
import { ArrowLeftIcon, GlobeAltIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { SITE_URL } from '@/lib/runtimeConfig';

export const revalidate = 21600;
export const dynamicParams = true;

export async function generateStaticParams() {
    return [];
}

export async function generateMetadata(
    { params }: { params: Promise<{ name: string }> }
): Promise<Metadata> {
    const { name: encodedName } = await params;
    const { slugify } = await import('@fresherflow/utils');
    const slug = slugify(decodeURIComponent(encodedName));
    const base = (SITE_URL || 'https://fresherflow.in').replace(/\/+$/, '');
    const canonicalUrl = `${base}/companies/${slug}`;

    return {
        alternates: { canonical: canonicalUrl },
        robots: { index: true, follow: true },
    };
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ name: string }> }) {
    const { name: encodedName } = await params;
    const rawName = decodeURIComponent(encodedName);
    
    const { slugify } = await import('@fresherflow/utils');
    const slug = slugify(rawName);

    // If the requested URL is not a perfectly clean slug (legacy %20 or uppercase),
    // 301 redirect to the clean slugified version to fix Google Search Console 404s and SEO.
    if (encodedName !== slug) {
        permanentRedirect(`/companies/${slug}`);
    }

    const { fetchCompanyShard } = await import('@/lib/api/cdnFeed');
    const feed = await fetchCompanyShard(slug);
    
    const companyJobs = feed?.opportunities || [];

    if (companyJobs.length === 0) {
        notFound();
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
