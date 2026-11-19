'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth/AuthContext';
import { type Opportunity } from '@fresherflow/types';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import { BrandButton } from '@/ui/BrandButton';
import AuthModal from '@/features/auth/components/AuthModal';
import {
    setPendingAction,
    takePendingAction,
    type PendingAction,
    type PendingActionInput,
} from '@/lib/storage/pendingAction';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';

import Link from 'next/link';
import { Button } from '@/ui/Button';
import { CopyButton } from '@/ui/CopyButton';
import { OpportunityDetailSkeleton } from '@/features/jobs/components/OpportunitySkeletons';import { cn } from '@/ui/cn';
import { slugify } from '@fresherflow/utils/slugify';
import { getCompanySlug } from '@/features/jobs/domain/opportunityDisplay';

// Subcomponents
const ComplexityCard = dynamic(() => import('@/features/jobs/components/detail/ComplexityCard').then(m => m.ComplexityCard));
const RelatedOpportunities = dynamic(() => import('@/features/jobs/components/detail/RelatedOpportunities').then(m => m.RelatedOpportunities));
import { DetailTimeline } from '@/features/jobs/components/detail/DetailTimeline';
import { DetailHeroSection } from '@/features/jobs/components/detail/DetailHeroSection';
import { DetailSidebarActions } from '@/features/jobs/components/detail/DetailSidebarActions';
import { ApplyActionContent } from '@/features/jobs/components/ApplyAction';
import { DescriptionSection } from '@/features/jobs/components/detail/DescriptionSection';
import {
    CampusDriveInfoIfCampus,
    ExpiredWarningIfAny,
    FormComplexityCard,
    WalkInDetailsCardIfAny,
} from '@/features/jobs/components/detail/OpportunityDetailSections';
import { GovernmentJobDetailView } from '@/features/jobs/components/detail/GovernmentJobDetailView';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { JobDiscussionDock } from '@/features/jobs/components/discussion/JobDiscussionDock';
// import { AppPromoBanner } from '@/features/landing/AppPromoBanner';

