'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { type Opportunity } from '@fresherflow/types';
// removed unused toast imports
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { OpportunityDetailSkeleton } from '@/components/ui/Skeleton';
// removed unused feedbackApi import

// Components
import { EligibilitySnapshotCard } from './components/EligibilitySnapshotCard';
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

// Hooks & Utils
import { useOpportunityDetail } from './useOpportunityDetail';
import { useOpportunityDerivedState } from './useOpportunityDerivedState';
import { useOpportunityReport } from './useOpportunityReport';

export default function OpportunityDetailClient({ id, initialData }: { id: string; initialData?: Opportunity | null }) {
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
    } = useOpportunityDetail(id, initialData, user);

    const reportMenuRef = useRef<HTMLDivElement | null>(null);
    const ds = useOpportunityDerivedState(opp as Opportunity, profile, searchParams);
    
    const { 
        showReports, 
        setShowReports, 
        handleReport 
    } = useOpportunityReport(opp as Opportunity, user);

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

    return (
        <div className="min-h-screen bg-background pb-16 selection:bg-primary/20">
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 items-start">
                    
                    {/* Left Column */}
                    <div className="lg:col-span-8 space-y-3 md:space-y-4">
                        
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

                        <DescriptionSection description={opp.description} />

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

                        <DetailRequirements 
                            opp={opp}
                            educationDetails={ds.educationDetails}
                        />

                        {opp.type === 'WALKIN' && opp.walkInDetails && (
                            <WalkInDetailsCard walkInDetails={opp.walkInDetails} />
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
                    <aside className="lg:col-span-4 space-y-3 lg:sticky lg:top-24">
                        <EligibilitySnapshotCard
                            statusLabel={ds.eligibilitySnapshot.statusLabel}
                            statusTone={ds.eligibilitySnapshot.statusTone}
                            mustFix={ds.eligibilitySnapshot.mustFix}
                            matchedSkills={ds.eligibilitySnapshot.matchedSkills}
                            missingSkills={ds.eligibilitySnapshot.missingSkills}
                        />
                        
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
                    </aside>
                </div>

                <RelatedOpportunities relatedOpps={relatedOpps} isLoadingRelated={isLoadingRelated} />
            </main>

            {!user && <MobileGuestCTA loginFromDetailHref={ds.loginFromDetailHref} />}
        </div>
    );
}
