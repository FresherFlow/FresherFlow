'use client';

import { useEffect, useState, use } from 'react';
import { companiesApi, opportunitiesApi } from '@/lib/api/client';
import { Opportunity } from '@fresherflow/types';
import JobCard from '@/features/jobs/components/JobCard';
import { SkeletonJobCard } from '@/components/ui/Skeleton';
import { ArrowLeftIcon, GlobeAltIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type CompanyProfile = {
    name: string;
    website?: string;
    logo?: string;
    stats: {
        activeJobs: number;
    };
};

export default function CompanyProfilePage({ params }: { params: Promise<{ name: string }> }) {
    const { name: encodedName } = use(params);
    const companyName = decodeURIComponent(encodedName);
    const router = useRouter();

    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [jobs, setJobs] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [profileRes, jobsRes] = await Promise.all([
                    companiesApi.getByName(companyName),
                    opportunitiesApi.list({ company: companyName })
                ]) as [{ company: CompanyProfile }, { opportunities: Opportunity[] }];
                setProfile(profileRes.company);
                setJobs(jobsRes.opportunities || []);
            } catch (err) {
                console.error('Failed to load company profile:', err);
                setError('Company not found or failed to load.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [companyName]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 4].map(i => <SkeletonJobCard key={i} />)}
                    </div>
                </main>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Something went wrong</h1>
                    <p className="text-muted-foreground">{error || 'Could not find this company.'}</p>
                    <button onClick={() => router.back()} className="premium-button !w-fit px-6">Go back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Navigation Header */}
            <div className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-muted rounded-xl transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="font-bold truncate">{profile.name}</span>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                {/* Hero section */}
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
                                        unoptimized // external URLs from Clearbit
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
                                        href={profile.website}
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

                {/* Listings */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Open Opportunities</h2>
                    </div>

                    {jobs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {jobs.map((job) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    jobId={job.id}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center space-y-3">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <BriefcaseIcon className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-lg font-bold">No active jobs</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                We couldn&apos;t find any active job postings for {profile.name} at the moment.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
