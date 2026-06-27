'use client';

import { cn } from '@repo/ui/utils/cn';
import { useState, Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import dynamic from 'next/dynamic';

const OpportunityDetailPane = dynamic(() => import('./OpportunityDetailPane').then(m => m.OpportunityDetailPane));
import JobCard from '@/features/opportunities/components/JobCard';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import IdentificationIcon from '@heroicons/react/24/outline/IdentificationIcon';
import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import KeyIcon from '@heroicons/react/24/outline/KeyIcon';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { FeedPageSkeleton, SkeletonJobCard } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { useOpportunitiesFeed } from '@/features/opportunities/hooks/useOpportunitiesFeed';
import { useAuth } from '@/lib/auth/AuthContext';
import { FilterDropdownBar, type FilterBarFilters } from '@/features/opportunities/components/FilterDropdownBar';
import {
    GovtPhaseTabs,
    GovtCategoryFilter as GovtCategoryFilterComponent,
    GOVT_PHASE_STATUSES,
    GOVT_CATEGORIES,
    jobMatchesCategory,
    type GovtPhaseFilter,
    type GovtCategoryFilter,
} from '@/features/opportunities/components/GovtPhaseTabs';
const MobileFilterDrawer = dynamic(() =>
    import('@/features/opportunities/components/MobileFilterDrawer').then(m => m.MobileFilterDrawer)
);

// ─── Config ──────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
    JOB:        { title: 'Jobs for Freshers',          subtitle: 'Full-time opportunities across India',            icon: BriefcaseIcon },
    INTERNSHIP: { title: 'Internships',                subtitle: 'Kickstart your career with hands-on experience',  icon: AcademicCapIcon },
    WALKIN:     { title: 'Walk-in Drives',             subtitle: 'Direct interview opportunities near you',         icon: UserGroupIcon },
    REMOTE:     { title: 'Remote Opportunities',       subtitle: 'Fresh roles you can pursue from anywhere',        icon: BriefcaseIcon },
    GOVERNMENT: { title: 'Government Jobs',            subtitle: 'Official notices and public-sector openings',     icon: ShieldCheckIcon },
    HACKATHONS: { title: 'Hackathons',                 subtitle: 'Competitions, challenges, and builder programs',  icon: AcademicCapIcon },
} satisfies Record<OpportunityType, { title: string; subtitle: string; icon: typeof BriefcaseIcon }>;

// Phase groups displayed in "What's Happening Now" layout
const PHASE_GROUPS: { key: GovtPhaseFilter; label: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; urgency: 'high' | 'medium' | 'normal' }[] = [
    { key: 'ADMIT_CARD', label: 'Admit Card Out',      Icon: IdentificationIcon, urgency: 'high' },
    { key: 'APPLY_NOW',  label: 'Apply Now',           Icon: CheckCircleIcon,    urgency: 'high' },
    { key: 'ANSWER_KEY', label: 'Answer Key Released', Icon: KeyIcon,            urgency: 'medium' },
    { key: 'RESULT',     label: 'Result Declared',     Icon: TrophyIcon,         urgency: 'medium' },
    { key: 'UPCOMING',   label: 'Coming Soon',         Icon: ClockIcon,          urgency: 'normal' },
];

