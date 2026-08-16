'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSavedJobs } from '@/lib/hooks/useSavedJobs';
import type { Opportunity } from '@fresherflow/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import JobCard from '@/features/opportunities/components/JobCard';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { readFeedCache, getOpportunityFromCache } from '@/lib/api/offline/opportunitiesFeedCache';
import { AuthGate, ProfileGate } from '@/lib/components/ProfileGate';
import { SkeletonJobCard } from '@/features/opportunities/components/OpportunitySkeletons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/DropdownMenu';
import { Button } from '@/ui/Button';

function SavedJobsPageContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { savedJobsMap, toggleSavedJob } = useSavedJobs(user?.id);
    const [allOpportunities, setAllOpportunities] = useState<Opportunity[]>(() => {
        return readFeedCache()?.opportunities || [];
    });
    const [isLoading, setIsLoading] = useState(() => (readFeedCache()?.opportunities?.length || 0) === 0);

    useEffect(() => {
        async function loadFeed() {
            try {
                const feed = await fetchBootstrapFeed();
                if (feed?.opportunities) {
                    const cached = readFeedCache()?.opportunities || [];
                    const mergedMap = new Map<string, Opportunity>();
                    [...cached, ...feed.opportunities].forEach(o => mergedMap.set(o.id, o));
                    setAllOpportunities(Array.from(mergedMap.values()));
                }
            } catch (err) {
                console.error('Failed to fetch bootstrap feed:', err);
            } finally {
                setIsLoading(false);
            }
        }
        void loadFeed();
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'recent' | 'az'>('recent');

    const savedOpportunities = useMemo(() => {
        const oppMap = new Map<string, Opportunity>();
        allOpportunities.forEach(o => oppMap.set(o.id, o));

        // Get list of all saved IDs
        const savedIds = Object.keys(savedJobsMap).filter(id => savedJobsMap[id]);
        
        let list: Opportunity[] = savedIds.map(id => {
            const existing = oppMap.get(id) || getOpportunityFromCache(id);
            if (existing) return existing;
            // Fallback opportunity object for saved jobs not in current feed
            return ({
                id,
                title: 'Saved Job Opportunity',
                company: 'FresherFlow Listing',
                type: 'JOB',
                postedAt: new Date().toISOString(),
                batchYears: [2024, 2025, 2026],
                locations: ['Flexible / Remote'],
                requiredSkills: ['General'],
                applyUrl: '#',
                source: 'FresherFlow',
                freshness: 'RECENT',
                status: 'ACTIVE'
            } as unknown) as Opportunity;
        });

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            list = list.filter(opp => {
                const companyName = typeof opp.company === 'string' ? opp.company : (opp.company as any)?.name || '';
                return opp.title.toLowerCase().includes(query) || companyName.toLowerCase().includes(query);
            });
        }

        if (sortBy === 'az') {
            list.sort((a, b) => a.title.localeCompare(b.title));
        }

        return list;
    }, [allOpportunities, savedJobsMap, searchQuery, sortBy]);

    return (
        <div className="w-full max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer">
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Back
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Saved Jobs</h1>
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-2.5 py-0.5 tabular-nums">
                            {savedOpportunities.length} Saved
                        </span>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <div className="relative min-w-[220px] sm:min-w-[280px]">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by company or role..."
                            className="w-full h-9 pl-9 pr-3 text-xs bg-card/60 border border-border/60 backdrop-blur-xl rounded-xl placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary hover:border-border transition-all duration-150 ease-out shadow-sm"
                        />
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-2 bg-card/60 border-border/60 backdrop-blur-xl shadow-sm hover:bg-accent/50 active:scale-[0.97] transition-all duration-150 ease-out font-medium">
                                <FunnelIcon className="h-4 w-4" />
                                {sortBy === 'recent' ? 'Most Recent' : 'A-Z'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSortBy('recent')} className={sortBy === 'recent' ? 'bg-primary/10 text-primary font-medium' : ''}>
                                Most Recent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('az')} className={sortBy === 'az' ? 'bg-primary/10 text-primary font-medium' : ''}>
                                Alphabetical (A-Z)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {[1, 2, 3].map((i) => (
                        <SkeletonJobCard key={i} />
                    ))}
                </div>
            ) : savedOpportunities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 backdrop-blur-xl shadow-md p-12 text-center space-y-4 max-w-xl mx-auto animate-in fade-in-0 zoom-in-95 duration-200">
                    <div className="w-12 h-12 bg-muted/80 rounded-full flex items-center justify-center mx-auto text-muted-foreground/60">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-base font-bold tracking-tight text-foreground">No saved opportunities yet</h2>
                        <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                            Bookmark verified opportunities from the feed to compare and apply later.
                        </p>
                    </div>
                    <Link
                        href="/jobs"
                        className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 ease-out shadow-sm"
                    >
                        Browse Verified Jobs →
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {savedOpportunities.map((opp, index) => (
                        <div 
                            key={opp.id} 
                            role="listitem" 
                            className="animate-in fade-in-0 zoom-in-95 duration-200 fill-mode-both"
                            style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
                        >
                            <JobCard
                                job={{
                                    ...opp,
                                    normalizedRole: opp.title,
                                    salary: (opp.salaryMin !== undefined && opp.salaryMax !== undefined) ? { min: opp.salaryMin, max: opp.salaryMax } : undefined,
                                }}
                                jobId={opp.id}
                                isSaved={true}
                                onToggleSave={() => toggleSavedJob(opp.id)}
                                className="bg-card/60 border-border/60 backdrop-blur-xl shadow-md hover:shadow-lg hover:border-primary/40 active:scale-[0.97] transition-all duration-150 ease-out"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SavedJobsPage() {
    return (
        <AuthGate>
            <ProfileGate>
                <SavedJobsPageContent />
            </ProfileGate>
        </AuthGate>
    );
}
