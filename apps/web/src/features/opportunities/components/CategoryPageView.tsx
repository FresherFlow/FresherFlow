import { cn } from '@repo/ui/utils/cn';
import { useMemo, useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFeedHeader } from '@/lib/context/FeedHeaderContext';
import Link from 'next/link';
import { getAtsName } from '@/features/opportunities/hooks/useOpportunitiesFeed';
import { useRouter } from 'next/navigation';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import dynamic from 'next/dynamic';

const OpportunityDetailPane = dynamic(() => import('./OpportunityDetailPane').then(m => m.OpportunityDetailPane));
import JobCard from '@/features/opportunities/components/JobCard';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import Squares2X2Icon from '@heroicons/react/24/outline/Squares2X2Icon';
import Bars3Icon from '@heroicons/react/24/outline/Bars3Icon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import ChevronUpIcon from '@heroicons/react/24/solid/ChevronUpIcon';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SkillPill } from '@/ui/SkillPill';
import { Button } from '@/ui/Button';
import { Hint } from '@/ui/Tooltip';
import { Input } from '@/ui/Input';
import { SkeletonJobCard, OpportunityDetailSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { EmptyState } from '@/ui/EmptyState';
import { FilterDropdownBar } from '@/features/opportunities/components/FilterDropdownBar';
import {
    GovtPhaseTabs,
    GovtCategoryFilter as GovtCategoryFilterComponent,
} from '@/features/opportunities/components/GovtPhaseTabs';
import { type CategoryPageState } from '@/features/opportunities/hooks/useCategoryPageState';
import { formatJobFeedTitle } from '@/features/opportunities/utils/formatJobFeedTitle';

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

// Ticker tag styles per applicationStatus
const TICKER_TAG_MAP: Record<string, { tag: string; color: string }> = {
    ADMIT_CARD_RELEASED: { tag: 'Admit Card', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20' },
    RESULT_DECLARED:     { tag: 'Result Out',  color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
    ANSWER_KEY_RELEASED: { tag: 'Answer Key', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
    OPEN:                { tag: 'Apply Now',  color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveTicker({ items }: { items: { label: string; href: string; tag: string; tagColor: string }[] }) {
    if (items.length === 0) return null;

    // Ensure there are at least 4 items so continuous marquee scrolls smoothly without gaps
    const baseItems = items.length === 1
        ? [items[0], items[0], items[0], items[0]]
        : items.length === 2
        ? [items[0], items[1], items[0], items[1]]
        : items;
    const doubled = [...baseItems, ...baseItems];

    return (
        <div className="flex items-center gap-2 px-2.5 py-1 bg-muted/40 border border-border/60 rounded-xl text-xs max-w-md w-full overflow-hidden h-8 select-none">
            <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-foreground/10 text-foreground font-bold text-[10px] uppercase tracking-wider border border-foreground/10 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                LIVE
            </div>
            <div className="overflow-hidden flex-1 min-w-0 flex items-center">
                <div
                    className="flex items-center whitespace-nowrap will-change-transform"
                    style={{ animation: `ticker ${Math.max(baseItems.length * 7, 24)}s linear infinite` }}
                >
                    {doubled.map((item, i) => (
                        <Link
                            key={i}
                            href={item.href}
                            className="inline-flex items-center gap-2 px-4 py-1 hover:text-primary transition-colors shrink-0 text-xs font-medium text-foreground/80"
                        >
                            {item.tag && item.tag !== 'Apply Now' && (
                                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider', item.tagColor)}>
                                    {item.tag}
                                </span>
                            )}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Presenter ────────────────────────────────────────────────────────────────

export function CategoryPageView({
    type, user, opportunities, filteredOpps, visibleOpps, isLoading, error, profileIncomplete, mounted, isDesktop,
    selectedOpp, handleSelectOpportunity, handleCloseOpportunityPane,
    search, setSearch, filters, setFilters,
    govtPhase, setGovtPhase, govtCategory, setGovtCategory, phaseCounts, categoryCounts,
    isMobileFilterOpen, setIsMobileFilterOpen, draftLoc, setDraftLoc, draftYear, setDraftYear,
    draftClosingSoon, setDraftClosingSoon, draftShowOnlySaved, setDraftShowOnlySaved,
    draftSector, setDraftSector, draftQualification, setDraftQualification, draftCourse, setDraftCourse,
    draftWorkMode, setDraftWorkMode, draftSkills, setDraftSkills, draftSource, setDraftSource, draftCompany, setDraftCompany,
    mobileActiveCount, openMobileFilters, applyMobileFilters, clearAll,
    visibleCount, setVisibleCount, isJobSaved, isJobApplied, toggleSave, reload,
    customTitle, topContent, bottomContent
}: CategoryPageState) {
    const router = useRouter();
    const config = (type ? CATEGORY_CONFIG[type] : undefined) ?? { title: 'Jobs', subtitle: '', icon: BriefcaseIcon };
    const { targetRef: loadMoreRef, isIntersecting } = useIntersectionObserver({ threshold: 0.1, rootMargin: '400px' });
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const { setCount } = useFeedHeader();
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setShowScrollTop(e.currentTarget.scrollTop > 400);
    };
    const filterAggregates = useMemo(() => {
        const locations: Record<string, number> = {};
        const skills: Record<string, number> = {};
        const sources: Record<string, number> = {};
        const years: Record<string, number> = {};
        const companies: Record<string, number> = {};

        opportunities.forEach(opp => {
            (opp.locations || []).forEach(loc => {
                const l = loc.trim();
                if (l) locations[l] = (locations[l] || 0) + 1;
            });
            ((opp as any).skills || opp.requiredSkills || []).forEach((s: string) => {
                const skill = s.trim();
                if (skill) skills[skill] = (skills[skill] || 0) + 1;
            });
            const atsName = getAtsName(opp.applyLink || (opp as any).sourceLink || opp.companyWebsite);
            if (atsName) {
                sources[atsName] = (sources[atsName] || 0) + 1;
            }
            const comp = opp.company?.trim();
            if (comp) {
                companies[comp] = (companies[comp] || 0) + 1;
            }
            let passoutYears = [...((opp as any).allowedPassoutYears || [])];
            if (passoutYears.length === 0 && opp.passoutYearMin && opp.passoutYearMax) {
                const min = Number(opp.passoutYearMin);
                const max = Number(opp.passoutYearMax);
                if (!isNaN(min) && !isNaN(max) && min <= max) {
                    passoutYears = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                }
            }
            if (passoutYears.length === 0) {
                const match = opp.title.match(/(202[0-9]|2030)/);
                if (match) passoutYears = [Number(match[0])];
            }
            passoutYears.forEach((y: string | number) => {
                const year = String(y).trim();
                if (year) years[year] = (years[year] || 0) + 1;
            });
        });

        const filteredLocations: Record<string, number> = {};
        for (const [loc, count] of Object.entries(locations)) {
            if (count >= 1) filteredLocations[loc] = count;
        }

        return { locations: filteredLocations, skills, sources, years, companies };
    }, [opportunities]);

    // Reset scroll when type changes
    useEffect(() => {
        const container = document.getElementById('feed-scroll-container');
        if (container) {
            container.scrollTo(0, 0);
        }
    }, [type]);

    useEffect(() => {
        setPortalTarget(document.getElementById('top-header-portal-target'));
    }, []);

    // Push filtered count to TopHeaderBar
    useEffect(() => {
        if (!setCount) return;
        setCount(filteredOpps.length);
        return () => setCount(null);
    }, [filteredOpps.length, setCount]);

    useEffect(() => {
        if (isIntersecting && visibleCount < visibleOpps.length && !isLoadingMore) {
            setIsLoadingMore(true);
            setTimeout(() => {
                setVisibleCount(prev => prev + 20);
                setIsLoadingMore(false);
            }, 600);
        }
    }, [isIntersecting, visibleCount, visibleOpps.length, isLoadingMore, setVisibleCount]);

    const tickerItems = useMemo(() => {
        if (type !== OpportunityType.GOVERNMENT) return [];
        const urgentStatuses = Object.keys(TICKER_TAG_MAP);
        return filteredOpps
            .filter(o => { const s = (o.governmentJobDetails as any)?.applicationStatus; return s && urgentStatuses.includes(s); })
            .slice(0, 14)
            .map(o => {
                const s = (o.governmentJobDetails as any)?.applicationStatus as string;
                const meta = TICKER_TAG_MAP[s] ?? { tag: s, color: 'bg-muted text-muted-foreground' };
                // Using /govt/ prefix because it is a government opportunity
                return { label: o.title, href: `/govt/${o.slug}`, tag: meta.tag, tagColor: meta.color };
            });
    }, [filteredOpps, type]);

    const dynamicTitle = customTitle || formatJobFeedTitle({
        type: type,
        workMode: filters.workMode,
        location: filters.location,
        skills: filters.skills,
        sector: filters.sector,
        course: filters.course,
        search: search
    }) || config.title;

    const headerPortalContent = type === OpportunityType.GOVERNMENT ? (
        <>
            <div className="flex items-center shrink-0">
                <Breadcrumb items={[
                    { label: 'Home', href: '/' },
                    { label: config.title, href: '#' }
                ]} />
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2 max-w-lg w-full pointer-events-auto">
                <LiveTicker items={tickerItems} />
            </div>
        </>
    ) : (
        <>
            <div className={cn("flex items-center", selectedOpp && isDesktop !== false && "hidden lg:flex")}>
                <Breadcrumb items={[
                    { label: 'Home', href: '/' },
                    { label: config.title, href: '#' }
                ]} />
            </div>
            
            <div className={cn("relative group w-full max-w-xl mx-auto flex-1 lg:ml-6", selectedOpp && isDesktop !== false && "hidden lg:block")}>
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    type="text"
                    placeholder="Search roles, companies, skills..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-card border-border shadow-sm w-full focus:bg-background focus:ring-2 focus:ring-ring/30 transition-shadow duration-150 ease-out"
                />
                {search && (
                    <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full p-0.5 hover:bg-muted">
                        <XMarkIcon className="w-3 h-3" />
                    </button>
                )}
            </div>
        </>
    );

    // ── Detail pane toggle (persisted) ──────────────────────────────────────
    const [showDetail, setShowDetail] = useState(false);
    useEffect(() => {
        const stored = localStorage.getItem('ff:showDetail');
        if (stored === 'true') setShowDetail(true);
    }, []);
    const toggleShowDetail = useCallback(() => {
        setShowDetail(prev => {
            const next = !prev;
            localStorage.setItem('ff:showDetail', String(next));
            if (typeof document !== 'undefined') {
                document.documentElement.setAttribute('data-show-detail', String(next));
            }
            if (!next) handleCloseOpportunityPane();
            return next;
        });
    }, [handleCloseOpportunityPane]);

    return (
        <div id="feed-scroll-container" className="w-full max-w-7xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
            {portalTarget && headerPortalContent ? createPortal(headerPortalContent, portalTarget) : null}

            {/* Sticky header */}
            <div className={cn("shrink-0 bg-background/95 border-b border-border/50 px-3 md:px-6 pt-2.5 pb-0 space-y-2", selectedOpp && "hidden lg:block")}>

            {type === OpportunityType.GOVERNMENT ? (
                /* Govt Compact Top Row: Search + Count on left, Filters on right */
                <div className="flex items-center justify-between gap-3 pb-1">
                    {/* Left: Compact Search Bar + Title/Count */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="relative group max-w-md w-full">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                type="text"
                                placeholder="Search exams, posts, departments..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9 text-xs rounded-xl bg-card border-border shadow-xs w-full focus:bg-background focus:ring-2 focus:ring-ring/30 transition-shadow duration-150 ease-out"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full p-0.5 hover:bg-muted">
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="hidden lg:flex items-center text-sm font-semibold text-muted-foreground whitespace-nowrap">
                            <span className="text-foreground font-bold mr-1.5">Government Jobs</span>
                            • <span className="ml-1.5">{mounted && visibleOpps.length > 0 ? visibleOpps.length : '0'} found</span>
                        </div>
                    </div>

                    {/* Right: Filters */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Mobile Filters button */}
                        <button
                            onClick={openMobileFilters}
                            className="lg:hidden h-9 flex items-center gap-2 px-3 rounded-xl border border-border bg-card text-[11px] font-bold capitalize tracking-widest shrink-0"
                        >
                            <FunnelIcon className="w-4 h-4" />
                            {mobileActiveCount > 0 ? `Filters (${mobileActiveCount})` : 'Filters'}
                        </button>

                        {/* Desktop filter dropdowns */}
                        <div className="hidden lg:flex items-center gap-2 flex-wrap">
                            <FilterDropdownBar filters={filters} setFilters={setFilters} isLoggedIn={!!user} pageType={type ?? undefined} aggregates={filterAggregates} />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Non-govt mobile search bar — inline, full width. Desktop search is portaled to TopHeaderBar */}
                    <div className="relative group lg:hidden">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            type="text"
                            placeholder="Search roles, companies, skills..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-9 text-xs rounded-xl bg-card border-border shadow-sm w-full focus:bg-background focus:ring-2 focus:ring-ring/30 transition-shadow duration-150 ease-out"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full p-0.5 hover:bg-muted">
                                <XMarkIcon className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Title row: Title+Count LEFT | Filters RIGHT */}
                    <div className={cn("flex items-center justify-between gap-3 pb-2.5", selectedOpp && "hidden lg:flex")}>
                        {/* Left: Title + Count */}
                        <div className="flex items-baseline gap-1.5 min-w-0">
                            <h1 className="text-lg md:text-xl font-bold text-foreground tracking-tight leading-tight truncate">
                                {dynamicTitle}
                            </h1>
                            <span className="text-sm font-medium text-muted-foreground shrink-0 whitespace-nowrap">
                                {mounted && visibleOpps.length > 0 ? visibleOpps.length : '0'} found
                            </span>
                        </div>

                        {/* Right: Filters */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Mobile Filters button */}
                            <button
                                onClick={openMobileFilters}
                                className="lg:hidden h-9 flex items-center gap-2 px-3 rounded-xl border border-border bg-card text-[11px] font-bold capitalize tracking-widest shrink-0"
                            >
                                <FunnelIcon className="w-4 h-4" />
                                {mobileActiveCount > 0 ? `Filters (${mobileActiveCount})` : 'Filters'}
                            </button>

                            {/* Desktop filter dropdowns + toggle */}
                            <div className="hidden lg:flex items-center gap-2 flex-wrap">
                                <FilterDropdownBar filters={filters} setFilters={setFilters} isLoggedIn={!!user} pageType={type ?? undefined} aggregates={filterAggregates} />
                                <Hint label={showDetail ? 'Hide detail pane' : 'Show detail pane'} side="top" avoidCollisions={false}>
                                    <button
                                        onClick={toggleShowDetail}
                                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-card text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        aria-label={showDetail ? 'Hide detail pane' : 'Show detail pane'}
                                    >
                                        {showDetail ? <Bars3Icon className="w-4 h-4" /> : <Squares2X2Icon className="w-4 h-4" />}
                                        {showDetail ? 'List' : 'Split'}
                                    </button>
                                </Hint>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Govt tabs — shown below title row */}
            {type === OpportunityType.GOVERNMENT && (
                <div className="space-y-1.5 pb-1">
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

            {/* Active Chips */}
            {(search || filters.location || filters.year || filters.closingSoon || filters.saved || filters.sector || filters.qualification || filters.course || (filters.workMode && filters.workMode.length > 0) || (filters.skills && filters.skills.length > 0) || (filters.source && filters.source.length > 0) || (filters.company && filters.company.length > 0)) ? (
                <div className={cn("flex flex-wrap items-center gap-1.5 pb-2", selectedOpp && "hidden lg:flex")}>
                    {search && (
                        <button onClick={() => setSearch('')} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <MagnifyingGlassIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{search}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    )}
                    {filters.workMode?.map(m => (
                        <button key={m} onClick={() => setFilters({...filters, workMode: filters.workMode!.filter(x => x !== m).length > 0 ? filters.workMode!.filter(x => x !== m) : null})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <HomeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{m === 'REMOTE' ? 'Remote' : m === 'HYBRID' ? 'Hybrid' : 'On-site'}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    ))}
                    {filters.location && (
                        <button onClick={() => setFilters({...filters, location: null})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{filters.location}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    )}
                    {filters.sector && (
                        <button onClick={() => setFilters({...filters, sector: null})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <BuildingOfficeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{filters.sector}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    )}
                    {filters.skills?.map(s => (
                        <button key={s} onClick={() => setFilters({...filters, skills: filters.skills!.filter(x => x !== s)})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <SkillPill skill={s} className="bg-transparent border-none p-0 h-auto text-inherit shadow-none font-medium" />
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    ))}
                    {filters.source?.map(src => (
                        <button key={src} onClick={() => setFilters({...filters, source: filters.source!.filter(x => x !== src)})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <BriefcaseIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{src}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    ))}
                    {filters.company?.map(c => (
                        <button key={c} onClick={() => setFilters({...filters, company: filters.company!.filter(x => x !== c)})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <BuildingOfficeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{c}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    ))}
                    {filters.course && (
                        <button onClick={() => setFilters({...filters, course: null})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <AcademicCapIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{filters.course}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    )}
                    {filters.qualification && (
                        <button onClick={() => setFilters({...filters, qualification: null})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <AcademicCapIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{filters.qualification}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    )}
                    {filters.year && (
                        <button onClick={() => setFilters({...filters, year: null})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{filters.year} Batch</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    )}
                    {filters.closingSoon && (
                        <button onClick={() => setFilters({...filters, closingSoon: false})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>Closing Soon</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    )}
                    {filters.saved && (
                        <button onClick={() => setFilters({...filters, saved: false})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <BookmarkIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>Saved Only</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    )}
                    <button
                        onClick={clearAll}
                        className="bg-transparent text-muted-foreground hover:text-foreground border border-transparent hover:bg-muted/50 rounded-xl px-2 py-1 text-sm font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                        <XMarkIcon className="w-3.5 h-3.5" />
                        clear all
                    </button>
                </div>
            ) : null}
            </div>{/* end sticky header */}

            {/* Scrollable content */}
            <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 md:px-6 pb-2 space-y-2">
            {/* Mobile filter drawer */}
            <Suspense fallback={null}>
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
                    draftWorkMode={draftWorkMode as any} setDraftWorkMode={setDraftWorkMode as any}
                    draftSkills={draftSkills} setDraftSkills={setDraftSkills}
                    draftSource={draftSource} setDraftSource={setDraftSource}
                    draftCompany={draftCompany} setDraftCompany={setDraftCompany}
                    isLoggedIn={!!user}
                    pageType={type ?? undefined}
                    aggregates={filterAggregates}
                    onApply={applyMobileFilters}
                    onClear={() => {
                        setDraftLoc(null); setDraftYear(null); setDraftClosingSoon(false);
                        setDraftShowOnlySaved(false); setDraftSector(null);
                        setDraftQualification(null); setDraftCourse(null);
                        if (setDraftWorkMode) setDraftWorkMode(null);
                        if (setDraftSkills) setDraftSkills([]);
                        if (setDraftSource) setDraftSource([]);
                        if (setDraftCompany) setDraftCompany([]);
                    }}
                />
            </Suspense>

            {topContent && (
                <div className="w-full mb-2">
                    {topContent}
                </div>
            )}

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
                        <Button onClick={() => router.push('/profile')} className="h-12 px-8 text-sm font-bold capitalize tracking-widest">
                            Complete Profile <ChevronRightIcon className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            ) : isLoading ? (
                type === OpportunityType.GOVERNMENT ? (
                    <div className="max-w-3xl mx-auto grid grid-cols-1 gap-2 pt-3.5">
                        {[1,2,3,4,5,6].map(i => <SkeletonJobCard key={i} variant={isDesktop === false ? 'compact' : 'wide'} />)}
                    </div>
                ) : (
                    <div className="w-full grid gap-6 items-start grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] xl:grid-cols-[45%_55%] pt-3.5">
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
            ) : visibleOpps.length === 0 ? (
                <div className="flex flex-col min-w-0 pt-3.5">
                    <EmptyState
                        title={`No ${dynamicTitle} found`}
                        description="Try removing some filters or search keywords."
                        action={<Button variant="outline" onClick={clearAll} className="h-11 px-6 text-sm font-bold capitalize tracking-widest">Clear all filters</Button>}
                        variant="ghost"
                    />
                    
                    {type !== OpportunityType.GOVERNMENT && (
                        <RelatedSearches 
                            opportunities={opportunities} 
                            search={search} 
                            filters={filters} 
                            onSearch={(term) => {
                                setSearch(term);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} 
                        />
                    )}
                </div>
            ) : (
                // ── Flat grid (filtered by phase / search) ─────────────────────
                <div className={cn(
                    "w-full grid gap-2 items-start",
                    (type !== OpportunityType.GOVERNMENT && showDetail)
                        ? "grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] xl:grid-cols-[45%_55%] [:root[data-show-detail='false']_&]:lg:grid-cols-1 [:root[data-show-detail='false']_&]:max-w-3xl [:root[data-show-detail='false']_&]:mx-auto"
                        : "grid-cols-1 max-w-3xl mx-auto"
                )}>
                    {/* Left Column: list grid */}
                    <div id="category-grid-container" className={cn(
                        "min-w-0 pt-3.5",
                        type !== OpportunityType.GOVERNMENT && showDetail && "lg:sticky lg:top-[var(--sticky-h,8rem)] lg:h-[calc(100vh-var(--sticky-h,8rem))] lg:overflow-y-auto lg:pr-2 custom-scrollbar [:root[data-show-detail='false']_&]:lg:static [:root[data-show-detail='false']_&]:lg:h-auto [:root[data-show-detail='false']_&]:lg:overflow-y-visible [:root[data-show-detail='false']_&]:lg:pr-0"
                    )}>
                        <div className="grid grid-cols-1 gap-2">
                            {visibleOpps.slice(0, visibleCount).map((opp, index) => (
                                <JobCard
                                    key={opp.id}
                                    job={{ ...opp, normalizedRole: opp.title, salary: (opp.salaryMin !== undefined && opp.salaryMax !== undefined) ? { min: opp.salaryMin, max: opp.salaryMax } : undefined }}
                                    jobId={opp.id}
                                    isSaved={isJobSaved(opp)}
                                    isApplied={isJobApplied(opp)}
                                    onToggleSave={() => toggleSave(opp.id)}
                                    isAdmin={user?.role === 'ADMIN'}
                                    isSelected={Boolean(type !== OpportunityType.GOVERNMENT && showDetail && isDesktop && (opp.id === selectedOpp?.id || opp.slug === selectedOpp?.slug))}
                                    variant={
                                        (isDesktop === false || (type !== OpportunityType.GOVERNMENT && showDetail))
                                            ? 'compact'
                                            : 'wide'
                                    }
                                    searchQuery={search}
                                    onClick={(e) => {
                                        if (type !== OpportunityType.GOVERNMENT && (showDetail || isDesktop === false)) {
                                            e.preventDefault();
                                            handleSelectOpportunity(opp);
                                        }
                                    }}
                                    priority={index < 4}
                                />
                            ))}
                        </div>
                        
                        {(visibleCount < visibleOpps.length || isLoadingMore) && (
                            <div ref={loadMoreRef} className="flex justify-center pt-8 pb-4">
                                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                        )}
                        
                        {visibleOpps.length > 0 && type !== OpportunityType.GOVERNMENT && (
                            <RelatedSearches 
                                opportunities={opportunities} 
                                search={search} 
                                filters={filters} 
                                onSearch={(term) => {
                                    setSearch(term);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} 
                            />
                        )}
                        
                        {bottomContent && (
                            <div className="pt-8 pb-4 border-t border-border/40 mt-8 space-y-8">
                                {bottomContent}
                            </div>
                        )}
                        
                        {/* Essential spacer so the last card never sticks to the bottom of the screen */}
                        <div className="h-24 md:h-32 shrink-0" />
                    </div>

                    {/* Right Column: Detail Panel (desktop, split mode only) */}
                    {type !== OpportunityType.GOVERNMENT && showDetail && (
                        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-8rem)] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm mt-3.5 [:root[data-show-detail='false']_&]:!hidden">
                            {selectedOpp ? (
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <Suspense fallback={<OpportunityDetailSkeleton />}>
                                        <OpportunityDetailPane
                                            oppId={selectedOpp.slug || selectedOpp.id}
                                            initialData={selectedOpp}
                                            onClose={handleCloseOpportunityPane}
                                        />
                                    </Suspense>
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
                    {selectedOpp && type !== OpportunityType.GOVERNMENT && (
                        <div id="mobile-detail-modal" className={cn("lg:hidden fixed inset-0 z-[120] flex flex-col bg-background animate-in slide-in-from-bottom duration-300")}>
                            <div className="pt-[env(safe-area-inset-top)] bg-card shrink-0" />
                            <div className="flex-1 flex flex-col min-h-0">
                                <Suspense fallback={<OpportunityDetailSkeleton />}>
                                    <OpportunityDetailPane
                                        oppId={selectedOpp.slug || selectedOpp.id}
                                        initialData={selectedOpp}
                                        onClose={handleCloseOpportunityPane}
                                        isMobile={true}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    )}
                </div>
            )}

                {!showDetail && showScrollTop && (
                    <button
                        onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                        aria-label="Scroll to top"
                        className="fixed bottom-[5.5rem] md:bottom-8 right-4 md:right-8 z-[70] flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                    >
                        <ChevronUpIcon className="w-5 h-5" />
                    </button>
                )}

            </div>{/* end scrollable content */}
        </div>
    );
}

function RelatedSearches({ 
    opportunities, 
    search, 
    filters, 
    onSearch 
}: { 
    opportunities: Opportunity[], 
    search: string, 
    filters: any, 
    onSearch: (term: string) => void 
}) {
    const relatedTerms = useMemo(() => {
        if (!opportunities || opportunities.length === 0) return [];
        
        const termCounts: Record<string, { original: string, count: number }> = {};
        
        opportunities.forEach(opp => {
            const oppAny = opp as any;
            const skills = ((oppAny as any).skills || oppAny.requiredSkills || []);
            const roles = [];
            if (oppAny.normalizedRole) roles.push(oppAny.normalizedRole);
            if (oppAny.jobFunction) roles.push(oppAny.jobFunction);
            
            const terms = [...skills, ...roles];
            terms.forEach(t => {
                if (!t || typeof t !== 'string') return;
                const norm = t.toLowerCase().trim();
                if (!norm) return;
                if (!termCounts[norm]) termCounts[norm] = { original: t, count: 0 };
                termCounts[norm].count++;
            });
        });

        const searchNorm = search?.toLowerCase().trim() || '';
        const activeSkills = (filters?.skills || []).map((s: string) => s.toLowerCase().trim());
        const activeRoles = (filters?.roles || []).map((s: string) => s.toLowerCase().trim());
        const activeCategories = (filters?.sector ? [filters.sector] : []).map((s: string) => s.toLowerCase().trim());
        
        const sorted = Object.values(termCounts)
            .filter(t => {
                const norm = t.original.toLowerCase().trim();
                if (searchNorm && (norm.includes(searchNorm) || searchNorm.includes(norm))) return false;
                if (activeSkills.includes(norm) || activeRoles.includes(norm) || activeCategories.includes(norm)) return false;
                // Basic exclusions
                if (norm.length < 2) return false;
                return true;
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
            .map(t => t.original);
            
        return sorted;
    }, [opportunities, search, filters]);

    if (relatedTerms.length === 0) return null;

    return (
        <div className="pt-12 pb-24 border-t border-border/50 mt-12 mb-12">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">People also searched</h3>
            <div className="flex flex-wrap gap-2.5">
                {relatedTerms.map(term => (
                    <button
                        key={term}
                        onClick={() => onSearch(term)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors border border-border/40 hover:border-border"
                    >
                        <MagnifyingGlassIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        {term}
                    </button>
                ))}
            </div>
        </div>
    );
}
