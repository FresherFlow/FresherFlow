'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth/AuthContext';
import { type Opportunity } from '@fresherflow/types';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import { BrandButton } from '@/ui/BrandButton';
import { DidYouApplyCard } from '@/features/jobs/components/detail/DidYouApplyCard';
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
import {
    DetailRequirements,
    RequirementsBox,
    AdditionalDetailsBox
} from '@/features/jobs/components/detail/DetailRequirements';
import { DetailTimeline } from '@/features/jobs/components/detail/DetailTimeline';
import { DetailHeroSection } from '@/features/jobs/components/detail/DetailHeroSection';
import { DetailSidebarActions } from '@/features/jobs/components/detail/DetailSidebarActions';
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
                        <h2 className="text-2xl font-extrabold text-foreground leading-tight md:text-3xl">
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
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    {/* LEFT: Hero + Description + Related */}
                    <div className="lg:col-span-3 space-y-5">
                        <DetailHeroSection
                            opp={opp}
                            isCampusDrive={ds.isCampusDrive}
                            listingState={ds.listingState}
                            driveDateItems={ds.driveDateItems}
                            driveMeta={ds.driveMeta}
                            displaySalary={ds.displaySalary}
                            locationInfo={ds.locationInfo}
                            formatDeadline={ds.formatDeadline}
                        />

                        <ExpiredWarningIfAny opp={opp} isExpired={ds.isExpired} />

                        {/* Post-apply confirmation. Self-gates on the armed
                            session flag, so it renders nothing until the user
                            has been sent out to the employer's site and is due
                            back. Sits above the description at both widths. */}
                        {opp && (
                            <DidYouApplyCard
                                jobId={opp.id}
                                jobTitle={opp.title}
                                company={opp.company}
                                setAction={handleSetAction}
                                isUpdatingAction={isUpdatingAction}
                            />
                        )}

                        {/* Mobile-Only Sidebar boxes */}
                        <div className="lg:hidden space-y-4">
                            <RequirementsBox opp={opp} educationDetails={ds.educationDetails} />
                            <AdditionalDetailsBox opp={opp} />
                        </div>

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

                        <DescriptionSection
                            description={opp.description}
                            title="Description"
                        />

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
                                                    isActive ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40",
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

                        {isMounted && user?.role === 'ADMIN' && (
                            <div className="lg:hidden bg-card p-4 border border-primary/20 rounded-xl space-y-2">
                                <h4 className="text-xs font-bold text-primary">Admin Control</h4>
                                <Link href={`/admin/opportunities/edit/${opp.id}`} className="block">
                                    <Button size="sm" variant="outline" className="w-full">Edit Opportunity</Button>
                                </Link>
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
                        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-5">
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
                            <div className="border-t border-border/40" />
                            <DetailRequirements
                                opp={opp}
                                educationDetails={ds.educationDetails}
                            />
                        </div>
                    </aside>
                </div>

                {/* Related Opportunities - full width below the two-column layout */}
                <div className="mt-8 pt-6 border-t border-border/40">
                    <RelatedOpportunities relatedOpps={relatedForMode} isLoadingRelated={isLoadingRelated} />
                </div>

                {/* Internal links. These are real pages and the SEO is worth
                    keeping, but they were eight filled pills sitting between the
                    description and the related-jobs grid in the same visual
                    language as real UI - so they read as content nobody could use
                    and pushed the actual next step down the page. Moved below the
                    grid and reduced to one quiet line of plain text links. */}
                <nav
                    aria-label="Related directories"
                    className="mt-6 border-t border-border/40 pt-4 text-xs text-muted-foreground"
                >
                    <span className="mr-2">Related:</span>{' '}
                    <Link
                        href={`/companies/${(opp as any).companySlug || getCompanySlug((opp as any).companyWebsite, opp.company)}`}
                        className="font-medium underline underline-offset-2 transition-colors hover:text-foreground"
                    >
                        {opp.company} Careers
                    </Link>
                    {opp.allowedPassoutYears?.map((year) => (
                        <span key={year}>
                            {' · '}
                            <Link
                                href={`/jobs/${year}-batch`}
                                className="font-medium underline underline-offset-2 transition-colors hover:text-foreground"
                            >
                                {year} batch jobs
                            </Link>
                        </span>
                    ))}
                    {opp.locations
                        ?.filter((loc) => {
                            if (loc.toLowerCase() === 'india' || loc.toLowerCase() === 'pan india') return false;
                            if (validDirectoryLinks?.validLocations?.length) {
                                return validDirectoryLinks.validLocations.includes(loc.trim().toLowerCase());
                            }
                            return true;
                        })
                        .map((loc) => (
                            <span key={loc}>
                                {' · '}
                                <Link
                                    href={`/jobs/${slugify(loc)}-jobs`}
                                    className="font-medium underline underline-offset-2 transition-colors hover:text-foreground"
                                >
                                    Jobs in {loc}
                                </Link>
                            </span>
                        ))}
                    {opp.requiredSkills
                        ?.filter((skill) => {
                            if (validDirectoryLinks?.validSkills?.length) {
                                return validDirectoryLinks.validSkills.includes(skill.trim().toLowerCase());
                            }
                            return true;
                        })
                        .slice(0, 5)
                        .map((skill) => (
                            <span key={skill}>
                                {' · '}
                                <Link
                                    href={`/jobs/${slugify(skill)}-jobs`}
                                    className="font-medium capitalize underline underline-offset-2 transition-colors hover:text-foreground"
                                >
                                    {skill} jobs
                                </Link>
                            </span>
                        ))}
                    {(() => {
                        if (!opp.jobFunction) return null;
                        if (opp.jobFunction.toLowerCase() === 'internship') {
                            return (
                                <span>
                                    {' · '}
                                    <Link
                                        href="/jobs/internships"
                                        className="font-medium capitalize underline underline-offset-2 transition-colors hover:text-foreground"
                                    >
                                        {opp.jobFunction} jobs
                                    </Link>
                                </span>
                            );
                        }
                        const roleSlug = slugify(opp.jobFunction);
                        const CURATED_ROLES = new Set([
                            'software-engineer',
                            'data-analyst',
                            'business-analyst',
                            'frontend-developer',
                            'test-engineer',
                        ]);
                        if (!CURATED_ROLES.has(roleSlug)) return null;
                        return (
                            <span>
                                {' · '}
                                <Link
                                    href={`/jobs/${roleSlug}-jobs`}
                                    className="font-medium capitalize underline underline-offset-2 transition-colors hover:text-foreground"
                                >
                                    {opp.jobFunction} jobs
                                </Link>
                            </span>
                        );
                    })()}
                </nav>
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
                                {isGovernmentJob ? 'Apply on official portal' : 'Apply on company site'}
                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
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
