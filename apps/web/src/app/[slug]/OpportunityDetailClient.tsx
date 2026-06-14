'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { type Opportunity } from '@fresherflow/types';
// removed unused toast imports
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import Link from 'next/link';
import { Button } from '@/ui/Button';
import { OpportunityDetailSkeleton } from '@/ui/Skeleton';
// removed unused feedbackApi import

// EligibilitySnapshotCard removed
import { WalkInDetailsCard } from './components/WalkInDetailsCard';
import { ComplexityCard } from './components/ComplexityCard';
import { RelatedOpportunities } from './components/RelatedOpportunities';
import { DetailRequirements } from './components/DetailRequirements';
import { DetailTimeline } from './components/DetailTimeline';
import { DetailCampusDriveInfo } from './components/DetailCampusDriveInfo';
import { DetailHeroSection } from './components/DetailHeroSection';
import { DetailActionHeader } from './components/DetailActionHeader';
import { DetailSidebarActions } from './components/DetailSidebarActions';
import { ExpiredWarning } from './components/ExpiredWarning';
import { DescriptionSection } from './components/DescriptionSection';
import { GovernmentJobDetailView } from './components/GovernmentJobDetailView';


// Hooks & Utils
import { useOpportunityDetail } from '@/features/opportunities/hooks/useOpportunityDetail';
import { useOpportunityDerivedState } from '@/features/opportunities/hooks/useOpportunityDerivedState';
import { useOpportunityReport } from '@/features/opportunities/hooks/useOpportunityReport';

export default function OpportunityDetailClient({ 
    id, 
    initialData,
    initialRelatedData = []
}: { 
    id: string; 
    initialData?: Opportunity | null;
    initialRelatedData?: Opportunity[];
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile } = useAuth();

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
    } = useOpportunityDetail(id, initialData, user, initialRelatedData);

    const reportMenuRef = useRef<HTMLDivElement | null>(null);
    const ds = useOpportunityDerivedState(opp as Opportunity, profile, searchParams);

    const {
        showReports,
        setShowReports,
        handleReport
    } = useOpportunityReport(opp as Opportunity, user);
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
                <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 md:p-8 text-center space-y-6">
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
                        <Link href="/opportunities">
                            <Button className="min-w-40 h-11 rounded-full">
                                Browse Opportunities
                            </Button>
                        </Link>
                        <Link href="/jobs">
                            <Button variant="outline" className="min-w-40 h-11 rounded-full">
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
                        formatDeadline={ds.formatDeadline}
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
        <div className="min-h-screen pb-16 selection:bg-primary/20 bg-background text-foreground">
            <main className="relative z-10 max-w-7xl mx-auto px-4 pt-2 pb-4 md:py-7 space-y-3 md:space-y-5">

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

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                    {/* Left Column (60%) */}
                    <div className="space-y-4 md:space-y-6 lg:col-span-3">

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

                        <DescriptionSection
                            description={opp.description}
                            title="Description"
                        />

                        {opp.applicationDetails && opp.applicationDetails.method === 'FORM' && (
                            <ComplexityCard applicationDetails={opp.applicationDetails} />
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
                        
                        <div className="lg:hidden">
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
                                handleShare={handleShare}
                                handleCopyLink={handleCopyLink}
                                loginFromDetailHref={ds.loginFromDetailHref}
                                listingState={ds.listingState}
                                formatDeadline={ds.formatDeadline}
                            />
                        </div>
                    </div>

                    {/* Right Column (40%) */}
                    <aside className="space-y-4 md:space-y-6 lg:sticky lg:top-24 lg:col-span-2">
                        <div className="hidden lg:block">
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
                                handleShare={handleShare}
                                handleCopyLink={handleCopyLink}
                                loginFromDetailHref={ds.loginFromDetailHref}
                                listingState={ds.listingState}
                                formatDeadline={ds.formatDeadline}
                            />
                        </div>

                        <DetailRequirements
                            opp={opp}
                            educationDetails={ds.educationDetails}
                        />
                    </aside>
                </div>

                {opp.applicationDetails && opp.applicationDetails.method === 'ASSESSMENT' && (
                    <ComplexityCard applicationDetails={opp.applicationDetails} />
                )}

                <RelatedOpportunities relatedOpps={relatedForMode} isLoadingRelated={isLoadingRelated} />
            </main>

            
        </div>
    );
}
