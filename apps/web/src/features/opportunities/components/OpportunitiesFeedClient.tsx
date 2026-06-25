'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';

const PAGE_SIZE = 20;
import { cn } from '@repo/ui/utils/cn';
import { OpportunityDetailPane } from './OpportunityDetailPane';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import { Input } from '@/ui/Input';
import { useOpportunitiesFeed } from '@/features/opportunities/hooks/useOpportunitiesFeed';
import { useAuth } from '@/lib/auth/AuthContext';
import { EmptyState } from '@/ui/EmptyState';
import dynamic from 'next/dynamic';
import { getOpportunityPathFromItem } from '@/features/opportunities/domain/opportunityPath';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { FilterDropdownBar, type FilterBarFilters } from '@/features/opportunities/components/FilterDropdownBar';
import { Opportunity } from '@fresherflow/types';
import { Breadcrumb } from '@/ui/Breadcrumb';

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

    const queryParam = searchParams.get('query') || searchParams.get('q') || searchParams.get('skill') || '';
    const [search, setSearch] = useState(queryParam);
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const leftColumnRef = useRef<HTMLDivElement>(null);
    const typeParam = searchParams.get('type');
    const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

    useEffect(() => {
        const checkSize = () => setIsDesktop(window.innerWidth >= 1024);
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);

    useEffect(() => {
        setSearch(queryParam);
    }, [queryParam]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (!event?.state || !event.state.modalOpen) {
                setSelectedOpp(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (!selectedOpp) return;
        if (window.innerWidth >= 1024) return; // Only lock scroll on mobile
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedOpp]);

    const handleSelectOpportunity = useCallback((opp: Opportunity) => {
        setSelectedOpp(opp);
        window.history.pushState({ modalOpen: true }, '', window.location.href);
    }, []);

    const handleCloseOpportunityPane = () => {
        const mobileModal = document.getElementById('mobile-detail-modal');
        if (mobileModal) {
            mobileModal.classList.remove('animate-in', 'slide-in-from-bottom');
            mobileModal.classList.add('animate-out', 'slide-out-to-bottom', 'fade-out', 'duration-300');
        }
        setTimeout(() => {
            setSelectedOpp(null);
            if (window.history.state?.modalOpen) window.history.back();
        }, 250);
    };
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
        isLoading,
        error,
        profileIncomplete,
        toggleSave,
        reload
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

    // Reset whenever filters or search change
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
        setSelectedOpp(null);
    }, [search, selectedType, filters.location, filters.sector, filters.qualification, filters.course, filters.year, filters.closingSoon, filters.saved]);

    // Auto-select first job on desktop
    useEffect(() => {
        if (isDesktop === true && !selectedOpp && filteredOpps.length > 0) {
            setSelectedOpp(filteredOpps[0]);
        }
    }, [isDesktop, selectedOpp, filteredOpps]);

    const pagedOpps = filteredOpps.slice(0, visibleCount);
    const pageEnd = pagedOpps.length;

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
                
                <div className={cn("pt-2", selectedOpp && "hidden lg:block")}>
                    <Breadcrumb items={[
                        { label: 'Home', href: '/' },
                        { label: 'All Opportunities', href: '#' }
                    ]} />
                </div>

                {/* Page header */}
                <div className="flex flex-col gap-3 pb-2">
                    {/* Count pill — top right */}
                    <div className="flex items-center justify-between gap-2">
                        <h1 className="sr-only">Job Opportunities Feed</h1>
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5" aria-live="polite">
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                            {filteredOpps.length > 0 ? `Showing ${pageEnd} of ${filteredOpps.length} jobs` : '0 jobs'}
                        </span>
                    </div>

                    {/* Filter buttons on left row + Search Bar right next to them */}
                    <div id="search-box-top" className="flex gap-2.5 items-center justify-between flex-wrap pt-1">
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

                {/* Master-Detail Layout */}
                <div>
                    {profileIncomplete ? (
                        <ProfileReadinessRequired
                            percentage={profileIncomplete.percentage}
                            message={profileIncomplete.message}
                        />
                    ) : (
                        <div className="w-full grid grid-cols-1 lg:grid-cols-[1.3fr_1.7fr] gap-6 items-start">
                            {/* Left Column: Grid list */}
                            <div className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 custom-scrollbar" ref={leftColumnRef}>
                                <OpportunityGrid
                                    opportunities={pagedOpps}
                                    isLoading={isLoading}
                                    error={error}
                                    isAdmin={user?.role === 'ADMIN'}
                                    onToggleSave={toggleSave}
                                    onRetry={reload}
                                    isSplitView={true}
                                    selectedOppId={selectedOpp?.id}
                                    onSelectOpportunity={handleSelectOpportunity}
                                    onClearFilters={() => {
                                        setSearch('');
                                        updateType(null);
                                        setFilters({ location: null, sector: null, qualification: null, course: null, year: null, closingSoon: false, saved: false });
                                    }}
                                />
                                {visibleCount < filteredOpps.length && (
                                    <div className="flex justify-center pt-8 pb-4">
                                        <button
                                            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                                            className="px-6 py-2.5 rounded-full bg-muted hover:bg-muted/80 text-sm font-bold text-foreground transition-colors"
                                        >
                                            Load more opportunities
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Detail Panel / Empty State (Desktop only) */}
                            <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-8rem)] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                                {selectedOpp ? (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        <OpportunityDetailPane
                                            oppId={selectedOpp.slug || selectedOpp.id}
                                            initialData={selectedOpp}
                                            onClose={handleCloseOpportunityPane}
                                        />
                                    </div>
                                ) : filteredOpps.length > 0 ? (
                                    <div className="flex-1 p-8 animate-pulse flex flex-col gap-4">
                                        <div className="h-8 bg-muted/50 rounded w-1/2" />
                                        <div className="h-4 bg-muted/50 rounded w-1/4" />
                                        <div className="h-40 bg-muted/50 rounded-xl w-full mt-4" />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center bg-muted/20">
                                        <EmptyState
                                            title="Select an opportunity"
                                            description="Click on an opportunity card from the list to view its complete details here."
                                            icon="search"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                            {/* Mobile Detail Modal/Drawer (Mobile/Tablet only) */}
                            {selectedOpp && isDesktop === false && (
                                <div id="mobile-detail-modal" className="lg:hidden fixed inset-0 z-[120] flex flex-col bg-background animate-in slide-in-from-bottom duration-300">
                                    {/* Safe area padding */}
                                    <div className="pt-[env(safe-area-inset-top)] bg-card shrink-0" />
                                    <div className="flex-1 flex flex-col min-h-0">
                            <OpportunityDetailPane
                                oppId={selectedOpp.slug || selectedOpp.id}
                                initialData={selectedOpp}
                                onClose={handleCloseOpportunityPane}
                                isMobile={true}
                            />
                        </div>
                    </div>
                )}
                </div>
            </div>
        </>
    );
}
