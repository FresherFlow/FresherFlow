'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { type Opportunity } from '@fresherflow/types';
// removed unused toast imports
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { OpportunityDetailSkeleton } from '@/components/ui/Skeleton';
// removed unused feedbackApi import

// EligibilitySnapshotCard hidden
import { WalkInDetailsCard } from './components/WalkInDetailsCard';
import { RelatedOpportunities } from './components/RelatedOpportunities';
import { DetailRequirements } from './components/DetailRequirements';
import { DetailTimeline } from './components/DetailTimeline';
import { DetailCampusDriveInfo } from './components/DetailCampusDriveInfo';
import { DetailHeroSection } from './components/DetailHeroSection';
import { DetailActionHeader } from './components/DetailActionHeader';
import { DetailActionMobile } from './components/DetailActionMobile';
import { DetailSidebarActions } from './components/DetailSidebarActions';
import { ExpiredWarning } from './components/ExpiredWarning';
import { DescriptionSection } from './components/DescriptionSection';
import { QuickActionsMobile } from './components/QuickActionsMobile';
import { MobileGuestCTA } from './components/MobileGuestCTA';
import { GovernmentDetailsCard } from './components/GovernmentDetailsCard';
import { GovernmentOpportunityOverview } from './components/GovernmentOpportunityOverview';
import { GovernmentStickyActionBar } from './components/GovernmentStickyActionBar';
import { useSiteMode } from '@/contexts/SiteModeContext';
import { filterOpportunitiesForSiteMode, matchesOpportunitySiteMode } from '@/lib/opportunityMode';

// Hooks & Utils
import { useOpportunityDetail } from './useOpportunityDetail';
import { useOpportunityDerivedState } from './useOpportunityDerivedState';
import { useOpportunityReport } from './useOpportunityReport';

