'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth/AuthContext';
import { type Opportunity } from '@fresherflow/types';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import TagIcon from '@heroicons/react/24/outline/TagIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';

import Bars3Icon from '@heroicons/react/24/outline/Bars3Icon';

const MobileNavMenu = dynamic(() => import('@/lib/navigation/MobileNavMenu'), { ssr: false });
import Link from 'next/link';
import { Button } from '@/ui/Button';
import { OpportunityDetailSkeleton } from '@/ui/Skeleton';import { cn } from '@repo/ui/utils/cn';
import { slugify } from '@fresherflow/utils';

// Subcomponents
const WalkInDetailsCard = dynamic(() => import('./components/WalkInDetailsCard').then(m => m.WalkInDetailsCard));
const ComplexityCard = dynamic(() => import('./components/ComplexityCard').then(m => m.ComplexityCard));
const RelatedOpportunities = dynamic(() => import('./components/RelatedOpportunities').then(m => m.RelatedOpportunities));
import {
    DetailRequirements,
    RequirementsBox,
    AdditionalDetailsBox
} from './components/DetailRequirements';
import { DetailTimeline } from './components/DetailTimeline';
import { DetailCampusDriveInfo } from './components/DetailCampusDriveInfo';
import { DetailHeroSection } from './components/DetailHeroSection';
import { DetailSidebarActions } from './components/DetailSidebarActions';
import { ExpiredWarning } from './components/ExpiredWarning';
import { DescriptionSection } from './components/DescriptionSection';
import { GovernmentJobDetailView } from './components/GovernmentJobDetailView';
import CompanyLogo from '@/ui/CompanyLogo';
import { AppPromoBanner } from '@/ui/AppPromoBanner';

