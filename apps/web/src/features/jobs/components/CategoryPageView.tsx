/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */
import { cn } from '@repo/ui/utils/cn';
import { useMemo, useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFeedHeader } from '@/lib/providers/FeedHeaderProvider';
import Link from 'next/link';
import { countFilterFacets } from '@/features/jobs/utils/filterOpportunities';
import { useRouter } from 'next/navigation';
import { Opportunity } from '@fresherflow/types';
import type { CategoryFeedType } from '@/features/jobs/utils/walkinMapUtils';
import dynamic from 'next/dynamic';

const OpportunityDetailPane = dynamic(() => import('./OpportunityDetailPane').then(m => m.OpportunityDetailPane));
import { JobCardResponsive } from '@/features/jobs/components/JobCard';
import { OpportunityRow } from '@/features/jobs/components/OpportunityRow';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
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
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import ChevronUpIcon from '@heroicons/react/24/solid/ChevronUpIcon';
import MapIcon from '@heroicons/react/24/outline/MapIcon';
import ListBulletIcon from '@heroicons/react/24/outline/ListBulletIcon';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/Breadcrumb';
import { SkillPill } from '@/features/jobs/components/SkillPill';
import { Button } from '@/ui/Button';
import { Hint } from '@/ui/Tooltip';
import { Input } from '@/ui/Input';
import { BrandButton } from '@/ui/BrandButton';
import { OpportunityDetailPaneSkeleton, SkeletonJobCard } from '@/features/jobs/components/OpportunitySkeletons';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { EmptyState } from '@/ui/EmptyState';
import { JobsFilterBar } from '@/features/jobs/components/JobsFilterBar';
import { PersonalizationBar } from '@/features/jobs/components/PersonalizationBar';
import { dismissProfileFilterDims } from '@/features/jobs/hooks/useProfileFilters';
import { WalkinMapPane } from '@/features/jobs/components/WalkinMapPane';
import {
    GovtPhaseTabs,
} from '@/features/jobs/components/GovtPhaseTabs';
import { type CategoryPageState } from '@/features/jobs/hooks/useCategoryPageState';
import { formatJobFeedTitle } from '@/features/jobs/utils/formatJobFeedTitle';
import { Drawer } from 'vaul';

const MobileFilterDrawer = dynamic(() =>
    import('@/features/jobs/components/MobileFilterDrawer').then(m => m.MobileFilterDrawer)
);

// â”€â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CATEGORY_CONFIG = {
    JOB:        { title: 'Jobs for Freshers',          subtitle: 'Full-time opportunities across India',            icon: BriefcaseIcon },
    INTERNSHIP: { title: 'Internships',                subtitle: 'Kickstart your career with hands-on experience',  icon: AcademicCapIcon },
    WALKIN:     { title: 'Walk-in Drives',             subtitle: 'Direct interview opportunities near you',         icon: UserGroupIcon },
    REMOTE:     { title: 'Remote Opportunities',       subtitle: 'Fresh roles you can pursue from anywhere',        icon: BriefcaseIcon },
    GOVERNMENT: { title: 'Government Jobs',            subtitle: 'Official notices and public-sector openings',     icon: ShieldCheckIcon },
    HACKATHONS: { title: 'Hackathons',                 subtitle: 'Competitions, challenges, and builder programs',  icon: AcademicCapIcon },
    DRIVES:     { title: 'Hiring Drives',              subtitle: 'Walk-in and off-campus drives near you',          icon: MapIcon },
    OFF_CAMPUS: { title: 'Off-Campus Drives',          subtitle: 'Campus and pool drives open to freshers',          icon: UserGroupIcon },
    FULL_TIME:  { title: 'Full-Time Jobs',             subtitle: 'Permanent entry-level roles across India',         icon: BriefcaseIcon },
    PART_TIME:  { title: 'Part-Time Jobs',             subtitle: 'Flexible entry-level roles across India',          icon: ClockIcon },
} satisfies Record<CategoryFeedType, { title: string; subtitle: string; icon: typeof BriefcaseIcon }>;

