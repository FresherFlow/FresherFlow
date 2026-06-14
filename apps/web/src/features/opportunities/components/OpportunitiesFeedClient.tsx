'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import { Input } from '@/ui/Input';
import { useOpportunitiesFeed } from '@/features/opportunities/hooks/useOpportunitiesFeed';
import { useAuth } from '@/lib/auth/AuthContext';
import dynamic from 'next/dynamic';
import { getOpportunityPathFromItem } from '@/features/opportunities/domain/opportunityPath';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { FilterDropdownBar, type FilterBarFilters } from '@/features/opportunities/components/FilterDropdownBar';
import { Opportunity } from '@fresherflow/types';

const MobileFilterDrawer = dynamic(() => import('@/features/opportunities/components/MobileFilterDrawer').then(m => m.MobileFilterDrawer));
const OpportunityGrid = dynamic(() => import('@/features/opportunities/components/OpportunityGrid').then(m => m.OpportunityGrid));
const ProfileReadinessRequired = dynamic(() => import('@/features/opportunities/components/ProfileReadinessRequired').then(m => m.ProfileReadinessRequired));

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

interface OpportunitiesFeedClientProps {
    initialData?: {
        opportunities: Opportunity[];
        total: number;
        cachedAt?: number;
    } | null;
}

export function OpportunitiesFeedClient({ initialData }: OpportunitiesFeedClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const [search, setSearch] = useState('');
    const typeParam = searchParams.get('type');
    const selectedType = typeParam ? typeParamToEnum(typeParam) : null;

    // Unified filter state
    const [filters, setFilters] = useState<FilterBarFilters>({
        location: null,
        sector: null,
        qualification: null,
        course: null,
        year: null,
        closingSoon: false,
        saved: false,
    });

    // Mobile draft state (kept separate so apply is atomic)
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [draftType, setDraftType] = useState<string | null>(null);
    const [draftLoc, setDraftLoc] = useState<string | null>(null);
    const [draftYear, setDraftYear] = useState<number | null>(null);
    const [draftClosingSoon, setDraftClosingSoon] = useState(false);
    const [draftShowOnlySaved, setDraftShowOnlySaved] = useState(false);
    const [draftSector, setDraftSector] = useState<string | null>(null);
    const [draftQualification, setDraftQualification] = useState<string | null>(null);
    const [draftCourse, setDraftCourse] = useState<string | null>(null);

    const mobileActiveCount =
        (filters.location ? 1 : 0) +
        (filters.closingSoon ? 1 : 0) +
        (filters.saved ? 1 : 0) +
        (filters.sector ? 1 : 0) +
        (filters.qualification ? 1 : 0) +
        (filters.course ? 1 : 0) +
        (filters.year ? 1 : 0);

    const {
        filteredOpps,
        totalCount,
        isLoading,
        error,
        profileIncomplete,
        toggleSave,
        reload,
        hasMore,
        loadMore
    } = useOpportunitiesFeed({
        type: selectedType,
        selectedLoc: filters.location,
        showOnlySaved: filters.saved,
        closingSoon: filters.closingSoon,
        search,
        sector: filters.sector,
        qualification: filters.qualification,
        course: filters.course,
        selectedYear: filters.year,
        initialData,
    });

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
        setDraftType(selectedType);
        setDraftLoc(filters.location);
        setDraftYear(filters.year);
        setDraftClosingSoon(filters.closingSoon);
        setDraftShowOnlySaved(filters.saved);
        setDraftSector(filters.sector);
        setDraftQualification(filters.qualification);
        setDraftCourse(filters.course);
        setIsMobileFilterOpen(true);
    };

    const applyMobileFilters = () => {
        updateType(draftType);
        setFilters({
            location: draftLoc,
            sector: draftSector,
            qualification: draftQualification,
            course: draftCourse,
            year: draftYear,
            closingSoon: draftClosingSoon,
            saved: draftShowOnlySaved,
        });
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
            'url': `${SITE_URL}${getOpportunityPathFromItem(opp)}`,
            'name': opp.title
        }))
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="w-full max-w-7xl mx-auto px-3 md:px-6 pt-2 md:pt-0 pb-10 md:pb-20 space-y-4 md:space-y-6">
                {/* Page header */}
                <div className="flex flex-col gap-4 pb-4">
                    {/* Top Row: Title on Left, Online/results on Right */}
                    <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
                        <div className="space-y-0.5 shrink-0">
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Browse the live feed</h1>
                            <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5" aria-live="polite">
                                <ShieldCheckIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                Verified daily. {filteredOpps.length} results found.
                            </p>
                        </div>

                        {/* Network status hidden */}
                    </div>

                    {/* Filter buttons on left row + Search Bar right next to them */}
                    <div className="flex gap-2.5 items-center justify-between flex-wrap pt-1">
                        <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto">
                            <div className="flex items-center gap-2 w-full lg:w-auto flex-1 lg:flex-none">
                                {/* Search box right next to the dropdown filters */}
                                <div className="relative flex-1 lg:w-96 group">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        type="text"
                                        placeholder="Search roles, skills, or companies..."
                                        value={search}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                                        className="pl-9 h-10 text-xs rounded-xl bg-card border-border shadow-sm w-full"
                                        aria-label="Search job opportunities"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Mobile filter button next to search */}
                                <button
                                    onClick={openMobileFilters}
                                    aria-haspopup="dialog"
                                    aria-expanded={isMobileFilterOpen}
                                    className="lg:hidden h-10 flex items-center justify-center gap-2 px-4 rounded-xl border border-border bg-card text-[10px] font-bold capitalize tracking-widest shrink-0"
                                >
                                    <FunnelIcon className="w-4 h-4" />
                                    {mobileActiveCount > 0 ? `Filters (${mobileActiveCount})` : 'Filters'}
                                </button>
                            </div>

                            {/* Desktop filter chips */}
                            <FilterDropdownBar
                                filters={filters}
                                setFilters={setFilters}
                                isLoggedIn={!!user}
                                selectedType={selectedType}
                                onTypeChange={updateType}
                            />
                        </div>
                    </div>
                </div>



                {/* Mobile drawer */}
                <MobileFilterDrawer
                    isOpen={isMobileFilterOpen}
                    onClose={() => setIsMobileFilterOpen(false)}
                    draftType={draftType}
                    setDraftType={setDraftType}
                    draftLoc={draftLoc}
                    setDraftLoc={setDraftLoc}
                    draftYear={draftYear}
                    setDraftYear={setDraftYear}
                    draftClosingSoon={draftClosingSoon}
                    setDraftClosingSoon={setDraftClosingSoon}
                    draftShowOnlySaved={draftShowOnlySaved}
                    setDraftShowOnlySaved={setDraftShowOnlySaved}
                    draftSector={draftSector}
                    setDraftSector={setDraftSector}
                    draftQualification={draftQualification}
                    setDraftQualification={setDraftQualification}
                    draftCourse={draftCourse}
                    setDraftCourse={setDraftCourse}
                    isLoggedIn={!!user}
                    onApply={applyMobileFilters}
                    onClear={() => {
                        setDraftType(null);
                        setDraftLoc(null);
                        setDraftYear(null);
                        setDraftClosingSoon(false);
                        setDraftShowOnlySaved(false);
                        setDraftSector(null);
                        setDraftQualification(null);
                        setDraftCourse(null);
                    }}
                />

                {/* Full-width grid — no sidebar */}
                <div>
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
                            isAdmin={user?.role === 'ADMIN'}
                            onToggleSave={toggleSave}
                            onRetry={reload}
                            onClearFilters={() => {
                                setSearch('');
                                updateType(null);
                                setFilters({ location: null, sector: null, qualification: null, course: null, year: null, closingSoon: false, saved: false });
                            }}
                        />
                    )}

                    {!isLoading && !profileIncomplete && filteredOpps.length > 0 && (
                        <div className="mt-12 text-center pb-8 border-t border-border/50 pt-8 space-y-6">
                            {hasMore && (
                                <button
                                    onClick={loadMore}
                                    className="h-11 px-8 rounded-xl border border-border bg-card text-[10px] font-bold capitalize tracking-widest hover:bg-muted transition-all"
                                >
                                    Load More Opportunities
                                </button>
                            )}
                            <p className="text-[10px] font-bold text-muted-foreground/40 capitalize tracking-[0.2em] flex items-center justify-center gap-3">
                                <span className="w-1 h-1 rounded-full bg-border" />
                                {hasMore ? `Showing ${filteredOpps.length} of ${totalCount}` : `End of feed - ${totalCount} total listings`}
                                <span className="w-1 h-1 rounded-full bg-border" />
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