// Hooks & Utils
import { useOpportunityDetail } from '@/features/opportunities/hooks/useOpportunityDetail';
import { useOpportunityDerivedState } from '@/features/opportunities/hooks/useOpportunityDerivedState';


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

    const ds = useOpportunityDerivedState(opp as Opportunity, profile, searchParams);

    const [showStickyHeader, setShowStickyHeader] = useState(false);
    useEffect(() => {
        const onScroll = () => {
            setShowStickyHeader(window.scrollY > 80);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const [menuOpen, setMenuOpen] = useState(false);

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
        <div className="min-h-screen selection:bg-primary/20 bg-background text-foreground">
            {/* Scroll-Reactive Header on Mobile */}
            <div className={cn(
                "md:hidden fixed top-0 left-0 right-0 z-80 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 flex items-center justify-between transition-all duration-300 transform pt-[env(safe-area-inset-top)]",
                showStickyHeader 
                    ? "translate-y-0 opacity-100" 
                    : "-translate-y-full opacity-0 pointer-events-none"
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
                        className="w-9 h-9 rounded-lg object-contain shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-muted-foreground block truncate leading-none">
                            {opp.company}
                        </span>
                        <h2 className="text-xs font-bold text-foreground mt-0.5 leading-none truncate" title={opp.title}>
                            {opp.title}
                        </h2>
                    </div>
                </div>
                <button
                    onClick={() => setMenuOpen(true)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all shrink-0"
                    aria-label="Open menu"
                >
                    <Bars3Icon className="w-5 h-5" />
                </button>
            </div>

            {/* Edge-to-Edge Banner Header on Desktop / Standard Detail Top Section */}
            <div className="w-full bg-background py-5 md:py-7">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Visual Breadcrumbs */}
                    <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-medium select-none mb-3">
                        <Link href="/" className="hover:text-primary transition-colors">
                            Home
                        </Link>
                        <span className="text-muted-foreground/40">/</span>
                        <Link href={opp.type === 'INTERNSHIP' ? '/internships' : opp.type === 'WALKIN' ? '/walk-ins' : '/jobs'} className="hover:text-primary transition-colors">
                            {opp.type === 'INTERNSHIP' ? 'Internships' : opp.type === 'WALKIN' ? 'Walk-ins' : 'Jobs'}
                        </Link>
                        <span className="text-muted-foreground/40">/</span>
                        <Link href={`/companies/${slugify(opp.company)}`} className="hover:text-primary transition-colors truncate max-w-[120px]">
                            {opp.company}
                        </Link>
                        <span className="text-muted-foreground/40">/</span>
                        <span className="text-foreground font-semibold truncate max-w-[200px]" title={opp.title}>
                            {opp.title}
                        </span>
                    </nav>

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
                        isMobile={false}
                        hasApplyLink={ds.hasApplyLink}
                        handleApply={handleApply}
                        handleShare={handleShare}
                        handleCopyLink={handleCopyLink}
                    />
                </div>
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6 pb-24 lg:pb-8">
                {/* Combined Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    {/* Left/Main Column (60% width on Desktop) */}
                    <div className="space-y-4 md:space-y-6 lg:col-span-3">
                        {opp.expiresAt && ds.isExpired(opp) && <ExpiredWarning />}

                        {/* Mobile-Only Sidebar boxes rendered inline between Hero and Details */}
                        <div className="lg:hidden space-y-4">
                            {/* Combined Requirements */}
                            <RequirementsBox opp={opp} educationDetails={ds.educationDetails} />

                            {/* Combined Additional Details */}
                            <AdditionalDetailsBox opp={opp} />

                        </div>

                        {/* Complexity / Walk-in / Campus / Timeline details */}
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

                        <AppPromoBanner />

                        {/* Description Section */}
                        <DescriptionSection
                            description={opp.description}
                            title="Description"
                        />

                        {/* Internal Linking Tag Chips */}
                        <div className="space-y-4 py-4 border-t border-border/40">
                            <h3 className="text-base font-bold text-foreground tracking-tight">Explore Related Placements</h3>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {/* Company Link */}
                                <Link href={`/companies/${slugify(opp.company)}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary font-semibold border border-primary/10 transition-colors">
                                    <BriefcaseIcon className="w-3.5 h-3.5" />
                                    {opp.company} Careers
                                </Link>
                                {/* Batch Links */}
                                {opp.allowedPassoutYears?.map(year => (
                                    <Link key={year} href={`/batch/${year}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/5 hover:text-primary text-muted-foreground font-semibold border border-border transition-colors">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {year} Batch Jobs
                                    </Link>
                                ))}
                                {/* Location Links */}
                                {opp.locations?.map(loc => {
                                    const locSlug = slugify(loc);
                                    if (loc.toLowerCase() === 'india' || loc.toLowerCase() === 'pan india') return null;
                                    return (
                                        <Link key={loc} href={`/location/${locSlug}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/5 hover:text-primary text-muted-foreground font-semibold border border-border transition-colors">
                                            <MapPinIcon className="w-3.5 h-3.5" />
                                            Jobs in {loc}
                                        </Link>
                                    );
                                })}
                                {/* Skill Links */}
                                {opp.requiredSkills?.map(skill => (
                                    <Link key={skill} href={`/skills/${slugify(skill)}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/5 hover:text-primary text-muted-foreground font-semibold border border-border transition-colors">
                                        <TagIcon className="w-3.5 h-3.5" />
                                        <span className="capitalize">{skill}</span> Jobs
                                    </Link>
                                ))}
                                {/* Role / Job Function Link */}
                                {opp.jobFunction && (
                                    <Link 
                                        href={opp.jobFunction.toLowerCase() === 'internship' ? '/internships' : `/roles/${slugify(opp.jobFunction)}`} 
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/5 hover:text-primary text-muted-foreground font-semibold border border-border transition-colors"
                                    >
                                        <UserIcon className="w-3.5 h-3.5" />
                                        <span className="capitalize">{opp.jobFunction}</span> Jobs
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Mobile-Only Progress Tracker */}
                        {user && (
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
                                                    "h-8 rounded-lg border text-[11px] font-bold transition-all",
                                                    isActive
                                                        ? "bg-primary/10 text-primary border-primary/20"
                                                        : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40",
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

                        {/* Mobile-Only Admin Actions */}
                        {user?.role === 'ADMIN' && (
                            <div className="lg:hidden bg-card p-4 border border-primary/20 rounded-xl space-y-2">
                                <h4 className="text-xs font-bold text-primary">Admin Control</h4>
                                <Link href={`/opportunities/edit/${opp.id}`} className="block">
                                    <Button variant="outline" className="w-full text-xs font-bold h-8 hover:bg-primary/5">
                                        Edit Opportunity
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Right Column (40% width on Desktop, Hidden on Mobile) */}
                    <aside className="hidden lg:block lg:col-span-2 space-y-4 md:space-y-6 lg:sticky lg:top-24">
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
                            loginFromDetailHref={ds.loginFromDetailHref}
                            listingState={ds.listingState}
                            formatDeadline={ds.formatDeadline}
                        />



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

            {/* Sticky Bottom Apply Bar on Mobile */}
            {ds.hasApplyLink && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur px-4 py-3.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] flex items-center gap-2.5">
                    <div className="flex-1">
                        {ds.listingState === 'EXPIRED' ? (
                            <button
                                disabled
                                className="w-full h-12 rounded-xl bg-muted border border-border text-muted-foreground flex items-center justify-center gap-2 text-sm font-bold cursor-not-allowed select-none"
                            >
                                <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                                Applications Closed
                            </button>
                        ) : (
                            <button
                                onClick={handleApply}
                                className="w-full h-12 text-sm bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.99] rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg transition-all"
                            >
                                {isGovernmentJob ? 'Apply on Official Portal' : 'Apply on Website'}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleShare}
                        className="shrink-0 w-12 h-12 rounded-xl border border-border bg-muted/20 text-muted-foreground flex items-center justify-center hover:bg-muted/40 hover:text-foreground active:scale-[0.98] transition-all"
                        aria-label="Share"
                    >
                        <ShareIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="shrink-0 w-12 h-12 rounded-xl border border-border bg-muted/20 text-muted-foreground flex items-center justify-center hover:bg-muted/40 hover:text-foreground active:scale-[0.98] transition-all"
                        aria-label="Copy Link"
                    >
                        <LinkIcon className="w-5 h-5" />
                    </button>
                </div>
            )}

            {menuOpen && (
                <MobileNavMenu
                    user={user}
                    unreadCount={0}
                    pendingSyncCount={0}
                    onClose={() => setMenuOpen(false)}
                />
            )}
        </div>
    );
}
