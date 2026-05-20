'use client';

import { cn } from '@repo/ui/utils/cn';
import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import JobCard from '@/features/opportunities/components/JobCard';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FeedPageSkeleton, SkeletonJobCard } from '@/components/ui/Skeleton';
import { useOpportunitiesFeed } from '@/features/opportunities/controller';
import { useAuth } from '@/features/auth';
import { FilterDropdownBar, type FilterBarFilters } from '@/features/opportunities/components/FilterDropdownBar';
import dynamic from 'next/dynamic';

const MobileFilterDrawer = dynamic(() => import('@/features/opportunities/components/MobileFilterDrawer').then(m => m.MobileFilterDrawer));

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
    REMOTE: {
        title: 'Remote Opportunities',
        subtitle: 'Fresh roles you can pursue from anywhere',
        icon: BriefcaseIcon,
    },
    GOVERNMENT: {
        title: 'Government Jobs',
        subtitle: 'Official notices and public-sector openings',
        icon: ShieldCheckIcon,
    },
    HACKATHONS: {
        title: 'Hackathons',
        subtitle: 'Competitions, challenges, and builder programs',
        icon: AcademicCapIcon,
    },
} satisfies Record<OpportunityType, {
    title: string;
    subtitle: string;
    icon: typeof BriefcaseIcon;
}>;

interface CategoryPageProps {
    type: OpportunityType;
    initialData?: {
        opportunities: Opportunity[];
        total: number;
        cachedAt?: number;
    } | null;
}

