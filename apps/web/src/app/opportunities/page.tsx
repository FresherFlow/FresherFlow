'use client';

import { cn } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import { Input } from '@/components/ui/Input';
import { FeedPageSkeleton } from '@/components/ui/Skeleton';
import { useOpportunitiesFeed } from '@/features/jobs/hooks/useOpportunitiesFeed';
import { useAuth } from '@/contexts/AuthContext';
import { formatSyncTime } from '@/lib/offline/syncStatus';
import dynamic from 'next/dynamic';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';

const MobileFilterDrawer = dynamic(() => import('@/features/jobs/components/MobileFilterDrawer').then(m => m.MobileFilterDrawer));
const OpportunityFilters = dynamic(() => import('@/features/jobs/components/OpportunityFilters').then(m => m.OpportunityFilters));
const OpportunityGrid = dynamic(() => import('@/features/jobs/components/OpportunityGrid').then(m => m.OpportunityGrid));
const ProfileReadinessRequired = dynamic(() => import('@/features/jobs/components/ProfileReadinessRequired').then(m => m.ProfileReadinessRequired));

// Filters temporarily disabled

const typeParamToEnum = (value: string) => {
    const v = value.toLowerCase();
    if (v === 'job' || v === 'jobs' || v === 'full-time' || v === 'full time') return 'JOB';
    if (v === 'internship' || v === 'internships') return 'INTERNSHIP';
    if (v === 'walk-in' || v === 'walkin' || v === 'walkins' || v === 'walk-ins') return 'WALKIN';
    return value.toUpperCase();
};

const enumToTypeParam = (value: string) => {
    if (value === 'JOB') return 'job';
    if (value === 'INTERNSHIP') return 'internship';
    if (value === 'WALKIN') return 'walk-in';
    return value.toLowerCase();
};

function OpportunitiesContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const [search, setSearch] = useState('');
    const typeParam = searchParams.get('type');
    const selectedType = typeParam ? typeParamToEnum(typeParam) : null;

    const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
    const [closingSoon, setClosingSoon] = useState(false);
    const [showOnlySaved, setShowOnlySaved] = useState(false);
    const [minSalary, setMinSalary] = useState<number | null>(null);
    const [maxSalary, setMaxSalary] = useState<number | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    // Mobile Draft State
    const [draftSelectedLoc, setDraftSelectedLoc] = useState<string | null>(null);
    const [draftClosingSoon, setDraftClosingSoon] = useState(false);
    const [draftShowOnlySaved, setDraftShowOnlySaved] = useState(false);
    const [draftMinSalary, setDraftMinSalary] = useState<number | null>(null);
    const [draftMaxSalary, setDraftMaxSalary] = useState<number | null>(null);

    const activeFilterCount = (selectedLoc ? 1 : 0) + (closingSoon ? 1 : 0) + (showOnlySaved ? 1 : 0) + (minSalary ? 1 : 0);
    const [isOnline, setIsOnline] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.navigator.onLine : true
    );

    const {
        filteredOpps,
        totalCount,
        isLoading,
        error,
        usingCachedFeed,
        cachedAt,
        profileIncomplete,
        toggleSave,
        reload,
        hasMore,
        loadMore
    } = useOpportunitiesFeed({
        type: selectedType,
        selectedLoc,
        showOnlySaved,
        closingSoon,
        search,
        minSalary,
        maxSalary
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const updateType = (type: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (type) {
            params.set('type', enumToTypeParam(type));
        } else {
            params.delete('type');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const openMobileFilters = () => {
        setDraftSelectedLoc(selectedLoc);
        setDraftClosingSoon(closingSoon);
        setDraftShowOnlySaved(showOnlySaved);
        setDraftMinSalary(minSalary);
        setDraftMaxSalary(maxSalary);
        setIsMobileFilterOpen(true);
    };

    const applyMobileFilters = () => {
        setSelectedLoc(draftSelectedLoc);
        setClosingSoon(draftClosingSoon);
        setShowOnlySaved(draftShowOnlySaved);
        setMinSalary(draftMinSalary);
        setMaxSalary(draftMaxSalary);
        setIsMobileFilterOpen(false);
    };

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Job Opportunities Feed',
        'description': 'A verified list of jobs, internships, and walk-ins for freshers.',
        'numberOfItems': filteredOpps.length,
        'itemListElement': filteredOpps.slice(0, 10).map((opp, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'url': `https://fresherflow.in${getOpportunityPathFromItem(opp)}`,
            'name': opp.title
        }))
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="w-full max-w-7xl mx-auto px-3 md:px-6 pt-2 md:pt-0 pb-10 md:pb-20 space-y-4 md:space-y-8">
                {/* Header: Consolidated Search & Type selection */}
                <div className="flex flex-col gap-3.5 border-b border-border/60 pb-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="space-y-1">
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Browse the live feed</h1>
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-2" aria-live="polite">
                                <ShieldCheckIcon className="w-3.5 h-3.5 text-primary" />
                                Verified daily. {filteredOpps.length} results found.
                            </p>
                            {isLoading && (
                                <p className="sr-only" aria-live="assertive">
                                    Loading opportunities...
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest",
                                isOnline ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-amber-500/10 text-foreground dark:text-amber-300 border-amber-500/20"
                            )}>
                                {isOnline ? 'Network: Online' : 'Network: Offline'}
                            </div>
                            {usingCachedFeed && (
                                <div className="px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-foreground dark:text-amber-300 text-[10px] font-bold uppercase tracking-widest">
                                    Cached {formatSyncTime(cachedAt)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search & Main Category Filters */}
                    <div className="flex flex-col lg:flex-row gap-2.5">
                        <div className="flex gap-2.5 w-full lg:w-auto lg:flex-1">
                            <div className="relative flex-1 group">
                                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    type="text"
                                    placeholder="Search specific roles, skills, or companies..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-11 text-sm bg-card/50 border-border/80 focus:border-primary/50 transition-all rounded-xl"
                                    aria-label="Search job opportunities"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={openMobileFilters}
                                aria-haspopup="dialog"
                                aria-expanded={isMobileFilterOpen}
                                className="lg:hidden h-11 flex items-center shrink-0 gap-2 px-4 rounded-xl border border-border bg-card text-[10px] font-bold uppercase tracking-widest"
                            >
                                <FunnelIcon className="w-4 h-4" />
                                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/50">
                                {[
                                    { label: 'All', value: null },
                                    { label: 'Jobs', value: 'JOB' },
                                    { label: 'Internships', value: 'INTERNSHIP' },
                                    { label: 'Walk-ins', value: 'WALKIN' }
                                ].map((cat) => (
                                    <button
                                        key={cat.label}
                                        onClick={() => updateType(cat.value)}
                                        aria-pressed={selectedType === cat.value}
                                        className={cn(
                                            "h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                            selectedType === cat.value
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-background hover:text-foreground"
                                        )}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                aria-expanded={isFilterOpen}
                                aria-controls="filter-panel"
                                className={cn(
                                    "hidden lg:flex h-11 items-center gap-2 px-5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                                    isFilterOpen ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"
                                )}
                            >
                                <FunnelIcon className="w-4 h-4" />
                                {isFilterOpen ? 'Hide Panel' : 'Filters'}
                            </button>
                        </div>
                    </div>
                </div>

                <MobileFilterDrawer
                    isOpen={isMobileFilterOpen}
                    onClose={() => setIsMobileFilterOpen(false)}
                    draftLoc={draftSelectedLoc}
                    setDraftLoc={setDraftSelectedLoc}
                    draftClosingSoon={draftClosingSoon}
                    setDraftClosingSoon={setDraftClosingSoon}
                    draftShowOnlySaved={draftShowOnlySaved}
                    setDraftShowOnlySaved={setDraftShowOnlySaved}
                    draftMinSalary={draftMinSalary}
                    setDraftMinSalary={setDraftMinSalary}
                    onApply={applyMobileFilters}
                    onClear={() => {
                        setDraftSelectedLoc(null);
                        setDraftClosingSoon(false);
                        setDraftShowOnlySaved(false);
                        setDraftMinSalary(null);
                        setDraftMaxSalary(null);
                    }}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">
                    {isFilterOpen && (
                        <OpportunityFilters
                            id="filter-panel"
                            selectedLoc={selectedLoc}
                            setSelectedLoc={setSelectedLoc}
                            closingSoon={closingSoon}
                            setClosingSoon={setClosingSoon}
                            showOnlySaved={showOnlySaved}
                            setShowOnlySaved={setShowOnlySaved}
                            minSalary={minSalary}
                            setMinSalary={setMinSalary}
                            className="lg:col-span-3 lg:sticky lg:top-24 hidden lg:block"
                        />
                    )}

                    <div className={cn(
                        "transition-all duration-300",
                        isFilterOpen ? "lg:col-span-9" : "lg:col-span-12"
                    )}>
                        {profileIncomplete ? (
                            <ProfileReadinessRequired
                                percentage={profileIncomplete.percentage}
                                message={profileIncomplete.message}
                            />
                        ) : (
                            <OpportunityGrid
                                opportunities={filteredOpps}
                                isLoading={isLoading}
                                error={error}
                                isFilterOpen={isFilterOpen}
                                isAdmin={user?.role === 'ADMIN'}
                                onToggleSave={toggleSave}
                                onRetry={reload}
                                onClearFilters={() => {
                                    setSearch('');
                                    updateType(null);
                                    setSelectedLoc(null);
                                    setClosingSoon(false);
                                    setShowOnlySaved(false);
                                }}
                            />
                        )}

                        {!isLoading && !profileIncomplete && filteredOpps.length > 0 && (
                            <div className="mt-12 text-center pb-8 border-t border-border/50 pt-8 space-y-6">
                                {hasMore && (
                                    <button
                                        onClick={loadMore}
                                        className="h-11 px-8 rounded-xl border border-border bg-card text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-all"
                                    >
                                        Load More Opportunities
                                    </button>
                                )}
                                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                                    <div className="w-1 h-1 rounded-full bg-border" />
                                    {hasMore ? `Showing ${filteredOpps.length} of ${totalCount}` : `End of feed • ${totalCount} total listings`}
                                    <div className="w-1 h-1 rounded-full bg-border" />
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default function OpportunitiesPage() {
    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <OpportunitiesContent />
        </Suspense>
    );
}