export default function OpportunityDetailClient({ id, initialData }: { id: string; initialData?: Opportunity | null }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile } = useAuth();
    const { mode, setMode } = useSiteMode();

    // Core Logic Hook
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
    } = useOpportunityDetail(id, initialData, user);

    const reportMenuRef = useRef<HTMLDivElement | null>(null);
    const ds = useOpportunityDerivedState(opp as Opportunity, profile, searchParams);

    const {
        showReports,
        setShowReports,
        handleReport
    } = useOpportunityReport(opp as Opportunity, user);
    const relatedForMode = useMemo(
        () => filterOpportunitiesForSiteMode(relatedOpps, mode),
        [relatedOpps, mode]
    );

    const jumpToTimeline = () => {
        if (typeof document === 'undefined') return;
        const section = document.getElementById('drive-timeline');
        if (!section) return;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (isLoading) return <OpportunityDetailSkeleton />;

    if (error) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 space-y-4">
                <div className="p-4 bg-destructive/10 rounded-full">
                    <ExclamationTriangleIcon className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Failed to load opportunity</h2>
                <p className="text-muted-foreground text-center max-w-md">{error}</p>
                <Button onClick={() => void loadOpportunity()} className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    Retry Loading
                </Button>
                <Link href="/opportunities">
                    <Button variant="ghost">Browse other jobs</Button>
                </Link>
            </div>
        );
    }

    if (!opp) return null;

    if (!matchesOpportunitySiteMode(opp, mode)) {
        const targetMode = opp.governmentJobDetails ? 'govt' : 'private';
        const targetLabel = opp.governmentJobDetails ? 'Govt Mode' : 'Private Mode';

        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 md:p-8 text-center space-y-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                        Mode Restricted Listing
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                        This listing is available in {targetLabel}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        We keep government jobs and private opportunities separate. Switch the site mode to continue viewing this listing.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button onClick={() => setMode(targetMode)} className="min-w-40">
                            Switch to {targetLabel}
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/dashboard')} className="min-w-40">
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const isGovernmentJob = Boolean(opp.governmentJobDetails);

    return (
        <div className={`min-h-screen pb-16 selection:bg-primary/20 ${isGovernmentJob ? 'bg-[linear-gradient(180deg,#edf4fb_0%,#f7fafc_28%,#ffffff_100%)]' : 'bg-background'}`}>
            <main className="relative z-10 max-w-6xl mx-auto px-4 pt-2 pb-4 md:py-7 space-y-3 md:space-y-5">

                <div className="hidden md:block">
                    <DetailActionHeader
                        user={user}
                        opp={opp}
                        router={router}
                        handleShare={handleShare}
                        handleCopyLink={handleCopyLink}
                        showReports={showReports}
                        setShowReports={setShowReports}
                        reportMenuRef={reportMenuRef}
                        handleReport={handleReport}
                    />
                </div>

                {isGovernmentJob ? (
                    <div className="max-w-4xl mx-auto space-y-4 md:space-y-5">
                        {opp.expiresAt && ds.isExpired(opp) && <ExpiredWarning />}

                        <DetailHeroSection
                            opp={opp}
                            isCampusDrive={ds.isCampusDrive}
                            listingState={ds.listingState}
                            driveDateItems={ds.driveDateItems}
                            driveMeta={ds.driveMeta}
                            displaySalary={ds.displaySalary}
                            locationInfo={ds.locationInfo}
                            formatDeadline={ds.formatDeadline}
                            isExpired={ds.isExpired}
                            isClosingSoon={ds.isClosingSoon}
                        />

                        {/* Eligibility Snapshot Hidden */}

                        <GovernmentOpportunityOverview opp={opp} />

                        <DescriptionSection
                            description={opp.description}
                            title="Notification Summary"
                        />

                        <GovernmentDetailsCard
                            details={opp.governmentJobDetails!}
                            tags={opp.tags}
                        />

                        <RelatedOpportunities relatedOpps={relatedForMode} isLoadingRelated={isLoadingRelated} />

                        <GovernmentStickyActionBar
                            user={user}
                            opp={opp}
                            hasApplyLink={ds.hasApplyLink}
                            handleApply={handleApply}
                            handleToggleSave={handleToggleSave}
                            loginFromDetailHref={ds.loginFromDetailHref}
                        />
                    </div>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* Left Column */}
                    <div className="space-y-4 md:space-y-6">

                        {opp.expiresAt && ds.isExpired(opp) && <ExpiredWarning />}

                        <DetailHeroSection
                            opp={opp}
                            isCampusDrive={ds.isCampusDrive}
                            listingState={ds.listingState}
                            driveDateItems={ds.driveDateItems}
                            driveMeta={ds.driveMeta}
                            displaySalary={ds.displaySalary}
                            locationInfo={ds.locationInfo}
                            formatDeadline={ds.formatDeadline}
                            isExpired={ds.isExpired}
                            isClosingSoon={ds.isClosingSoon}
                        />

                        <DetailActionMobile
                            user={user}
                            opp={opp}
                            isCampusDrive={ds.isCampusDrive}
                            timelineEvents={ds.timelineEvents}
                            hasApplyLink={ds.hasApplyLink}
                            handleApply={handleApply}
                            handleToggleSave={handleToggleSave}
                            handleShare={handleShare}
                            handleCopyLink={handleCopyLink}
                            jumpToTimeline={jumpToTimeline}
                            loginFromDetailHref={ds.loginFromDetailHref}
                            router={router}
                        />

                        <DescriptionSection
                            description={opp.description}
                            title={isGovernmentJob ? 'Notification Summary' : 'Description'}
                        />

                        {opp.governmentJobDetails && (
                            <>
                                <GovernmentOpportunityOverview opp={opp} />
                                <GovernmentDetailsCard
                                    details={opp.governmentJobDetails}
                                    tags={opp.tags}
                                />
                            </>
                        )}

                        {!user && (
                            <QuickActionsMobile
                                onReportClick={() => {
                                    setShowReports(true);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            />
                        )}
                    </div>

                    {/* Right Column */}
                    <aside className="space-y-4 md:space-y-6 lg:sticky lg:top-24">
                        {/* Eligibility Snapshot Hidden */}

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
                            handleApply={handleApply}
                            handleToggleSave={handleToggleSave}
                            loginFromDetailHref={ds.loginFromDetailHref}
                            listingState={ds.listingState}
                            formatDeadline={ds.formatDeadline}
                        />

                        {!isGovernmentJob && (
                            <DetailRequirements
                                opp={opp}
                                educationDetails={ds.educationDetails}
                            />
                        )}

                        {opp.type === 'WALKIN' && opp.walkInDetails && (
                            <WalkInDetailsCard walkInDetails={opp.walkInDetails} />
                        )}

                        {ds.isCampusDrive && (
                            <DetailCampusDriveInfo
                                driveMeta={ds.driveMeta}
                                hasApplyLink={ds.hasApplyLink}
                                handleApply={handleApply}
                            />
                        )}

                        <DetailTimeline
                            timelineEvents={ds.timelineEvents}
                            upcomingTimelineEvents={ds.upcomingTimelineEvents}
                        />
                    </aside>
                </div>
                )}

                {!isGovernmentJob && <RelatedOpportunities relatedOpps={relatedForMode} isLoadingRelated={isLoadingRelated} />}
            </main>

            {!user && <MobileGuestCTA loginFromDetailHref={ds.loginFromDetailHref} />}
        </div>
    );
}