function CategoryPageContent({ type, initialData }: CategoryPageProps) {
    const { user } = useAuth();
    const config = CATEGORY_CONFIG[type];
    const IconComponent = config.icon;

    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<FilterBarFilters>({
        location: null,
        salary: null,
        year: null,
        closingSoon: false,
        saved: false,
    });

    // Mobile draft state
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [draftLoc, setDraftLoc] = useState<string | null>(null);
    const [draftYear, setDraftYear] = useState<number | null>(null);
    const [draftClosingSoon, setDraftClosingSoon] = useState(false);
    const [draftShowOnlySaved, setDraftShowOnlySaved] = useState(false);
    const [draftMinSalary, setDraftMinSalary] = useState<number | null>(null);

    const mobileActiveCount =
        (filters.location ? 1 : 0) +
        (filters.closingSoon ? 1 : 0) +
        (filters.saved ? 1 : 0) +
        (filters.salary ? 1 : 0) +
        (filters.year ? 1 : 0);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const {
        filteredOpps,
        totalCount,
        isLoading,
        error,
        profileIncomplete,
        toggleSave,
        reload,
    } = useOpportunitiesFeed({
        type,
        selectedLoc: filters.location,
        showOnlySaved: filters.saved,
        closingSoon: filters.closingSoon,
        minSalary: filters.salary,
        selectedYear: filters.year,
        search,
        initialData,
    });

    const isJobSaved = (opp: Opportunity) => opp.isSaved || false;
    const isJobApplied = (opp: Opportunity) => opp.actions && opp.actions.length > 0;

    const openMobileFilters = () => {
        setDraftLoc(filters.location);
        setDraftYear(filters.year);
        setDraftClosingSoon(filters.closingSoon);
        setDraftShowOnlySaved(filters.saved);
        setDraftMinSalary(filters.salary);
        setIsMobileFilterOpen(true);
    };

    const applyMobileFilters = () => {
        setFilters({
            location: draftLoc,
            salary: draftMinSalary,
            year: draftYear,
            closingSoon: draftClosingSoon,
            saved: draftShowOnlySaved,
        });
        setIsMobileFilterOpen(false);
    };

    const clearAll = () => {
        setSearch('');
        setFilters({ location: null, salary: null, year: null, closingSoon: false, saved: false });
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-3 md:px-6 pb-12 md:pb-20 space-y-6 md:space-y-6">

            {/* Header / Title & Search row */}
            <div className="flex flex-col gap-4 pb-4">
                {/* Top Row: Icon + Title left-aligned, results on Right */}
                <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/60 border border-border">
                            <IconComponent className="w-4 h-4 text-foreground" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                            {config.title}
                        </h1>
                    </div>

                    {/* Results count & view all badge on the far right */}
                    <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border capitalize tracking-wider">
                            {mounted ? filteredOpps.length : 0} results
                        </span>
                        <Link href="/opportunities" className="text-[10px] font-semibold text-primary hover:underline capitalize tracking-widest">
                            View all
                        </Link>
                    </div>
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
                                    placeholder="Search by role or company..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-10 text-xs rounded-xl bg-card border-border shadow-sm w-full"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Mobile filter button next to search */}
                            <button
                                onClick={openMobileFilters}
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
                        />
                    </div>
                </div>
            </div>

            {/* Mobile drawer */}
            <MobileFilterDrawer
                isOpen={isMobileFilterOpen}
                onClose={() => setIsMobileFilterOpen(false)}
                draftLoc={draftLoc}
                setDraftLoc={setDraftLoc}
                draftYear={draftYear}
                setDraftYear={setDraftYear}
                draftClosingSoon={draftClosingSoon}
                setDraftClosingSoon={setDraftClosingSoon}
                draftShowOnlySaved={draftShowOnlySaved}
                setDraftShowOnlySaved={setDraftShowOnlySaved}
                draftMinSalary={draftMinSalary}
                setDraftMinSalary={setDraftMinSalary}
                isLoggedIn={!!user}
                onApply={applyMobileFilters}
                onClear={() => {
                    setDraftLoc(null);
                    setDraftYear(null);
                    setDraftClosingSoon(false);
                    setDraftShowOnlySaved(false);
                    setDraftMinSalary(null);
                }}
            />

            {/* Full-width grid */}
            {profileIncomplete ? (
                <div className="p-12 md:p-20 text-center rounded-2xl border border-border bg-card">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheckIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight mb-2">Profile Readiness Required</h3>
                    <div className="max-w-md mx-auto space-y-6">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                            {profileIncomplete.message}
                        </p>
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
                            <Link href="/profile">
                                Complete Profile
                                <ChevronRightIcon className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                </div>
            ) : isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {[1, 2, 3, 4, 5, 6].map((item) => <SkeletonJobCard key={item} />)}
                </div>
            ) : error ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
                    <h3 className="text-lg font-bold text-foreground tracking-tight">Feed unavailable</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-2 max-w-sm mx-auto">{error}</p>
                    <Button variant="outline" onClick={() => reload()} className="mt-6 h-10 px-6 text-xs font-bold capitalize tracking-widest">
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
                        Try adjusting your filters or search keywords.
                    </p>
                    <Button variant="outline" onClick={clearAll} className="mt-6 h-11 px-6 text-sm font-bold capitalize tracking-widest">
                        Clear filters
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                        {filteredOpps.map((opp) => (
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
                            />
                        ))}
                    </div>

                    {!isLoading && !profileIncomplete && (
                        <div className={cn("mt-12 text-center pb-8 border-t border-border/50 pt-8")}>
                            <p className="text-[10px] font-bold text-muted-foreground/40 capitalize tracking-[0.2em]">
                                Verified - {totalCount} listings active
                            </p>
                        </div>
                    )}
                </div>
            )
            }

            {/* Category FAQ / Info Guide for Search Engines and Users (Soft 404 Prevention) */}
            <div className="mt-16 pt-8 border-t border-border/50 space-y-6 max-w-3xl">
                <h2 className="text-sm font-bold text-foreground tracking-tight uppercase tracking-wider">
                    {type === OpportunityType.WALKIN 
                        ? 'About Walk-in Interview Drives' 
                        : type === OpportunityType.INTERNSHIP 
                        ? 'About Fresher Internships' 
                        : 'About Fresher Jobs'}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {type === OpportunityType.WALKIN
                        ? 'Walk-in interview drives are recruitment events where candidates can directly walk in for an interview without any prior appointment or referral. These drives are excellent fast-track opportunities for freshers to get hired quickly by top employers. Be sure to carry multiple copies of your resume, academic certificates, and a valid photo ID to the venue.'
                        : type === OpportunityType.INTERNSHIP
                        ? 'Internships are an exceptional way for fresh graduates and college students to gain practical industry experience, build their technical portfolios, and establish strong professional connections. Many fresher internships also lead to direct full-time pre-placement offers (PPOs).'
                        : 'Explore verified entry-level job listings and off-campus recruitment drives for fresh graduates across India. These opportunities span across multiple domains including software development, IT services, finance, marketing, and operations, designed specifically for early-career professionals.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-card border border-border/60">
                        <h3 className="text-xs font-bold text-foreground mb-1">
                            {type === OpportunityType.WALKIN ? 'What to bring to a walk-in?' : 'How to qualify?'}
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {type === OpportunityType.WALKIN
                                ? 'Ensure you carry updated copies of your CV, a copy of the official job notification, any required graduation transcripts, and dress in professional business attire.'
                                : 'Most entry-level listings require basic domain knowledge, a strong learning attitude, and a degree in relevant fields (B.E/B.Tech, M.C.A, B.Sc, etc.).'}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border/60">
                        <h3 className="text-xs font-bold text-foreground mb-1">
                            {type === OpportunityType.WALKIN ? 'Are walk-ins free?' : 'Are these listings verified?'}
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {type === OpportunityType.WALKIN
                                ? 'Yes, all verified walk-in drives published on FresherFlow are completely free. We strictly prohibit and filter out any paid training or fraudulent recruitment events.'
                                : 'Yes, every listing is meticulously reviewed by our team to ensure it contains active apply links, clear job descriptions, and genuine employer details.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

    );
}

export default function CategoryPage({ type, initialData }: CategoryPageProps) {
    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <CategoryPageContent type={type} initialData={initialData} />
        </Suspense>
    );
}