// Hooks & Utils
import { useOpportunityDetail } from '@/features/jobs/hooks/useOpportunityDetail';
import { useOpportunityDerivedState } from '@/features/jobs/hooks/useOpportunityDerivedState';
import { isInternshipOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';

type Props = {
    id: string;
    initialData?: Opportunity | null;
    initialRelatedData?: Opportunity[];
    validDirectoryLinks?: { validSkills: string[]; validLocations: string[] };
};

export default function OpportunityDetailClient({ 
    id, 
    initialData,
    initialRelatedData = [],
    validDirectoryLinks
}: Props) {
    const router = useRouter();
    const { user } = useAuth();

    // Core Logic Hook
    /* Guest Save. Opens the in-page auth modal instead of a toast, remembers the
       intent so it can be replayed, then replays it on return. The auth journey
       is unchanged: still /login -> username claim -> /onboarding, and
       ?redirect= now survives that whole trip. Declared before
       useOpportunityDetail because the hook takes `requestAuth`. */
    const [pendingAuth, setPendingAuth] = useState<PendingAction | null>(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);

    const requestAuth = useCallback((action: PendingActionInput) => {
        setPendingAction(action);
        setPendingAuth(action);
        setAuthModalOpen(true);
    }, []);

    const closeAuthModal = useCallback(() => {
        setAuthModalOpen(false);
        setPendingAuth(null);
    }, []);

    const {
        opp,
        isLoading,
        error,
        relatedOpps,
        isLoadingRelated,
        isUpdatingAction,
        loadOpportunity,
        handleToggleSave,
        handleSetAction,
        handleApply,
        handleShare,
        handleCopyLink
    } = useOpportunityDetail(id, initialData, user, initialRelatedData, [], requestAuth);

    // Replay once, keyed on `user` becoming truthy after the round trip.
    const replayedRef = useRef(false);
    useEffect(() => {
        if (!user || replayedRef.current) return;
        const stored = takePendingAction();
        replayedRef.current = true;
        setPendingAuth(null);
        if (stored?.type === 'save-job') {
            void handleToggleSave();
        }
    }, [user, handleToggleSave]);

    const ds = useOpportunityDerivedState(opp as Opportunity);

    const [showStickyHeader, setShowStickyHeader] = useState(false);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    const relatedForMode = relatedOpps;

    const jumpToTimeline = () => {
        if (typeof document === 'undefined') return;
        const section = document.getElementById('drive-timeline');
        if (!section) return;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (isLoading) return <OpportunityDetailSkeleton />;

    if (error) {
        const isClean404 = error === 'Listing not found.' || error === 'Opportunity no longer available.';

        if (isClean404) {
            return (
                <div className="min-h-140 flex flex-col items-center justify-center p-4 md:p-8 text-center space-y-6">
                    <div className="flex items-center gap-3">
                        <span className="text-5xl font-black tracking-tight text-primary md:text-6xl">404</span>
                        <div className="h-8 w-px bg-border md:h-10" />
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Listing Not Found</span>
                    </div>
                    <div className="space-y-2 max-w-md">
                        <h2 className="text-2xl font-extrabold text-foreground leading-snug md:text-3xl">
                            This opportunity has moved or expired.
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            The job listing you are looking for is no longer active on FresherFlow. But don&apos;t worry, we have plenty of other active opportunities for you!
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/jobs">
                            <Button size="sm">
                                Browse Opportunities
                            </Button>
                        </Link>
                        <Link href="/jobs">
                            <Button size="sm" variant="outline">
                                Go to Dashboard
                            </Button>
                        </Link>
                    </div>
                    
                    {relatedForMode.length > 0 && (
                        <div className="w-full max-w-4xl mt-12 pt-8 border-t border-border text-left">
                            <RelatedOpportunities relatedOpps={relatedForMode} isLoadingRelated={isLoadingRelated} />
                        </div>
                    )}
                </div>
            );
        }

        // Technical / network error
        return (
            <div className="min-h-120 flex flex-col items-center justify-center p-4 space-y-4">
                <div className="p-4 bg-destructive/10 rounded-full">
                    <ExclamationTriangleIcon className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Failed to load opportunity</h2>
                <p className="text-muted-foreground text-center max-w-md">{error}</p>
                <Button onClick={() => void loadOpportunity()}>
                    <ClockIcon className="w-4 h-4" />
                    Retry Loading
                </Button>
                <Link href="/jobs">
                    <Button variant="ghost">Browse other jobs</Button>
                </Link>
                
                {relatedForMode.length > 0 && (
                    <div className="w-full max-w-4xl mt-12 pt-8 border-t border-border text-left">
                        <RelatedOpportunities relatedOpps={relatedForMode} isLoadingRelated={isLoadingRelated} />
                    </div>
                )}
            </div>
        );
    }

    if (!opp) return null;

    const isGovernmentJob = Boolean(opp.governmentJobDetails);

    if (isGovernmentJob) {
        return (
            <div className="min-h-screen pb-16 selection:bg-primary/20 bg-background text-foreground">
                <main className="relative z-10 max-w-7xl mx-auto px-4 pt-4 pb-4 md:py-8 space-y-6">
                    <GovernmentJobDetailView
                        opp={opp}
                        user={user}
                        currentAction={ds.currentAction}
                        trackerOptions={ds.trackerOptions}
                        isUpdatingAction={isUpdatingAction}
                        handleSetAction={handleSetAction}
                        hasApplyLink={ds.hasApplyLink}
                        handleApply={handleApply}
                        handleToggleSave={handleToggleSave}
                        handleShare={handleShare}
                        handleCopyLink={handleCopyLink}
                        listingState={ds.listingState}
                    />


                    {relatedForMode.length > 0 && (
                        <div className="pt-6 border-t border-border">
                            <RelatedOpportunities relatedOpps={relatedForMode} isLoadingRelated={isLoadingRelated} />
                        </div>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen selection:bg-primary/20 bg-background text-foreground">
            {/* Scroll-Reactive Header on Mobile.
                This is a REPLACEMENT for the app header, not a second bar on top
                of it: same `z-*` band, same height, fully opaque. At
                `bg-background/95` + `backdrop-blur-md` the app header showed
                through underneath, so scrolling produced two stacked bars and it
                read as a new layer appearing. */}
            <div className={cn(
                "md:hidden fixed top-0 left-0 right-0 z-80 flex items-center justify-between border-b border-border/40 bg-background px-4 pt-0 transition-transform duration-300",
                showStickyHeader
                    ? "translate-y-0"
                    : "-translate-y-full pointer-events-none"
            )}
            style={{ height: `calc(3.5rem + env(safe-area-inset-top))` }}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button 
                        onClick={() => router.back()} 
                        className="p-1 -ml-1 rounded-lg text-muted-foreground hover:text-foreground"
                        aria-label="Go back"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <CompanyLogo
                        companyName={opp.company}
                        companyWebsite={opp.companyWebsite}
                        companyLogoUrl={opp.companyLogoUrl}
                        applyLink={opp.applyLink}
                        isGovernment={isGovernmentJob}
                        className="w-9 h-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-muted-foreground block truncate leading-none">
                            {opp.company}
                        </span>
                        <h2 className="text-xs font-bold text-foreground mt-0.5 leading-none truncate" title={opp.title}>
                            {opp.title}
                        </h2>
                    </div>
                </div>
                <div className="flex items-center shrink-0">
                    <button onClick={handleShare} className="p-2 -mr-1 hover:bg-muted rounded-full transition-colors active:scale-95" title="Share"><ShareIcon className="w-5 h-5 text-foreground" /></button>
                </div>
            </div>

            {/* Main Layout: Title+Content (left) + Sidebar (right).
                `pb-32` on mobile reserves the height of the fixed apply bar
                (48px button + 12px top + 12px bottom + safe-area inset) so the
                last related card can scroll clear of it instead of being
                permanently clipped underneath. */}
            <div className={cn(
                "max-w-7xl mx-auto px-4 pt-4 pb-8 md:pt-6",
                ds.hasApplyLink && "pb-32 lg:pb-8"
            )}>
                {/* Breadcrumbs  -- €” mobile only (desktop has header breadcrumb) */}
                <nav className="md:hidden flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-medium select-none mb-4">
                    <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                    <span className="text-muted-foreground/40">/</span>
                    <Link href={isInternshipOpportunity(opp) ? '/jobs/internships' : isWalkinOpportunity(opp) ? '/drives/walk-in' : '/jobs'} className="hover:text-primary transition-colors">
                        {isInternshipOpportunity(opp) ? 'Internships' : isWalkinOpportunity(opp) ? 'Walk-ins' : 'Jobs'}
                    </Link>
                    <span className="text-muted-foreground/40">/</span>
                    <Link href={`/companies/${(opp as any).companySlug || getCompanySlug((opp as any).companyWebsite, opp.company)}`} className="hover:text-primary transition-colors truncate max-w-30">
                        {opp.company}
                    </Link>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="text-foreground font-semibold truncate max-w-48" title={opp.title}>{opp.title}</span>
                </nav>

                {/* Two-column: Content (left) + Sidebar (right) */}
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-start">
                    {/* LEFT: Hero + Description + Related */}
                    <div className="lg:col-span-4 space-y-4">
                        <DetailHeroSection
                            opp={opp}
                            isCampusDrive={ds.isCampusDrive}
                            listingState={ds.listingState}
                            driveDateItems={ds.driveDateItems}
                            driveMeta={ds.driveMeta}
                            displaySalary={ds.displaySalary}
                            locationInfo={ds.locationInfo}
                            formatDeadline={ds.formatDeadline}
                            educationDetails={ds.educationDetails}
                        />

                        <ExpiredWarningIfAny opp={opp} isExpired={ds.isExpired} />

                        <FormComplexityCard opp={opp} />

                        <WalkInDetailsCardIfAny opp={opp} />

                        <CampusDriveInfoIfCampus
                            isCampusDrive={ds.isCampusDrive}
                            driveMeta={ds.driveMeta}
                            hasApplyLink={ds.hasApplyLink}
                            handleApply={handleApply}
                        />

                        <DetailTimeline
                            timelineEvents={ds.timelineEvents}
                            upcomingTimelineEvents={ds.upcomingTimelineEvents}
                        />

                        <div className="overflow-hidden rounded-2xl border border-border-strong bg-card p-5 md:p-7 dark:border-transparent">
                            <DescriptionSection
                                description={opp.description}
                                title="Description"
                            />
                        </div>

                        {/* Mobile-Only Progress Tracker */}
                        {isMounted && user && (
                            <div className="lg:hidden p-4 bg-muted/10 border border-border/60 rounded-xl space-y-2">
                                <h4 className="text-xs font-bold text-foreground/80">Track your progress</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {ds.trackerOptions.map((option) => {
                                        const isActive = ds.currentAction === option.key;
                                        return (
                                            <button
                                                key={option.key}
                                                onClick={() => handleSetAction(option.key)}
                                                disabled={isUpdatingAction}
                                                className={cn(
                                                    "h-8 rounded-lg border text-xs font-bold transition-all",
                                                    isActive ? "bg-accent text-accent-foreground border-border" : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40",
                                                    isUpdatingAction && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {opp.applicationDetails && opp.applicationDetails.method === 'ASSESSMENT' && (
                            <ComplexityCard applicationDetails={opp.applicationDetails} />
                        )}
                    </div>

                    {/* RIGHT: Sidebar (desktop only, sticky).
                        `self-start` is what enables the sticky child  -- €” without
                        it the grid item stretches to the full row height and
                        there is nothing left to stick within. No max-height and
                        no internal scroll: the rail scrolls with the page. */}
                    <aside className="hidden lg:col-span-2 lg:block lg:sticky lg:top-14 lg:self-start">
                        <div className="rounded-2xl border border-border-strong bg-card p-5 md:p-6 dark:border-transparent">
                            <DetailSidebarActions
                                user={user}
                                opp={opp}
                                currentAction={ds.currentAction}
                                trackerOptions={ds.trackerOptions}
                                isUpdatingAction={isUpdatingAction}
                                handleSetAction={handleSetAction}
                                hasApplyLink={ds.hasApplyLink}
                                isCampusDrive={ds.isCampusDrive}
                                timelineEvents={ds.timelineEvents}
                                jumpToTimeline={jumpToTimeline}
                                listingState={ds.listingState}
                                formatDeadline={ds.formatDeadline}
                                handleApply={handleApply}
                                handleToggleSave={handleToggleSave}
                                handleShare={handleShare}
                            />
                        </div>

                        <div className="mt-4 rounded-xl border border-border bg-card p-4 dark:border-transparent">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                                Related searches
                            </h3>
                            <div className="mt-2.5 flex flex-wrap gap-2">
                                {(() => {
                                    const titleCase = (value: string) =>
                                        value.trim().split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                    const links: { label: string; href: string }[] = [];
                                    links.push({
                                        label: `${opp.company} careers`,
                                        href: `/companies/${(opp as any).companySlug || getCompanySlug((opp as any).companyWebsite, opp.company)}`,
                                    });
                                    opp.allowedPassoutYears?.forEach((year) => links.push({ label: `${year} batch jobs`, href: `/jobs/${year}-batch` }));
                                    (opp.locations || [])
                                        .filter((loc) => {
                                            if (loc.toLowerCase() === 'india' || loc.toLowerCase() === 'pan india') return false;
                                            if (validDirectoryLinks?.validLocations?.length) return validDirectoryLinks.validLocations.includes(loc.trim().toLowerCase());
                                            return true;
                                        })
                                        .forEach((loc) => links.push({ label: `Jobs in ${titleCase(loc)}`, href: `/jobs/${slugify(loc)}-jobs` }));
                                    (opp.requiredSkills || [])
                                        .filter((skill) => {
                                            if (validDirectoryLinks?.validSkills?.length) return validDirectoryLinks.validSkills.includes(skill.trim().toLowerCase());
                                            return true;
                                        })
                                        .slice(0, 5)
                                        .forEach((skill) => links.push({ label: `${titleCase(skill)} jobs`, href: `/jobs/${slugify(skill)}-jobs` }));
                                    if (opp.jobFunction) {
                                        if (opp.jobFunction.toLowerCase() === 'internship') {
                                            links.push({ label: 'Internships', href: '/jobs/internships' });
                                        } else {
                                            const roleSlug = slugify(opp.jobFunction);
                                            if (['software-engineer','data-analyst','business-analyst','frontend-developer','test-engineer'].includes(roleSlug)) {
                                                links.push({ label: `${titleCase(opp.jobFunction)} jobs`, href: `/jobs/${roleSlug}-jobs` });
                                            }
                                        }
                                    }
                                    return links.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className="inline-flex rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors dark:border-transparent dark:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/40 [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            {link.label}
                                        </Link>
                                    ));
                                })()}
                            </div>
                        </div>

                        {(isLoadingRelated || relatedForMode.length > 0) && (
                            <div className="mt-4">
                                <RelatedOpportunities relatedOpps={relatedForMode} isLoadingRelated={isLoadingRelated} layout="rail" />
                            </div>
                        )}
                    </aside>
                </div>


            </div>

            {/* Sticky Bottom Apply Bar on Mobile.
                The bar is `fixed`, so the page must reserve room for it or the
                last card ("Explore more jobs") sits permanently underneath  -- €”
                that is what clipped the tail of Key Skills on a phone. */}
            {ds.hasApplyLink && (
                <div
                    // Safe-area inset on a fixed bottom bar, same as AdminBottomNav.
                    style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                    className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2.5 border-t border-border bg-card px-4 pt-3 shadow-sm"
                >
                    <div className="flex-1">
                        {ds.listingState === 'EXPIRED' ? (
                            <div className="flex h-12 w-full items-center justify-center gap-2 rounded-xs border border-muted bg-muted/50 text-sm font-bold text-muted-foreground select-none">
                                Applications Closed
                            </div>
                        ) : (
                            <BrandButton
                                variant="neutral"
                                onClick={handleApply}
                                className="h-12 w-full"
                            >
                                <ApplyActionContent
                                    applyLink={opp.applyLink}
                                    isGovernment={isGovernmentJob}
                                    showDestination
                                    showArrow
                                />
                            </BrandButton>
                        )}
                    </div>
                    {/* Share, not a bare copy-link control: the copy button was
                        the same action as Share with no label, and desktop now
                        offers Share only. */}
                    <BrandButton
                        variant="ghost"
                        size="icon"
                        onClick={handleShare}
                        aria-label="Share"
                        title="Share"
                        className="h-12 shrink-0"
                    >
                        <ShareIcon className="w-5 h-5" />
                    </BrandButton>
                </div>
            )}
            {/* Per-job discussion as a floating dock. Client-only and off the
                ISR content path, so the public, crawlable page is unchanged. */}
            <JobDiscussionDock opportunityId={opp.id} jobTitle={opp.title} />

            {/* In-page auth, so a guest tapping Save keeps their place and
                their pending action. Falls back to the full /login page from
                inside the modal if they prefer it. */}
            <AuthModal
                isOpen={authModalOpen}
                onClose={closeAuthModal}
                intent={
                    pendingAuth?.type === 'save-job'
                        ? 'Sign in to save this job, and keep tracking where it takes you.'
                        : undefined
                }
                onAuthenticated={() => {
                    setAuthModalOpen(false);
                    setPendingAuth(null);
                }}
            />
        </div>
    );
}
