'use client';

import { AuthGate, ProfileGate } from '@/components/gates/ProfileGate';

import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import JobCard from '@/features/jobs/components/JobCard';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FeedPageSkeleton, SkeletonJobCard } from '@/components/ui/Skeleton';
import { useOpportunitiesFeed } from '@/features/jobs/hooks/useOpportunitiesFeed';
import { useAuth } from '@/contexts/AuthContext';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';

const FILTERS = {
    location: ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Remote'],
};

const CATEGORY_CONFIG = {
    JOB: {
        title: 'Jobs for Freshers',
        subtitle: 'Full-time opportunities across India',
        icon: BriefcaseIcon,
    },
    INTERNSHIP: {
        title: 'Internships',
        subtitle: 'Kickstart your career with hands-on experience',
        icon: AcademicCapIcon,
    },
    WALKIN: {
        title: 'Walk-in Drives',
        subtitle: 'Direct interview opportunities near you',
        icon: UserGroupIcon,
    },
};

interface CategoryPageProps {
    type: OpportunityType;
}

function CategoryPageContent({ type }: CategoryPageProps) {
    const router = useRouter();
    const { user } = useAuth();

    const [search, setSearch] = useState('');
    const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
    const [closingSoon, setClosingSoon] = useState(false);
    const [showOnlySaved, setShowOnlySaved] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [draftSelectedLoc, setDraftSelectedLoc] = useState<string | null>(null);
    const [draftClosingSoon, setDraftClosingSoon] = useState(false);
    const [draftShowOnlySaved, setDraftShowOnlySaved] = useState(false);
    const activeFilterCount = (selectedLoc ? 1 : 0) + (closingSoon ? 1 : 0) + (showOnlySaved ? 1 : 0);

    const config = CATEGORY_CONFIG[type];
    const IconComponent = config.icon;

    const {
        filteredOpps,
        totalCount,
        isLoading,
        error,
        profileIncomplete,
        toggleSave,
        reload
    } = useOpportunitiesFeed({
        type,
        selectedLoc,
        showOnlySaved,
        closingSoon,
        search
    });

    const isJobSaved = (opp: Opportunity) => {
        return opp.isSaved || false;
    };

    const isJobApplied = (opp: Opportunity) => {
        return opp.actions && opp.actions.length > 0;
    };

    const openMobileFilters = () => {
        setDraftSelectedLoc(selectedLoc);
        setDraftClosingSoon(closingSoon);
        setDraftShowOnlySaved(showOnlySaved);
        setIsMobileFilterOpen(true);
    };

    const applyMobileFilters = () => {
        setSelectedLoc(draftSelectedLoc);
        setClosingSoon(draftClosingSoon);
        setShowOnlySaved(draftShowOnlySaved);
        setIsMobileFilterOpen(false);
    };

    return (
        <AuthGate>
            <ProfileGate>
                <div className="w-full max-w-7xl mx-auto px-3 md:px-6 pb-12 md:pb-20 space-y-6 md:space-y-8">
                    {/* Desktop Header - Category Specific */}
                    <div className="hidden md:flex flex-col gap-3 border-b border-border/60 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/60 border border-border">
                                        <IconComponent className="w-4 h-4 text-foreground" />
                                    </div>
                                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                                        {config.title}
                                    </h1>
                                </div>
                                <p className="text-xs text-muted-foreground">{config.subtitle}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border uppercase tracking-wider">
                                    {filteredOpps.length} results
                                </span>
                                <Link
                                    href="/opportunities"
                                    className="text-[10px] font-semibold text-primary hover:underline uppercase tracking-widest"
                                >
                                    View all
                                </Link>
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={cn(
                                        "hidden lg:inline-flex h-8 items-center justify-center rounded-full border px-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                                        isFilterOpen ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <FunnelIcon className="w-4 h-4 mr-2" />
                                    {isFilterOpen ? 'Hide' : 'Filters'}
                                </button>
                                <button
                                    onClick={openMobileFilters}
                                    className="inline-flex lg:hidden h-8 items-center justify-center rounded-full border px-3 text-[10px] font-bold uppercase tracking-widest transition-all bg-background border-border text-muted-foreground hover:bg-muted"
                                >
                                    <FunnelIcon className="w-4 h-4 mr-2" />
                                    {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative w-full sm:w-72">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search by role or company..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-10 text-sm bg-background"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <button
                                onClick={() => setSelectedLoc(selectedLoc === 'Remote' ? null : 'Remote')}
                                className={cn(
                                    "h-8 px-3 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all",
                                    selectedLoc === 'Remote'
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                                )}
                            >
                                Remote
                            </button>
                            <button
                                onClick={() => setClosingSoon(!closingSoon)}
                                className={cn(
                                    "h-8 px-3 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all",
                                    closingSoon
                                        ? "bg-orange-100 border-orange-300 text-slate-900 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300"
                                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                                )}
                            >
                                Closing soon
                            </button>
                            <button
                                onClick={() => setShowOnlySaved(!showOnlySaved)}
                                className={cn(
                                    "h-8 px-3 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all",
                                    showOnlySaved
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                                )}
                            >
                                Saved
                            </button>
                        </div>
                    </div>

                    {/* Mobile Compact Search */}
                    <div className="md:hidden mt-2 space-y-2 border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search by role or company..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-10 text-sm bg-background"
                                />
                            </div>
                            <button
                                onClick={openMobileFilters}
                                className="inline-flex h-10 items-center justify-center rounded-lg border px-3 text-[10px] font-bold uppercase tracking-widest transition-all bg-background border-border text-muted-foreground hover:bg-muted"
                            >
                                <FunnelIcon className="w-4 h-4 mr-1.5" />
                                {activeFilterCount > 0 ? `${activeFilterCount}` : 'Filters'}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border uppercase tracking-wider">
                                {filteredOpps.length} results
                            </span>
                            <Link
                                href="/opportunities"
                                className="text-[10px] font-semibold text-primary hover:underline uppercase tracking-widest"
                            >
                                View all
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Filter Popup */}
                    {isMobileFilterOpen && (
                        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 lg:hidden">
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
                            <div className="relative w-full max-w-sm max-h-[85vh] overflow-auto rounded-3xl border border-border bg-card p-4 shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold tracking-tight text-foreground">Filters</h3>
                                    <button
                                        onClick={() => setIsMobileFilterOpen(false)}
                                        className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Location</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {FILTERS.location.map((loc) => (
                                                <button
                                                    key={`mobile-${loc}`}
                                                    onClick={() => setDraftSelectedLoc(draftSelectedLoc === loc ? null : loc)}
                                                    className={cn(
                                                        "px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all uppercase tracking-wide",
                                                        draftSelectedLoc === loc
                                                            ? "bg-primary/10 border-primary text-primary"
                                                            : "bg-background border-border text-muted-foreground"
                                                    )}
                                                >
                                                    {loc}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Urgency</h4>
                                        <button
                                            onClick={() => setDraftClosingSoon(!draftClosingSoon)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-3 rounded-xl border text-xs font-semibold transition-all uppercase tracking-wide",
                                                draftClosingSoon
                                                    ? "bg-orange-100 border-orange-300 text-slate-900 dark:bg-amber-500/10 dark:border-amber-500/50 dark:text-amber-300"
                                                    : "bg-background border-border text-muted-foreground"
                                            )}
                                        >
                                            <span>Closing soon</span>
                                            {draftClosingSoon && <div className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-amber-500" />}
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Saved</h4>
                                        <button
                                            onClick={() => setDraftShowOnlySaved(!draftShowOnlySaved)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-3 rounded-xl border text-xs font-semibold transition-all uppercase tracking-wide",
                                                draftShowOnlySaved
                                                    ? "bg-primary/10 border-primary text-primary"
                                                    : "bg-background border-border text-muted-foreground"
                                            )}
                                        >
                                            <span>Saved only</span>
                                            {draftShowOnlySaved && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="sticky bottom-0 bg-card pt-4 mt-6 border-t border-border flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-10 text-[10px] font-bold uppercase tracking-widest"
                                        onClick={() => {
                                            setDraftSelectedLoc(null);
                                            setDraftClosingSoon(false);
                                            setDraftShowOnlySaved(false);
                                        }}
                                    >
                                        Clear
                                    </Button>
                                    <Button
                                        className="flex-1 h-10 text-[10px] font-bold uppercase tracking-widest"
                                        onClick={applyMobileFilters}
                                    >
                                        Apply filters
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
                        {/* Control Panel (Sticky) */}
                        <aside className={cn(
                            "hidden lg:col-span-3 lg:space-y-6 lg:sticky lg:top-24",
                            isFilterOpen ? "lg:block" : "lg:hidden"
                        )}>
                            <div className="bg-card/80 rounded-2xl border border-border p-4 md:p-5 space-y-6">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Location</h3>
                                        {selectedLoc && (
                                            <button onClick={() => setSelectedLoc(null)} className="text-[10px] font-bold text-primary uppercase tracking-widest">Clear</button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                                        {FILTERS.location.map(loc => (
                                            <button
                                                key={loc}
                                                onClick={() => setSelectedLoc(selectedLoc === loc ? null : loc)}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-3 rounded-xl border text-xs font-semibold transition-all uppercase tracking-wide",
                                                    selectedLoc === loc
                                                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                                                        : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                            >
                                                <MapPinIcon className="w-4 h-4 opacity-70" />
                                                {loc}
                                            </button>
                                        ))
                                        }
                                    </div>
                                </div>

                                {/* Closing Soon Filter */}
                                <div>
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Urgency</h3>
                                    <button
                                        onClick={() => setClosingSoon(!closingSoon)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-3 rounded-xl border text-xs font-semibold transition-all text-left uppercase tracking-wide",
                                            closingSoon
                                                ? "bg-orange-100 border-orange-300 text-slate-900 dark:bg-amber-500/10 dark:border-amber-500/50 dark:text-amber-300 shadow-sm"
                                                : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>Closing Soon</span>
                                        </div>
                                        {closingSoon && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                                    </button>
                                </div>

                                {/* Saved Filter */}
                                <div>
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Saved</h3>
                                    <button
                                        onClick={() => setShowOnlySaved(!showOnlySaved)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-3 rounded-xl border text-xs font-semibold transition-all text-left uppercase tracking-wide",
                                            showOnlySaved
                                                ? "bg-primary/10 border-primary text-primary shadow-sm"
                                                : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <BookmarkIcon className="w-4 h-4" />
                                            <span>Saved only</span>
                                        </div>
                                        {showOnlySaved && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                    </button>
                                </div>
                            </div>
                        </aside>

                        {/* Opportunity Feed */}
                        <div className={cn(
                            "transition-all duration-300",
                            isFilterOpen ? "lg:col-span-9" : "lg:col-span-12"
                        )}>
                            {/* Feed Display */}
                            {profileIncomplete ? (
                                <div className="p-12 md:p-20 text-center rounded-2xl border border-border bg-card">
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <ShieldCheckIcon className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground tracking-tight mb-2">
                                        Profile Readiness Required
                                    </h3>
                                    <div className="max-w-md mx-auto space-y-6">
                                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                            {profileIncomplete.message}
                                        </p>
                                        <div className="bg-muted/50 p-6 rounded-xl border border-border">
                                            <div className="flex items-center justify-center gap-6">
                                                <div className="text-center">
                                                    <div className="text-3xl font-bold text-primary">{profileIncomplete.percentage}%</div>
                                                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.15em] mt-1">Current</div>
                                                </div>
                                                <div className="w-px h-10 bg-border" />
                                                <div className="text-center">
                                                    <div className="text-3xl font-bold text-foreground">100%</div>
                                                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.15em] mt-1">Goal</div>
                                                </div>
                                            </div>
                                        </div>
                                        <Button asChild className="h-12 px-8 text-sm font-bold uppercase tracking-widest">
                                            <Link href="/profile">
                                                Complete Profile
                                                <ChevronRightIcon className="w-4 h-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ) : isLoading ? (
                                <div className={cn(
                                    "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6",
                                    isFilterOpen ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-2 xl:grid-cols-3"
                                )}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                                        <SkeletonJobCard key={item} />
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
                                    <h3 className="text-lg font-bold text-foreground tracking-tight">Feed unavailable</h3>
                                    <p className="text-sm font-medium text-muted-foreground mt-2 max-w-sm mx-auto">
                                        {error}
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => reload()}
                                        className="mt-6 h-10 px-6 text-xs font-bold uppercase tracking-widest"
                                    >
                                        Retry
                                    </Button>
                                </div>
                            ) : filteredOpps.length === 0 ? (
                                <div className="p-20 text-center rounded-2xl border border-dashed border-border bg-card">
                                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                                        <MagnifyingGlassIcon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground tracking-tight">No results found</h3>
                                    <p className="text-sm font-medium text-muted-foreground mt-2 max-w-sm mx-auto">
                                        Try adjusting your filters or search keywords to find matching opportunities.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSearch('');
                                            setSelectedLoc(null);
                                            setClosingSoon(false);
                                            setShowOnlySaved(false);
                                        }}
                                        className="mt-6 h-11 px-6 text-sm font-bold uppercase tracking-widest"
                                    >
                                        Clear filters
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className={cn(
                                        "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6",
                                        isFilterOpen ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-2 xl:grid-cols-3"
                                    )}>
                                        {filteredOpps.map((opp) => (
                                            <JobCard
                                                key={opp.id}
                                                job={{
                                                    ...opp,
                                                    normalizedRole: opp.title,
                                                    salary: (opp.salaryMin !== undefined && opp.salaryMax !== undefined) ? { min: opp.salaryMin, max: opp.salaryMax } : undefined,
                                                }}
                                                jobId={opp.id}
                                                isSaved={isJobSaved(opp)}
                                                isApplied={isJobApplied(opp)}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                onClick={() => router.push(getOpportunityPathFromItem(opp))}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Feed Footer */}
                            {!isLoading && !profileIncomplete && filteredOpps.length > 0 && (
                                <div className="mt-12 text-center pb-8 border-t border-border pt-8">
                                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">
                                        Verified &bull; {totalCount} listings active
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </ProfileGate>
        </AuthGate>
    );
}

export default function CategoryPage({ type }: CategoryPageProps) {
    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <CategoryPageContent type={type} />
        </Suspense>
    );
}