// Ticker tag styles per applicationStatus
const TICKER_TAG_MAP: Record<string, { tag: string; color: string }> = {
    ADMIT_CARD_RELEASED: { tag: 'Admit Card', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20' },
    RESULT_DECLARED:     { tag: 'Result Out',  color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
    ANSWER_KEY_RELEASED: { tag: 'Answer Key', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
    OPEN:                { tag: 'Apply Now',  color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' },
};

// Small human-readable freshness label from an epoch-ms CDN snapshot timestamp.
function formatFeedAge(tsMs?: number): string {
    if (!tsMs || !Number.isFinite(tsMs)) return '';
    const diff = Date.now() - tsMs;
    if (diff < 0) return 'just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
}
// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-foreground/10 text-foreground font-bold text-xs uppercase tracking-wider border border-foreground/10 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
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
                                <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider', item.tagColor)}>
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

// â”€â”€â”€ Presenter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function CategoryPageView({
    type, user, opportunities, filteredOpps, visibleOpps, isLoading, error, profileIncomplete, mounted, isDesktop,
    selectedOpp, handleSelectOpportunity, handleCloseOpportunityPane,
    search, setSearch, submitLiveSearch, clearLiveSearch, filters, setFilters,
    govtPhase, setGovtPhase, govtCategory, setGovtCategory, phaseCounts,
    isMobileFilterOpen, setIsMobileFilterOpen, draftLoc, setDraftLoc, draftYear, setDraftYear,
    draftClosingSoon, setDraftClosingSoon, draftShowOnlySaved, setDraftShowOnlySaved,
    draftSector, setDraftSector, draftQualification, setDraftQualification, draftCourse, setDraftCourse,
    draftWorkMode, setDraftWorkMode, draftSkills, setDraftSkills, draftSource, setDraftSource, draftCompany, setDraftCompany,
    draftExperience, setDraftExperience,
    mobileActiveCount, openMobileFilters, applyMobileFilters, clearAll,
    draftMatchCount,
    visibleCount, setVisibleCount, isJobSaved, isJobApplied, toggleSave, reload,
    customTitle, topContent, bottomContent, userLocation, driveDate, setDriveDate,
    driveRadiusKm, setDriveRadiusKm,
    feedUpdatedAt, feedTotal,
    profileMismatchCount, hiddenProfileCount, profileChipCount, profileChipTotal, profileOwnedDims, showHiddenProfile, setShowHiddenProfile,
    onLocationRequest, onLocationClear, locationLoading, locationRequested, locationDenied
}: CategoryPageState & {
    onLocationRequest?: () => void;
    onLocationClear?: () => void;
    locationLoading?: boolean;
    locationRequested?: boolean;
    locationDenied?: boolean;
}) {
    const router = useRouter();
    const mobileGrid = isDesktop === false;
    // Desktop renders the SAME row in both views â€” see the feed map below for
    // why the card tree is not used here.
    const desktopRows = type !== 'GOVERNMENT' && isDesktop === true;
    const config = (type ? CATEGORY_CONFIG[type] : undefined) ?? { title: 'Jobs', subtitle: '', icon: BriefcaseIcon };
    const { targetRef: loadMoreRef, isIntersecting } = useIntersectionObserver({ threshold: 0.1, rootMargin: '400px' });
    const { setCount } = useFeedHeader();
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const preserveListScrollRef = useRef(false);
    const savedListScrollTopRef = useRef(0);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setShowScrollTop(e.currentTarget.scrollTop > 400);
    };

    const resetFeedScroll = useCallback((behavior: ScrollBehavior = 'instant') => {
        // 1. Primary scroll container (List mode, Mobile, Govt)
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior });
        }
        // 2. Split-pane left column container (Desktop Split view)
        if (gridContainerRef.current) {
            gridContainerRef.current.scrollTo({ top: 0, left: 0, behavior });
        }
        // Fallback targeting by ID in case ref hasn't attached yet
        const gridEl = typeof document !== 'undefined' ? document.getElementById('category-grid-container') : null;
        if (gridEl && gridEl !== gridContainerRef.current) {
            gridEl.scrollTo({ top: 0, left: 0, behavior });
        }
        // 3. Viewport fallback (for mobile browser address bar collapse / document scroll)
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior });
        }
    }, []);

    // Always start from the top when the feed component first mounts
    // (handles Back button navigation restoring old scroll position)
    useEffect(() => {
        resetFeedScroll('instant');
        if (typeof window !== 'undefined') {
            window.history.scrollRestoration = 'manual';
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.history.scrollRestoration = 'auto';
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Selecting a job must never move the list â€” if anything (remount,
    // browser anchoring) resets the list scroll on select, put it back.
    // Only arms on row click, so filter/search resets still work.
    useEffect(() => {
        if (!preserveListScrollRef.current) return;
        preserveListScrollRef.current = false;
        const el = gridContainerRef.current;
        if (el && savedListScrollTopRef.current > 0) {
            el.scrollTop = savedListScrollTopRef.current;
        }
    }, [selectedOpp]);
    // Panel counts are scoped to this page's feed type (internships page =
    // internship counts), via the same `type` the feed hook receives.
    const filterAggregates = useMemo(() => countFilterFacets(opportunities, type), [opportunities, type]);

    // Unified reactive scroll reset on any filter, search, tab, or type change
    useEffect(() => {
        resetFeedScroll('instant');
    }, [
        type,
        search,
        filters.location,
        filters.year,
        filters.closingSoon,
        filters.saved,
        filters.sector,
        filters.qualification,
        filters.course,
        filters.workMode,
        filters.skills,
        filters.source,
        filters.company,
        filters.role,
        filters.experience,
        driveDate,
        govtPhase,
        govtCategory,
        resetFeedScroll,
    ]);

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
        if (isIntersecting && visibleCount < visibleOpps.length) {
            setVisibleCount(prev => Math.min(prev + 20, visibleOpps.length));
        }
    }, [isIntersecting, visibleCount, visibleOpps.length, setVisibleCount]);

    const tickerItems = useMemo(() => {
        if (type !== 'GOVERNMENT') return [];
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

    const headerPortalContent = type === 'GOVERNMENT' ? (
        <>
            <div className="flex items-center shrink-0">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{config.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="relative group w-full max-w-xl mx-auto flex-1 lg:ml-6">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search exams, posts, departments..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitLiveSearch(); }}
                        variant="search"
                        className="pl-9 h-9 w-full"
                    />
                    {search && (
                        <button
                            onClick={() => { setSearch(''); clearLiveSearch(); }}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground p-0.5"
                        >
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>
        </>
    ) : (
        <>
            <div className={cn("flex items-center", selectedOpp && isDesktop !== false && "hidden lg:flex")}>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{config.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            
            <div className={cn("relative group w-full max-w-xl mx-auto flex-1 lg:ml-6", selectedOpp && isDesktop !== false && "hidden lg:block")}>
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search roles, companies, skills..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitLiveSearch(); }}
                        variant="search"
                        className="pl-9 h-9 w-full"
                    />
                    {search && (
                        <button
                            onClick={() => { setSearch(''); clearLiveSearch(); }}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground p-0.5"
                        >
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>
        </>
    );

    // â”€â”€ Detail pane toggle (persisted) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [showDetail, setShowDetail] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);
    const feedRef = useRef<HTMLDivElement>(null);
    // Keep the feed box exactly viewport-tall (no outer scroll), whatever height
    // the title row / filters / active chips take up. Panes fill the box with
    // flex heights and scroll internally â€” no viewport math in the panes.
    //
    // This writes the height of the box the observed header sits in, from that
    // box's own offset â€” so it must never write the value it already applied.
    // `getBoundingClientRect()` reports fractional geometry, and re-writing a
    // height that layout then reflects back re-fires the observer on the
    // effect's own output; that is the ResizeObserver loop that pinned the List
    // view (the Split pane absorbs the same writes differently). Rounding the
    // input once and comparing it makes each pass idempotent.
    useEffect(() => {
        const el = headerRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        let appliedTop: number | null = null;
        const update = () => {
            const feedEl = feedRef.current;
            if (!feedEl) return;
            const top = Math.ceil(feedEl.getBoundingClientRect().top);
            if (top === appliedTop) return;
            appliedTop = top;
            // 6px breathing room so the box's rounded bottom + shadow stay visible
            feedEl.style.height = `calc(100dvh - ${top}px - 6px)`;
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);
    const [hoveredOppId, setHoveredOppId] = useState<string | null>(null);
    // Sliding hover highlight geometry â€” glides between rows instead of snapping.
    const [hoverRect, setHoverRect] = useState<{ top: number; height: number } | null>(null);
    const [mobileMapView, setMobileMapView] = useState(false);
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

    // Manual filters + search â€” what the save-this-search nudge reacts to.
    const activeFilterTally = useMemo(
        () => mobileActiveCount + (search.trim().length > 0 ? 1 : 0),
        [mobileActiveCount, search],
    );

    return (
        <div id="feed-scroll-container" ref={feedRef} className="w-full max-w-7xl mx-auto flex flex-col" style={{ height: 'calc(100dvh - 3.5rem)' }}>
            {portalTarget && headerPortalContent ? createPortal(headerPortalContent, portalTarget) : null}

            {/* Sticky header â€” transparent so it can never mismatch the page:
                only blur + hairline remain, scrolled cards frost beneath.
                relative z-20 is load-bearing: backdrop-blur traps the filter
                panels' z-100 inside this header's stacking context, while the
                detail pane paints at relative z-10 â€” without an explicit level
                here, page content renders ABOVE open filter dropdowns. z-20
                clears detail content but stays under map view (30), sticky
                action bars (40) and modals (100+). */}
            <div ref={headerRef} className="relative z-20 shrink-0 border-b border-border/50 bg-transparent px-3 backdrop-blur-md md:px-6 pt-2.5 pb-0 space-y-2">

            {type === 'GOVERNMENT' ? (
                /* Govt Compact Top Row: Title/Count left, Filters right.
                   Search lives in the header on desktop (portaled above) â€”
                   the inline box below is mobile-only, like other feeds. */
                <div className="flex items-center justify-between gap-3 pb-1">
                    {/* Left: Compact Search Bar (mobile only) + Title/Count */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="relative group max-w-md w-full lg:hidden">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                type="text"
                                placeholder="Search exams, posts, departments..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') submitLiveSearch(); }}
                                variant="searchGlow"
                                className="pl-9 h-9 w-full"
                            />
                            {search && (
                                <button onClick={() => { setSearch(''); clearLiveSearch(); }} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full p-0.5 hover:bg-muted">
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="hidden lg:flex items-center text-sm font-semibold text-muted-foreground whitespace-nowrap">
                            <span className="text-foreground font-bold mr-1.5">Government Jobs</span>
                            â€¢ <span className="ml-1.5">{mounted && visibleOpps.length > 0 ? visibleOpps.length : '0'} found</span>
                        </div>
                    </div>

                    {/* Right: Filters */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Mobile Filters button */}
                        <button
                            onClick={openMobileFilters}
                            className="lg:hidden h-9 flex items-center gap-2 px-3 rounded-xl border border-border bg-card text-xs font-bold capitalize tracking-widest shrink-0"
                        >
                            <FunnelIcon className="w-4 h-4" />
                            {mobileActiveCount > 0 ? `Filters (${mobileActiveCount})` : 'Filters'}
                        </button>

                        {/* Desktop filter dropdowns */}
                        <div className="hidden lg:flex items-center gap-2 flex-wrap">
                            <JobsFilterBar filters={filters} setFilters={setFilters} isLoggedIn={!!user} pageType={type ?? undefined} aggregates={filterAggregates} driveDate={driveDate} onDriveDateChange={setDriveDate} driveRadiusKm={driveRadiusKm ?? null} onDriveRadiusChange={setDriveRadiusKm} hasUserLocation={!!userLocation} />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Non-govt mobile search bar â€” inline, full width. Desktop search is portaled to TopHeaderBar */}
                    <div className="relative group lg:hidden">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search roles, companies, skills..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitLiveSearch(); }}
                            variant="search"
                            className="pl-9 h-9 w-full"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(''); clearLiveSearch(); }}
                                aria-label="Clear search"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground p-0.5"
                            >
                                <XMarkIcon className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Title row: Title+Count LEFT | Filters RIGHT */}
                    <div className="flex items-center justify-between gap-3 pb-2.5">
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
                                className="lg:hidden h-9 flex items-center gap-2 px-3 rounded-xl border border-border bg-card text-xs font-bold capitalize tracking-widest shrink-0"
                            >
                                <FunnelIcon className="w-4 h-4" />
                                {mobileActiveCount > 0 ? `Filters (${mobileActiveCount})` : 'Filters'}
                            </button>

                            {/* Desktop filter dropdowns + toggle */}
                            <div className="hidden lg:flex items-center gap-2 flex-wrap">
                                <JobsFilterBar filters={filters} setFilters={setFilters} isLoggedIn={!!user} pageType={type ?? undefined} aggregates={filterAggregates} driveDate={driveDate} onDriveDateChange={setDriveDate} driveRadiusKm={driveRadiusKm ?? null} onDriveRadiusChange={setDriveRadiusKm} hasUserLocation={!!userLocation} />
                                
                                {/* View mode switcher (List vs Split) â€” icons only;
                                    each icon always visible, state shown via highlight */}
                                <div className="inline-flex items-center bg-muted rounded-lg border border-border/70 shrink-0 p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => { if (showDetail) toggleShowDetail(); }}
                                        className={cn(
                                            'flex items-center justify-center h-7.5 w-8 rounded-md cursor-pointer select-none transition-colors',
                                            !showDetail ? 'bg-card text-foreground shadow-xs border border-border/40' : 'text-muted-foreground hover:text-foreground'
                                        )}
                                        aria-label="List view"
                                        aria-pressed={!showDetail}
                                        title="List view"
                                    >
                                        <Bars3Icon className="w-4 h-4 shrink-0" aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { if (!showDetail) toggleShowDetail(); }}
                                        className={cn(
                                            'flex items-center justify-center h-7.5 w-8 rounded-md cursor-pointer select-none transition-colors',
                                            showDetail ? 'bg-card text-foreground shadow-xs border border-border/40' : 'text-muted-foreground hover:text-foreground'
                                        )}
                                        aria-label="Split view"
                                        aria-pressed={showDetail}
                                        title="Split view"
                                    >
                                        <Squares2X2Icon className="w-4 h-4 shrink-0" aria-hidden />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Govt tabs â€” phases only. Categories live in the sidebar
                (same URL-driven state); the ticker sits under the title row
                now that search owns the header. */}
            {type === 'GOVERNMENT' && (
                <div className="space-y-1.5 pb-1">
                    {tickerItems.length > 0 ? (
                        <div className="max-w-xl">
                            <LiveTicker items={tickerItems} />
                        </div>
                    ) : null}
                    <GovtPhaseTabs
                        active={govtPhase}
                        onChange={phase => { setGovtPhase(phase); setGovtCategory(null); }}
                        counts={phaseCounts}
                    />
                </div>
            )}

            {/* Active Chips */}
            {(search || filters.location || filters.year || filters.closingSoon || filters.saved || filters.sector || filters.qualification || filters.course || (filters.workMode && filters.workMode.length > 0) || (filters.skills && filters.skills.length > 0) || (filters.source && filters.source.length > 0) || (filters.company && filters.company.length > 0) || (filters.experience && filters.experience.length > 0) || (type === 'GOVERNMENT' && govtCategory) || profileChipTotal > 0 || profileChipCount > 0 || profileMismatchCount > 0) ? (
                <div className="flex flex-wrap items-center gap-1.5 pb-2">
                    {type === 'GOVERNMENT' && govtCategory ? (
                        <button onClick={() => setGovtCategory(null)} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <AcademicCapIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{govtCategory}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    ) : null}
                    {search && (
                        <button onClick={() => { setSearch(''); clearLiveSearch(); }} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <MagnifyingGlassIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{search}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    )}
                    {filters.workMode?.map(m => (
                        <button key={m} onClick={() => {
                            const rest = filters.workMode!.filter(x => x !== m);
                            setFilters({...filters, workMode: rest.length > 0 ? rest : null});
                            // Profile-seeded chip: removing the last mode dismisses the
                            // dimension, so reload never re-seeds it.
                            if (rest.length === 0 && profileOwnedDims.includes('workMode')) dismissProfileFilterDims(['workMode']);
                        }} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <HomeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{m === 'REMOTE' ? 'Remote' : m === 'HYBRID' ? 'Hybrid' : 'On-site'}</span>
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    ))}
                    {filters.location && (
                        <button onClick={() => {
                            setFilters({...filters, location: null});
                            if (profileOwnedDims.includes('city')) dismissProfileFilterDims(['city']);
                        }} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{filters.location.split(',').map((c) => c.trim()).filter(Boolean).join(', ')}</span>
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
                            <SkillPill skill={s} variant="bare" />
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                        </button>
                    ))}
                    {filters.experience?.map(e => (
                        <button key={e} onClick={() => setFilters({...filters, experience: filters.experience!.filter(x => x !== e)})} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
                            <BriefcaseIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{e}</span>
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
                        <button onClick={() => {
                            setFilters({...filters, year: null});
                            if (profileOwnedDims.includes('batch')) dismissProfileFilterDims(['batch']);
                        }} className="bg-background border border-border hover:bg-muted/50 text-foreground rounded-lg px-2 py-1 text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0">
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

                    {/* Profile chips + switch + hidden-jobs disclosure live in
                        THIS row with the manual chips â€” never a row of their own. */}
                    <PersonalizationBar
                        mismatchCount={profileMismatchCount}
                        showHidden={showHiddenProfile}
                        onToggleShow={() => setShowHiddenProfile((value) => !value)}
                        filterCount={activeFilterTally}
                        saveCity={filters.location}
                        saveCompany={filters.company?.[0] ?? null}
                        saveBatch={filters.year}
                    />
                </div>
            ) : null}
            </div>{/* end sticky header */}

            {/* Scrollable content â€” locked in split mode, panes scroll internally */}
            <div ref={scrollContainerRef} onScroll={handleScroll} className={cn(
                "flex-1 overflow-y-auto px-3 md:px-6 pb-2 space-y-2",
                type !== 'GOVERNMENT' && showDetail && "xl:overflow-hidden xl:pb-0 xl:space-y-0"
            )}>
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
                    draftExperience={draftExperience} setDraftExperience={setDraftExperience}
  isLoggedIn={!!user}
  pageType={type ?? undefined}
  aggregates={filterAggregates}
  draftDriveDate={driveDate}
  setDraftDriveDate={setDriveDate}
  draftDriveRadiusKm={driveRadiusKm ?? null}
  setDraftDriveRadiusKm={setDriveRadiusKm}
  hasUserLocation={!!userLocation}
  draftMatchCount={draftMatchCount}
                    onApply={applyMobileFilters}
                    onClear={() => {
                        setDraftLoc(null); setDraftYear(null); setDraftClosingSoon(false);
                        setDraftShowOnlySaved(false); setDraftSector(null);
                        setDraftQualification(null); setDraftCourse(null);
                        if (setDraftWorkMode) setDraftWorkMode(null);
                        if (setDraftSkills) setDraftSkills([]);
                        if (setDraftSource) setDraftSource([]);
                        if (setDraftCompany) setDraftCompany([]);
  if (setDraftExperience) setDraftExperience([]);
  if (setDriveDate) setDriveDate("all");
  if (setDriveRadiusKm) setDriveRadiusKm(null);
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
                                    <div className="text-xs text-muted-foreground font-bold capitalize tracking-eyebrow mt-1">Current</div>
                                </div>
                                <div className="w-px h-10 bg-border" />
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-foreground">100%</div>
                                    <div className="text-xs text-muted-foreground font-bold capitalize tracking-eyebrow mt-1">Goal</div>
                                </div>
                            </div>
                        </div>
                        <Button onClick={() => router.push('/account?tab=profile')} size="cta" label="caps">
                            Complete Profile <ChevronRightIcon className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            ) : isLoading ? (
                type === 'GOVERNMENT' ? (
                    <div className="ff-reading-col mx-auto grid grid-cols-1 gap-2 pt-3.5">
                        {[1,2,3,4,5,6].map(i => <SkeletonJobCard key={i} variant={isDesktop === false ? 'compact' : 'wide'} />)}
                    </div>
                ) : (
                    <div className="w-full grid gap-6 items-start grid-cols-1 xl:ff-detail-split pt-3.5 xl:pt-0 xl:gap-0 xl:h-full xl:min-h-0">
                        <div className="min-w-0 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:px-6">
                            <div className="grid grid-cols-1 gap-4 md:gap-6">
                                {[1,2,3,4,5].map(i => <SkeletonJobCard key={i} variant="compact" />)}
                            </div>
                        </div>
                        <div className="hidden xl:flex flex-col xl:h-full xl:min-h-0 bg-card border border-border/50 rounded-2xl p-6">
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
                    action={<Button variant="outline" onClick={reload} size="ctaSmall" label="caps">Retry</Button>}
                />
            ) : visibleOpps.length === 0 ? (
                <div className="flex flex-col min-w-0 pt-3.5">
                    <EmptyState
                        title={`No ${dynamicTitle} found`}
                        description={(() => {
                            if (hiddenProfileCount > 0) {
                                return `${hiddenProfileCount} jobs are hidden because they don't match your profile.`;
                            }
                            // Name the drive filter that emptied the list. A
                            // bare "try removing some filters" after choosing
                            // "within 5 km" leaves the reader guessing which
                            // one is responsible.
                            if (type === 'WALKIN' && driveRadiusKm != null) {
                                return `No drives within ${driveRadiusKm} km of you. Try a wider radius or another date.`;
                            }
                            if (type === 'WALKIN' && driveDate !== 'all') {
                                return `No drives ${driveDate === 'today' ? 'today' : driveDate === 'thisWeek' ? 'this week' : 'in the next 30 days'}. Try a wider date range.`;
                            }
                            if (mobileActiveCount > 0 || search.trim().length > 0 || (driveDate !== undefined && driveDate !== "all")) {
                                return "Try removing some filters or search keywords.";
                            }
                            return undefined;
                        })()}
                        action={
                            hiddenProfileCount > 0
                                ? <Button variant="outline" onClick={() => setShowHiddenProfile(true)} size="ctaCompact" label="caps">Show them</Button>
                                : (mobileActiveCount > 0 || search.trim().length > 0 || (driveDate !== undefined && driveDate !== "all") || (type === 'WALKIN' && driveRadiusKm != null))
                                    ? <Button variant="outline" onClick={clearAll} size="ctaCompact" label="caps">Clear all filters</Button>
                                    : undefined
                        }
                        variant="ghost"
                    />

                    <SubmitOpeningInvite className="mt-5" />

                    {type !== 'GOVERNMENT' && (
                        <RelatedSearches 
                            opportunities={opportunities} 
                            search={search} 
                            filters={filters} 
                            onSearch={(term) => {
                                setSearch(term);
                                resetFeedScroll('instant');
                            }} 
                        />
                    )}
                </div>
            ) : (
                // â”€â”€ Flat grid (filtered by phase / search) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                <div className={cn(
                    "w-full grid gap-2 items-start",
                    (type !== 'GOVERNMENT' && showDetail)
                        ? "grid-cols-1 xl:ff-detail-split xl:gap-0 xl:h-full xl:min-h-0 xl:bg-card xl:border xl:border-border/50 xl:rounded-2xl xl:overflow-hidden xl:shadow-sm [:root[data-show-detail='false']_&]:xl:grid-cols-1 [:root[data-show-detail='false']_&]:ff-reading-col [:root[data-show-detail='false']_&]:mx-auto [:root[data-show-detail='false']_&]:xl:bg-transparent [:root[data-show-detail='false']_&]:xl:border-0 [:root[data-show-detail='false']_&]:xl:shadow-none"
                        : "grid-cols-1 ff-reading-col mx-auto"
                )}>
                    {/* Left Column: list grid */}
                    <div
                        id="category-grid-container"
                        ref={gridContainerRef}
                        onScroll={handleScroll}
                        className={cn(
                            "min-w-0 pt-3.5",
                            type !== 'GOVERNMENT' && showDetail && "xl:pt-4 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:px-6 [:root[data-show-detail='false']_&]:xl:h-auto [:root[data-show-detail='false']_&]:xl:overflow-y-visible [:root[data-show-detail='false']_&]:xl:px-0"
                        )}
                    >
                        <div className={cn(
                            "grid grid-cols-1 gap-3",
                            desktopRows && !showDetail && "gap-0 divide-y divide-border/60",
                            type !== 'GOVERNMENT' && showDetail && "gap-2 relative xl:gap-0 xl:divide-y xl:divide-border"
                        )}>
                            {(type !== 'GOVERNMENT' && showDetail) && (
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden bg-muted/40 opacity-0 ff-pane-transition duration-200 ease-out xl:block"
                                    style={{
                                        top: hoverRect?.top ?? 0,
                                        height: hoverRect?.height ?? 0,
                                        opacity: hoverRect && hoveredOppId !== selectedOpp?.id ? 1 : 0,
                                    }}
                                />
                            )}
                            {visibleOpps.slice(0, visibleCount).map((opp, index) => (
                                // One row implementation for the whole desktop
                                // feed â€” List and Split render the same thing.
                                //
                                // List used to render the card tree here while
                                // Split rendered this row, so the two views
                                // disagreed about what a row costs. A card mounts
                                // a hidden measurement strip, a ResizeObserver, a
                                // synchronous layout pass over every badge and an
                                // icon load per skill â€” per card â€” and the List
                                // view hung while Split stayed smooth. The row has
                                // no hooks at all.
                                //
                                // Desktop-only: showDetail persists in
                                // localStorage, so without the viewport gate the
                                // split leaks into phone widths where its detail
                                // column cannot display. Mobile is cards, always.
                                desktopRows ? (
                                    <OpportunityRow
                                        key={opp.id}
                                        opp={opp}
                                        isSaved={isJobSaved(opp)}
                                        isApplied={isJobApplied(opp)}
                                        onToggleSave={() => toggleSave(opp.id)}
                                        isSelected={Boolean(showDetail && selectedOpp && opp.id === selectedOpp.id)}
                                        onMouseEnter={showDetail ? (e) => {
                                            const el = e.currentTarget as HTMLElement;
                                            setHoverRect({ top: el.offsetTop, height: el.offsetHeight });
                                            setHoveredOppId(opp.id);
                                        } : undefined}
                                        onMouseLeave={showDetail ? () => {
                                            setHoveredOppId(null);
                                            setHoverRect(null);
                                        } : undefined}
                                        onClick={() => {
                                            // Split selects into its pane; List
                                            // opens the job page. One paradigm
                                            // per view, and the List must not
                                            // carry the split's hover geometry.
                                            if (!showDetail) {
                                                router.push(getOpportunityPathFromItem(opp));
                                                return;
                                            }
                                            savedListScrollTopRef.current = gridContainerRef.current?.scrollTop ?? 0;
                                            preserveListScrollRef.current = true;
                                            handleSelectOpportunity(opp);
                                        }}
                                    />
                                ) : (
                                <JobCardResponsive
                                        key={opp.id}
                                        job={{ ...opp, normalizedRole: opp.title, salary: (opp.salaryMin !== undefined && opp.salaryMax !== undefined) ? { min: opp.salaryMin, max: opp.salaryMax } : undefined } as any}
                                        jobId={opp.id}
                                        isSaved={isJobSaved(opp)}
                                        isApplied={isJobApplied(opp)}
                                        onToggleSave={() => toggleSave(opp.id)}
                                        searchQuery={search}
priority={index < 4}
                                    isAdmin={user?.role === 'ADMIN'}
                                    isSelected={Boolean(type !== 'GOVERNMENT' && showDetail && isDesktop && selectedOpp && opp.id === selectedOpp.id)}
                                    isHovered={Boolean(hoveredOppId && opp.id === hoveredOppId)}
                                    onMouseEnter={() => setHoveredOppId(opp.id)}
                                    onMouseLeave={() => setHoveredOppId(null)}
                                    variant={
                                        (mobileGrid || (type !== 'GOVERNMENT' && showDetail))
                                            ? 'compact'
                                            : 'wide'
                                    }
                                    onClick={(e) => {
                                        // Mobile opens the detail bottom sheet
                                        // (mobileGrid); desktop split selects into
                                        // its pane. The job page is never pushed
                                        // from the feed â€” one paradigm per viewport.
                                        if (type !== 'GOVERNMENT' && (showDetail || mobileGrid)) {
                                            e.preventDefault();
                                            handleSelectOpportunity(opp);
                                        }
                                    }}
                                />
                                )
                            ))}
                        </div>
                        
                        {(visibleCount < visibleOpps.length) && (
                            <div ref={loadMoreRef} className="flex justify-center pt-8 pb-4">
                                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                        )}
                        
                        {visibleOpps.length > 0 && type !== 'GOVERNMENT' && (
                            <RelatedSearches 
                                opportunities={opportunities} 
                                search={search} 
                                filters={filters} 
                                onSearch={(term) => {
                                    setSearch(term);
                                    resetFeedScroll('instant');
                                }} 
                            />
                        )}
                        
                        {bottomContent && (
                            <div className="pt-8 pb-4 border-t border-border/40 mt-8 space-y-8">
                                {bottomContent}
                            </div>
                        )}
                        
                        {/* Spacer so the last card doesn't stick to bottom */}
                        <div className="h-16 md:h-20 shrink-0" />
                    </div>

                    {/* Right Column: Map for Walk-ins / Detail Panel for Jobs (desktop) */}
                    {type !== 'GOVERNMENT' && showDetail && (
                        <div className="hidden xl:flex flex-col xl:h-full xl:min-h-0 bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm mt-3.5 xl:mt-0 xl:border-0 xl:border-l xl:rounded-none xl:shadow-none [:root[data-show-detail='false']_&]:!hidden">
                            {type === 'WALKIN' ? (
                                <WalkinMapPane
                                    opportunity={selectedOpp}
                                    opportunities={visibleOpps}
                                    totalDrives={visibleOpps.length}
                                    hoveredOppId={hoveredOppId}
                                    userLocation={userLocation}
                                    onLocationRequest={onLocationRequest}
                                    onLocationClear={onLocationClear}
                                    locationLoading={locationLoading}
                                    locationRequested={locationRequested}
                                    locationDenied={locationDenied}
                                    onSelectOpportunity={handleSelectOpportunity}
                                    onClearSelection={handleCloseOpportunityPane}
                                    onHoverOpportunity={setHoveredOppId}
                                />
                            ) : selectedOpp ? (
                                <div className="flex-1 overflow-y-auto">
                                    <Suspense fallback={<OpportunityDetailPaneSkeleton />}>
                                        <OpportunityDetailPane
                                            oppId={selectedOpp.slug || selectedOpp.id}
                                            initialData={selectedOpp}
                                            onClose={handleCloseOpportunityPane}
                                        />
                                    </Suspense>
                                </div>
                            ) : visibleOpps.length > 0 ? (
                                <OpportunityDetailPaneSkeleton />
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

                    {/* Mobile Detail Bottom Sheet â€” the mobile paradigm. Taps
                        select (mobileGrid) and the job opens here, never as a
                        page push and never as desktop split rows. */}
                    <Drawer.Root
                        open={isDesktop === false && !!selectedOpp && type !== 'GOVERNMENT'}
                        onOpenChange={(open) => { if (!open) handleCloseOpportunityPane(); }}
                        modal={false}
                    >
                        <Drawer.Portal>
                            <Drawer.Overlay className="fixed inset-0 z-modal bg-black/50 ff-blur-hairline lg:hidden" />
                            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-modal-raised flex flex-col ff-dvh-92 rounded-t-3xl border-t border-border bg-background shadow-2xl outline-none lg:hidden overscroll-contain">
                                <div className="flex justify-center py-2.5 shrink-0 bg-background rounded-t-3xl">
                                    <div className="h-1.5 w-12 rounded-full bg-muted" />
                                </div>
                                <div className="flex-1 min-h-0 flex flex-col ff-safe-bottom">
                                    {selectedOpp && (
                                        <Suspense fallback={<OpportunityDetailPaneSkeleton />}>
                                            <OpportunityDetailPane
                                                oppId={selectedOpp.slug || selectedOpp.id}
                                                initialData={selectedOpp}
                                                onClose={handleCloseOpportunityPane}
                                                isMobile={true}
                                            />
                                        </Suspense>
                                    )}
                                </div>
                            </Drawer.Content>
                        </Drawer.Portal>
                    </Drawer.Root>

                    {/* Mobile Map View Full Screen Overlay for Walkins */}
                    {type === 'WALKIN' && mobileMapView && (
                        <div className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-30 bg-background flex flex-col map-view-enter">
                            {/* Drag handle for visual affordance */}
                            <div className="shrink-0 flex justify-center">
                                <div className="mobile-map-drag-handle" />
                            </div>
                        <div className="flex-1 min-h-0">
                            <WalkinMapPane
                                opportunity={selectedOpp}
                                opportunities={visibleOpps}
                                totalDrives={visibleOpps.length}
                                hoveredOppId={hoveredOppId}
                                userLocation={userLocation}
                                onLocationRequest={onLocationRequest}
                                onLocationClear={onLocationClear}
                                locationLoading={locationLoading}
                                locationRequested={locationRequested}
                                locationDenied={locationDenied}
                                onSelectOpportunity={handleSelectOpportunity}
                                    onClearSelection={handleCloseOpportunityPane}
                                    onHoverOpportunity={setHoveredOppId}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

                {/* Mobile Floating Map/List Switcher for Walkins */}
                {type === 'WALKIN' && (
                    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-overlay pointer-events-auto">
                        <button
                            type="button"
                            onClick={() => setMobileMapView(prev => !prev)}
                            className="flex items-center gap-2 px-5 py-3 rounded-full bg-foreground text-background font-bold text-xs shadow-2xl border border-border/50 backdrop-blur-md active:scale-95 transition-all duration-150 cursor-pointer hover:shadow-lg"
                        >
                            {mobileMapView ? (
                                <>
                                    <ListBulletIcon className="w-4 h-4 text-success" />
                                    <span>Show List</span>
                                </>
                            ) : (
                                <>
                                    <MapIcon className="w-4 h-4 text-success" />
                                    <span>Show Map</span>
                                    <span className="text-xs text-background/60 font-medium">({visibleOpps.length})</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {showScrollTop && (
                    <button
                        onClick={() => resetFeedScroll('smooth')}
                        aria-label="Scroll to top"
                        className="fixed ff-bottom-fab md:bottom-8 right-4 md:right-8 z-sheet flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                    >
                        <ChevronUpIcon className="w-5 h-5" />
                    </button>
                )}

            </div>{/* end scrollable content */}
        </div>
    );
}

/**
 * Empty-state contribution invite.
 *
 * The feed above is a list of openings, so a missing one is best shown as an
 * unfilled slot: a dashed rule with a dashed plus tile standing in for the row
 * that should be there. Deliberately not a card â€” the rule is the structure
 * and the tile is the only thing that moves, so the affordance reads as "add a
 * row" rather than "here is another module". The tile fills on hover and the
 * arrow nudges, so the row acknowledges the pointer without any animation on
 * a control people click once.
 *
 * The copy names the review step because /contribute is moderated: promising
 * an instant listing would be a lie the empty state is the worst place to tell.
 */
function SubmitOpeningInvite({ className }: { className?: string }) {
    return (
        <div className={cn('group/submit mx-auto w-full max-w-xl', className)}>
            <div aria-hidden="true" className="border-t border-dashed border-border" />

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:gap-4">
                <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/40 bg-primary/5 text-primary transition-colors duration-150 ease-out group-hover/submit:border-solid group-hover/submit:bg-primary group-hover/submit:text-primary-foreground motion-reduce:transition-none"
                >
                    <PlusIcon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                        Know of an opening we&apos;re missing?
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        Share a job or a drive. Every submission is reviewed before it goes live.
                    </p>
                </div>

                <Button asChild variant="default" size="chip" className="shrink-0">
                    <Link href="/contribute">
                        Submit one
                        <ArrowRightIcon
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 transition-transform duration-150 ease-out group-hover/submit:translate-x-0.5 motion-reduce:transform-none"
                        />
                    </Link>
                </Button>
            </div>
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
        <div className="pt-8 pb-8 border-t border-border/50 mt-8 mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">People also searched</h3>
            <div className="flex flex-wrap gap-2">
                {relatedTerms.map((term) => (
                    <BrandButton
                        key={term}
                        variant="outline"
                        onClick={() => onSearch(term)}
                    >
                        <MagnifyingGlassIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {term}
                    </BrandButton>
                ))}
            </div>
        </div>
    );
}
