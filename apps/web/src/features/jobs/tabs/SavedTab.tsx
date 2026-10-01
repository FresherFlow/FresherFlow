'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSavedJobs } from '@/features/dashboard/hooks/useSavedJobs';
import type { Opportunity } from '@fresherflow/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { JobSearchField } from '@/features/jobs/components/JobSearchField';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import { Bookmark } from 'lucide-react';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { readFeedCache, getOpportunityFromCache } from '@/lib/cache/opportunitiesFeedCache';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/DropdownMenu';
import { Button } from '@/ui/Button';
import { BrandButton } from '@/ui/BrandButton';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import SavedJobCard from '@/features/jobs/components/SavedJobCard';

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
                // Card-only view Ã¢â‚¬â€ lightweight index instead of the 2MB bootstrap.
                const feed = await fetchFeedIndex();
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

    const { savedJobs, unavailableIds } = useMemo(() => {
        const oppMap = new Map<string, Opportunity>();
        allOpportunities.forEach(o => oppMap.set(o.id, o));

        // Get list of all saved IDs
        const savedIds = Object.keys(savedJobsMap).filter(id => savedJobsMap[id]);

        const found: Opportunity[] = [];
        const missing: string[] = [];
        savedIds.forEach(id => {
            const existing = oppMap.get(id) || getOpportunityFromCache(id);
            if (existing) {
                found.push(existing);
            } else {
                // The saved ID is no longer in the feed or cache: the listing
                // expired or was removed. Keep only the ID Ã¢â‚¬â€ rendering a fake
                // title/company/apply link here would be a lie.
                missing.push(id);
            }
        });

        let list: Opportunity[] = found;
        let unavailable: string[] = missing;

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            list = list.filter(opp => {
                const companyName = typeof opp.company === 'string' ? opp.company : (opp.company as any)?.name || '';
                return opp.title.toLowerCase().includes(query) || companyName.toLowerCase().includes(query);
            });
            unavailable = unavailable.filter(() => 'unavailable listing'.includes(query));
        }

        if (sortBy === 'az') {
            list.sort((a, b) => a.title.localeCompare(b.title));
            unavailable.sort((a, b) => a.localeCompare(b));
        }

        return { savedJobs: list, unavailableIds: unavailable };
    }, [allOpportunities, savedJobsMap, searchQuery, sortBy]);

    return (
        <div className="w-full max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary active:scale-95 transition-all duration-150 ease-out cursor-pointer">
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Back
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Saved Jobs</h1>
                        {/* Split counts, because a single "9 saved" hid the fact
                            that three of those nine can no longer be opened. */}
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                            {savedJobs.length} saved
                        </span>
                        {unavailableIds.length > 0 && (
                            <span className="text-xs font-medium tabular-nums text-muted-foreground/70">
                                {unavailableIds.length} unavailable
                            </span>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <JobSearchField
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Filter by company or role..."
                        aria-label="Filter saved jobs"
                        className="min-w-55 sm:min-w-70"
                    />
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" aria-label="Sort saved jobs">
                                <FunnelIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">{sortBy === 'recent' ? 'Most Recent' : 'A-Z'}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSortBy('recent')} className={sortBy === 'recent' ? '  ' : ''}>
                                Most Recent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('az')} className={sortBy === 'az' ? '  ' : ''}>
                                Alphabetical (A-Z)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-3 lg:grid-cols-2" aria-hidden="true">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="flex flex-col gap-2.5 rounded-xs border border-border bg-card p-3 sm:flex-row sm:items-start"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <Skeleton className="h-10 w-10 shrink-0" />
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-2/5" />
                                    <Skeleton className="h-3 w-3/5" />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 sm:justify-start">
                                <Skeleton className="h-8 w-8 shrink-0" />
                                <Skeleton className="h-8 w-20 shrink-0" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : savedJobs.length === 0 && unavailableIds.length === 0 ? (
                <EmptyState
                    icon="inbox"
                    size="md"
                    className="mx-auto max-w-xl"
                    title="No saved opportunities yet"
                    description="Save current and active openings from the feed to compare and apply later."
                    /* `neutral`, not `solid`: the brand orange is for our own calls
                       to action on the landing page. Inside a saved-jobs empty
                       state it reads as a promo. */
                    action={
                        <BrandButton asChild variant="neutral" size="sm">
                            <Link href="/jobs">Find jobs shared by freshers</Link>
                        </BrandButton>
                    }
                />
            ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {savedJobs.map((opp) => (
                        <SavedJobCard
                            key={opp.id}
                            opp={opp}
                            isSaved
                            onToggleSave={() => toggleSavedJob(opp.id)}
                        />
                    ))}
                    {unavailableIds.map((id) => (
                        <div
                            key={`unavailable-${id}`}
                            className="flex min-w-0 flex-col gap-2.5 rounded-xs border border-border/50 bg-transparent p-3 sm:flex-row sm:items-start"
                        >
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-sm font-medium leading-snug text-muted-foreground">
                                        Unavailable listing
                                    </p>
                                    <p className="mt-1 truncate text-xs leading-snug text-muted-foreground/70">
                                        This listing expired or was removed.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:self-center">
                                <button
                                    type="button"
                                    onClick={() => toggleSavedJob(id)}
                                    aria-label="Remove unavailable listing from saved"
                                    title="Remove from saved"
                                    className="flex size-8 shrink-0 items-center justify-center rounded-xs border border-border/50 text-muted-foreground transition-colors hover:bg-muted"
                                >
                                    <Bookmark className="size-4" fill="currentColor" aria-hidden="true" />
                                </button>
                                <Link
                                    href="/jobs"
                                    className="inline-flex h-8 shrink-0 items-center justify-center px-4 font-semibold text-xs rounded-md border border-border hover:bg-muted transition-colors"
                                >
                                    Find similar
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SavedTab() {
    return <SavedJobsPageContent />;
}