// Ticker tag styles per applicationStatus
const TICKER_TAG_MAP: Record<string, { tag: string; color: string }> = {
    ADMIT_CARD_RELEASED: { tag: 'Admit Card', color: 'bg-violet-500/20 text-violet-300' },
    RESULT_DECLARED:     { tag: 'Result Out', color: 'bg-emerald-500/20 text-emerald-300' },
    ANSWER_KEY_RELEASED: { tag: 'Answer Key', color: 'bg-amber-500/20 text-amber-300' },
    OPEN:                { tag: 'Apply Now',  color: 'bg-sky-500/20 text-sky-300' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveTicker({ items }: { items: { label: string; href: string; tag: string; tagColor: string }[] }) {
    if (items.length === 0) return null;
    const doubled = [...items, ...items];
    return (
        <div className="flex items-stretch bg-foreground text-background overflow-hidden rounded-xl text-xs font-semibold select-none">
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                LIVE
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
                <div
                    className="flex items-center whitespace-nowrap will-change-transform"
                    style={{ animation: `ticker ${Math.max(items.length * 7, 24)}s linear infinite` }}
                >
                    {doubled.map((item, i) => (
                        <Link
                            key={i}
                            href={item.href}
                            className="inline-flex items-center gap-2 px-4 py-2 hover:bg-background/10 transition-colors shrink-0"
                        >
                            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider', item.tagColor)}>
                                {item.tag}
                            </span>
                            <span className="text-background/90 text-xs">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

function GroupedGovtView({
    opps,
    govtCategory,
    isJobSaved,
    isJobApplied,
    toggleSave,
    user,
    onSelectPhase,
}: {
    opps: Opportunity[];
    govtCategory: GovtCategoryFilter;
    isJobSaved: (o: Opportunity) => boolean;
    isJobApplied: (o: Opportunity) => boolean;
    toggleSave: (id: string) => void;
    user: any;
    onSelectPhase: (phase: GovtPhaseFilter) => void;
}) {
    const groups = PHASE_GROUPS.map(group => {
        const statuses = GOVT_PHASE_STATUSES[group.key];
        const items = opps.filter(o => {
            const s = (o.governmentJobDetails as any)?.applicationStatus;
            if (!s || !statuses.includes(s)) return false;
            if (govtCategory !== null && !jobMatchesCategory(o.governmentJobDetails, govtCategory)) return false;
            return true;
        });
        return { ...group, items };
    }).filter(g => g.items.length > 0);

    if (groups.length === 0) return (
        <EmptyState
            title="No government jobs yet"
            description="Check back soon — new notifications are added regularly."
        />
    );

    return (
        <div className="space-y-8">
            {groups.map(group => (
                <div key={group.key} className="space-y-3">
                    {/* Group header */}
                    <div id="category-top-header" className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <group.Icon className="w-5 h-5 text-current" />
                            <h2 className="text-sm font-bold text-foreground tracking-tight">{group.label}</h2>
                            <span className={cn(
                                'text-[9px] font-bold px-2 py-0.5 rounded-full border',
                                group.urgency === 'high'   ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                group.urgency === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                             'bg-muted text-muted-foreground border-border'
                            )}>
                                {group.items.length} exam{group.items.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            onClick={() => onSelectPhase(group.key)}
                            className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                        >
                            View all <ChevronRightIcon className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Cards — max 4 visible */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {group.items.slice(0, 4).map((opp, index) => (
                            <JobCard
                                key={opp.id}
                                job={{
                                    ...opp,
                                    normalizedRole: opp.title,
                                    salary: (opp.salaryMin !== undefined && opp.salaryMax !== undefined)
                                        ? { min: opp.salaryMin, max: opp.salaryMax }
                                        : undefined,
                                }}
                                jobId={opp.id}
                                isSaved={isJobSaved(opp)}
                                isApplied={isJobApplied(opp)}
                                onToggleSave={() => toggleSave(opp.id)}
                                isAdmin={user?.role === 'ADMIN'}
                                priority={index < 2}
                            />
                        ))}
                    </div>

                    {group.items.length > 4 && (
                        <button
                            onClick={() => onSelectPhase(group.key)}
                            className="w-full h-10 text-xs font-semibold text-muted-foreground border border-dashed border-border rounded-xl hover:border-foreground/30 hover:text-foreground transition-colors"
                        >
                            + {group.items.length - 4} more in {group.label}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface CategoryPageProps {
    type: OpportunityType;
    initialData?: { opportunities: Opportunity[]; total: number; cachedAt?: number } | null;
}

function CategoryPageContent({ type, initialData }: CategoryPageProps) {
    const { user } = useAuth();
    const config = CATEGORY_CONFIG[type];


    const searchParams = useSearchParams();

    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
    const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

    useEffect(() => {
        setIsDesktop(window.innerWidth >= 1024);
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const handleSelectOpportunity = (opp: Opportunity) => {
        setSelectedOpp(opp);
        window.history.pushState({ modalOpen: true }, '', window.location.href);
    };

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
    
    const [search, setSearch]             = useState(searchParams?.get('q') || '');
    const [govtPhase, setGovtPhase]       = useState<GovtPhaseFilter>('ALL');
    const [govtCategory, setGovtCategory] = useState<GovtCategoryFilter>((searchParams?.get('category') as GovtCategoryFilter) || null);
    const [filters, setFilters]           = useState<FilterBarFilters>({
        location: null, year: null, closingSoon: false, saved: false, sector: null, qualification: null, course: null,
    });
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [draftLoc, setDraftLoc]                     = useState<string | null>(null);
    const [draftYear, setDraftYear]                   = useState<number | null>(null);
    const [draftClosingSoon, setDraftClosingSoon]     = useState(false);
    const [draftShowOnlySaved, setDraftShowOnlySaved] = useState(false);
    const [draftSector, setDraftSector]               = useState<string | null>(null);
    const [draftQualification, setDraftQualification] = useState<string | null>(null);
    const [draftCourse, setDraftCourse]               = useState<string | null>(null);
    const [mounted, setMounted]                       = useState(false);
    const [visibleCount, setVisibleCount]             = useState(20);

    useEffect(() => { setMounted(true); }, []);

    // Reset pagination when search or filters change
    useEffect(() => {
        setVisibleCount(20);
    }, [search, type, filters.location, filters.sector, filters.qualification, filters.course, filters.year, filters.closingSoon, filters.saved]);

    const mobileActiveCount =
        (filters.location ? 1 : 0) + (filters.closingSoon ? 1 : 0) + (filters.saved ? 1 : 0) +
        (filters.sector ? 1 : 0) + (filters.qualification ? 1 : 0) + (filters.course ? 1 : 0) + (filters.year ? 1 : 0);

    const { filteredOpps, isLoading, error, profileIncomplete, toggleSave, reload } = useOpportunitiesFeed({
        type,
        selectedLoc: filters.location,
        showOnlySaved: filters.saved,
        closingSoon: filters.closingSoon,
        sector: filters.sector,
        qualification: filters.qualification,
        course: filters.course,
        selectedYear: filters.year,
        search,
        initialData,
    });

    const phaseCounts = useMemo(() => {
        if (type !== OpportunityType.GOVERNMENT) return undefined;
        const counts: Partial<Record<GovtPhaseFilter, number>> = {};
        for (const [phase, statuses] of Object.entries(GOVT_PHASE_STATUSES)) {
            const key = phase as GovtPhaseFilter;
            counts[key] = key === 'ALL'
                ? filteredOpps.length
                : filteredOpps.filter(o => { const s = (o.governmentJobDetails as any)?.applicationStatus; return s && statuses.includes(s); }).length;
        }
        return counts;
    }, [filteredOpps, type]);

    const categoryCounts = useMemo(() => {
        if (type !== OpportunityType.GOVERNMENT) return undefined;
        const counts: Record<string, number> = {};
        for (const { label } of GOVT_CATEGORIES) {
            counts[label] = filteredOpps.filter(o => jobMatchesCategory(o.governmentJobDetails, label)).length;
        }
        return counts;
    }, [filteredOpps, type]);

    const tickerItems = useMemo(() => {
        if (type !== OpportunityType.GOVERNMENT) return [];
        const urgentStatuses = Object.keys(TICKER_TAG_MAP);
        return filteredOpps
            .filter(o => { const s = (o.governmentJobDetails as any)?.applicationStatus; return s && urgentStatuses.includes(s); })
            .slice(0, 14)
            .map(o => {
                const s = (o.governmentJobDetails as any)?.applicationStatus as string;
                const meta = TICKER_TAG_MAP[s] ?? { tag: s, color: 'bg-muted text-muted-foreground' };
                return { label: o.title, href: `/${o.slug}`, tag: meta.tag, tagColor: meta.color };
            });
    }, [filteredOpps, type]);

    const visibleOpps = filteredOpps.filter(opp => {
        if (filters.saved) return true;
        if (type !== OpportunityType.GOVERNMENT && opp.expiresAt && new Date(opp.expiresAt) < new Date()) return false;
        if (type === OpportunityType.GOVERNMENT && govtPhase !== 'ALL') {
            const s = (opp.governmentJobDetails as any)?.applicationStatus;
            if (!s || !GOVT_PHASE_STATUSES[govtPhase].includes(s)) return false;
        }
        if (type === OpportunityType.GOVERNMENT && govtCategory !== null) {
            if (!jobMatchesCategory(opp.governmentJobDetails, govtCategory)) return false;
        }
        return true;
    });

    // Auto-select first job on desktop
    useEffect(() => {
        if (isDesktop === true && !selectedOpp && visibleOpps.length > 0 && type !== OpportunityType.GOVERNMENT) {
            setSelectedOpp(visibleOpps[0]);
        }
    }, [isDesktop, selectedOpp, visibleOpps, type]);

    // Show grouped layout when on govt + All phase + no search/saved filter
    const showGroupedView = type === OpportunityType.GOVERNMENT && govtPhase === 'ALL' && !search && !filters.saved;

    const isJobSaved    = (opp: Opportunity) => opp.isSaved || false;
    const isJobApplied  = (opp: Opportunity) => !!(opp.actions && opp.actions.length > 0);

    const openMobileFilters = () => {
        setDraftLoc(filters.location); setDraftYear(filters.year); setDraftClosingSoon(filters.closingSoon);
        setDraftShowOnlySaved(filters.saved); setDraftSector(filters.sector);
        setDraftQualification(filters.qualification); setDraftCourse(filters.course);
        setIsMobileFilterOpen(true);
    };

    const applyMobileFilters = () => {
        setFilters({ location: draftLoc, year: draftYear, closingSoon: draftClosingSoon, saved: draftShowOnlySaved, sector: draftSector, qualification: draftQualification, course: draftCourse });
        setIsMobileFilterOpen(false);
    };

    const clearAll = () => {
        setSearch('');
        setFilters({ location: null, year: null, closingSoon: false, saved: false, sector: null, qualification: null, course: null });
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-3 md:px-6 pb-12 md:pb-20 space-y-4">

            {/* Live Ticker — govt only */}
            {type === OpportunityType.GOVERNMENT && mounted && tickerItems.length > 0 && (
                <LiveTicker items={tickerItems} />
            )}

            {/* Breadcrumb — except govt jobs as requested */}
            {type !== OpportunityType.GOVERNMENT && (
                <div className={cn("pt-2", selectedOpp && "hidden lg:block")}>
                    <Breadcrumb items={[
                        { label: 'Home', href: '/' },
                        { label: config.title, href: '#' }
                    ]} />
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-3 pb-2">
                <div className={cn("flex items-center justify-between gap-2", selectedOpp && "hidden lg:flex")}>
                    <h1 className="sr-only">{config.title} Feed</h1>
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5" aria-live="polite">
                        <ShieldCheckIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        {mounted && visibleOpps.length > 0 ? `Showing ${visibleOpps.length} jobs` : '0 jobs'}
                    </span>
                    {type !== OpportunityType.GOVERNMENT && (
                        <Link href="/opportunities" className="text-[10px] font-semibold text-primary hover:underline capitalize tracking-widest">
                            View all
                        </Link>
                    )}
                </div>

                {/* Phase + Category tabs — govt only */}
                {type === OpportunityType.GOVERNMENT && (
                    <div className="space-y-2">
                        <GovtPhaseTabs
                            active={govtPhase}
                            onChange={phase => { setGovtPhase(phase); setGovtCategory(null); }}
                            counts={phaseCounts}
                        />
                        <GovtCategoryFilterComponent
                            active={govtCategory}
                            onChange={setGovtCategory}
                            counts={categoryCounts}
                        />
                    </div>
                )}

                {/* Search + filters */}
                <div className={cn("flex gap-2.5 items-center justify-between flex-wrap", selectedOpp && "hidden lg:flex")}>
                    <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto">
                        <div className="flex items-center gap-2 w-full lg:w-auto flex-1 lg:flex-none">
                            <div className="relative flex-1 lg:w-96 group">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    type="text"
                                    placeholder="Search by role or company..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-9 h-10 text-xs rounded-xl bg-card border-border shadow-sm w-full"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={openMobileFilters}
                                className="lg:hidden h-11 flex items-center justify-center gap-2 px-4 rounded-xl border border-border bg-card text-[11px] font-bold capitalize tracking-widest shrink-0"
                            >
                                <FunnelIcon className="w-4 h-4" />
                                {mobileActiveCount > 0 ? `Filters (${mobileActiveCount})` : 'Filters'}
                            </button>
                        </div>
                        <FilterDropdownBar filters={filters} setFilters={setFilters} isLoggedIn={!!user} pageType={type} />
                    </div>
                </div>
            </div>

            {/* Mobile filter drawer */}
            <MobileFilterDrawer
                isOpen={isMobileFilterOpen}
                onClose={() => setIsMobileFilterOpen(false)}
                draftLoc={draftLoc} setDraftLoc={setDraftLoc}
                draftYear={draftYear} setDraftYear={setDraftYear}
                draftClosingSoon={draftClosingSoon} setDraftClosingSoon={setDraftClosingSoon}
                draftShowOnlySaved={draftShowOnlySaved} setDraftShowOnlySaved={setDraftShowOnlySaved}
                draftSector={draftSector} setDraftSector={setDraftSector}
                draftQualification={draftQualification} setDraftQualification={setDraftQualification}
                draftCourse={draftCourse} setDraftCourse={setDraftCourse}
                isLoggedIn={!!user}
                pageType={type}
                onApply={applyMobileFilters}
                onClear={() => {
                    setDraftLoc(null); setDraftYear(null); setDraftClosingSoon(false);
                    setDraftShowOnlySaved(false); setDraftSector(null);
                    setDraftQualification(null); setDraftCourse(null);
                }}
            />

            {/* Content area */}
            {profileIncomplete ? (
                <div className="p-12 md:p-20 text-center rounded-2xl border border-border bg-card">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheckIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">Profile Readiness Required</h2>
                    <div className="max-w-md mx-auto space-y-6">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">{profileIncomplete.message}</p>
                        <div className="bg-muted/50 p-6 rounded-xl border border-border">
                            <div className="flex items-center justify-center gap-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-primary">{profileIncomplete.percentage}%</div>
                                    <div className="text-[10px] text-muted-foreground font-bold capitalize tracking-[0.15em] mt-1">Current</div>
                                </div>
                                <div className="w-px h-10 bg-border" />
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-foreground">100%</div>
                                    <div className="text-[10px] text-muted-foreground font-bold capitalize tracking-[0.15em] mt-1">Goal</div>
                                </div>
                            </div>
                        </div>
                        <Button asChild className="h-12 px-8 text-sm font-bold capitalize tracking-widest">
                            <Link href="/profile">Complete Profile <ChevronRightIcon className="w-4 h-4 ml-2" /></Link>
                        </Button>
                    </div>
                </div>
            ) : isLoading ? (
                type === OpportunityType.GOVERNMENT ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        {[1,2,3,4,5,6].map(i => <SkeletonJobCard key={i} variant="default" />)}
                    </div>
                ) : (
                    <div className="w-full grid gap-6 items-start grid-cols-1 lg:grid-cols-[1.3fr_1.7fr]">
                        <div className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-4 md:gap-6">
                                {[1,2,3,4,5].map(i => <SkeletonJobCard key={i} variant="compact" />)}
                            </div>
                        </div>
                        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-8rem)] bg-card border border-border/50 rounded-2xl p-6">
                            <div className="animate-pulse rounded bg-muted h-8 w-1/2 mb-4" />
                            <div className="animate-pulse rounded bg-muted h-4 w-3/4 mb-8" />
                            <div className="space-y-4">
                                <div className="animate-pulse rounded bg-muted h-4 w-full" />
                                <div className="animate-pulse rounded bg-muted h-4 w-full" />
                                <div className="animate-pulse rounded bg-muted h-4 w-5/6" />
                            </div>
                        </div>
                    </div>
                )
            ) : error ? (
                <EmptyState
                    title="Feed unavailable"
                    description={error}
                    size="md"
                    action={<Button variant="outline" onClick={reload} className="h-10 px-6 text-xs font-bold capitalize tracking-widest">Retry</Button>}
                />
            ) : showGroupedView ? (
                // ── "What's Happening Now" grouped layout ──────────────────────
                <div className="space-y-2">
                    {mounted && (
                        <GroupedGovtView
                            opps={filteredOpps}
                            govtCategory={govtCategory}
                            isJobSaved={isJobSaved}
                            isJobApplied={isJobApplied}
                            toggleSave={toggleSave}
                            user={user}
                            onSelectPhase={phase => setGovtPhase(phase)}
                        />
                    )}
                </div>
            ) : visibleOpps.length === 0 ? (
                <EmptyState
                    title="No results found"
                    description="Try adjusting your filters or search keywords."
                    action={<Button variant="outline" onClick={clearAll} className="h-11 px-6 text-sm font-bold capitalize tracking-widest">Clear filters</Button>}
                />
            ) : (
                // ── Flat grid (filtered by phase / search) ─────────────────────
                <div className={cn(
                    "w-full grid gap-6 items-start",
                    type !== OpportunityType.GOVERNMENT ? "grid-cols-1 lg:grid-cols-[1.3fr_1.7fr]" : "grid-cols-1"
                )}>
                    {/* Left Column: list grid */}
                    <div id="category-grid-container" className={cn(
                        "min-w-0",
                        type !== OpportunityType.GOVERNMENT && "lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 custom-scrollbar"
                    )}>
                        <div className={cn('grid gap-4 md:gap-6', 
                            type === OpportunityType.GOVERNMENT 
                                ? 'grid-cols-1 lg:grid-cols-2' 
                                : 'grid-cols-1'
                        )}>
                            {visibleOpps.slice(0, visibleCount).map((opp, index) => (
                                <JobCard
                                    key={opp.id}
                                    job={{ ...opp, normalizedRole: opp.title, salary: (opp.salaryMin !== undefined && opp.salaryMax !== undefined) ? { min: opp.salaryMin, max: opp.salaryMax } : undefined }}
                                    jobId={opp.id}
                                    isSaved={isJobSaved(opp)}
                                    isApplied={isJobApplied(opp)}
                                    onToggleSave={() => toggleSave(opp.id)}
                                    isAdmin={user?.role === 'ADMIN'}
                                    isSelected={opp.id === selectedOpp?.id || opp.slug === selectedOpp?.slug}
                                    variant={type !== OpportunityType.GOVERNMENT ? "compact" : "default"}
                                    onClick={(e) => {
                                        if (type !== OpportunityType.GOVERNMENT) {
                                            e.preventDefault();
                                            handleSelectOpportunity(opp);
                                        }
                                    }}
                                    priority={index < 4}
                                />
                            ))}
                        </div>
                        {visibleCount < visibleOpps.length && (
                            <div className="flex justify-center pt-8 pb-4">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 20)}
                                    className="px-6 py-2.5 rounded-full bg-muted hover:bg-muted/80 text-sm font-bold text-foreground transition-colors"
                                >
                                    Load more opportunities
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Detail Panel / Empty State (Desktop only) */}
                    {type !== OpportunityType.GOVERNMENT && (
                        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-8rem)] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                            {selectedOpp ? (
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <OpportunityDetailPane
                                        oppId={selectedOpp.slug || selectedOpp.id}
                                        initialData={selectedOpp}
                                        onClose={handleCloseOpportunityPane}
                                    />
                                </div>
                            ) : visibleOpps.length > 0 ? (
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
                    )}

                    {/* Mobile Detail Modal */}
                    {selectedOpp && (
                        <div id="mobile-detail-modal" className={cn("lg:hidden fixed inset-0 z-[120] flex flex-col bg-background animate-in slide-in-from-bottom duration-300")}>
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
            )}

            {/* Footer info / SEO blurb */}
            <div className={cn("mt-16 pt-8 border-t border-border/50 space-y-6 max-w-3xl", selectedOpp && "hidden lg:block")}>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    {type === OpportunityType.WALKIN ? 'About Walk-in Interview Drives'
                    : type === OpportunityType.INTERNSHIP ? 'About Fresher Internships'
                    : type === OpportunityType.GOVERNMENT ? 'About Government Jobs'
                    : 'About Fresher Jobs'}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {type === OpportunityType.WALKIN
                        ? 'Walk-in interview drives are recruitment events where candidates can directly walk in for an interview without any prior appointment. Be sure to carry copies of your resume, academic certificates, and a valid photo ID.'
                    : type === OpportunityType.INTERNSHIP
                        ? 'Internships help fresh graduates gain practical experience, build portfolios, and establish professional connections. Many also lead to direct PPOs.'
                    : type === OpportunityType.GOVERNMENT
                        ? 'Explore verified official notifications and recruitment drives for Government organizations, PSUs, and Defense services. Stay updated with SSC, UPSC, Banking, and State-level commission openings.'
                    : 'Explore verified entry-level job listings for fresh graduates across India — spanning software, IT, finance, marketing, and operations.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-card border border-border/60">
                        <h3 className="text-xs font-bold text-foreground mb-1">
                            {type === OpportunityType.WALKIN ? 'What to bring?' : type === OpportunityType.GOVERNMENT ? 'Who can apply?' : 'How to qualify?'}
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {type === OpportunityType.WALKIN
                                ? 'Updated CV, graduation transcripts, and dress professionally.'
                            : type === OpportunityType.GOVERNMENT
                                ? 'Eligibility depends on the specific exam. Most require a 10th/12th, Diploma, or Degree with strict age limits and category relaxations.'
                            : 'Basic domain knowledge, a degree in a relevant field, and a strong learning attitude.'}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border/60">
                        <h3 className="text-xs font-bold text-foreground mb-1">Are these listings verified?</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {type === OpportunityType.GOVERNMENT
                                ? 'Yes, every listing is sourced directly from official government portals.'
                                : 'Yes, every listing is reviewed to ensure active apply links and genuine employer details.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Mobile Detail Modal/Drawer (Mobile/Tablet only) */}
            {selectedOpp && type !== OpportunityType.GOVERNMENT && (
                <div id="mobile-detail-modal" className="lg:hidden fixed inset-0 z-[120] flex flex-col bg-card animate-in slide-in-from-bottom duration-300">
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
    );
}

export default function CategoryPage({ type, initialData }: CategoryPageProps) {
    return (
        <Suspense fallback={<FeedPageSkeleton isGovt={type === OpportunityType.GOVERNMENT} />}>
            <CategoryPageContent type={type} initialData={initialData} />
        </Suspense>
    );
}
