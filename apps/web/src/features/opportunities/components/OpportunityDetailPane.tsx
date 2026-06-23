'use client';

import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { type Opportunity } from '@fresherflow/types';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import ArrowsPointingOutIcon from '@heroicons/react/24/outline/ArrowsPointingOutIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import UsersIcon from '@heroicons/react/24/outline/UsersIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CompanyLogo from '@/ui/CompanyLogo';
import { cn } from '@repo/ui/utils/cn';
import Link from 'next/link';
import { Button } from '@/ui/Button';
import { AppPromoBanner } from '@/ui/AppPromoBanner';

// Subcomponents from detail page
import { WalkInDetailsCard } from '@/app/[slug]/components/WalkInDetailsCard';
import { ComplexityCard } from '@/app/[slug]/components/ComplexityCard';
import { DetailRequirements } from '@/app/[slug]/components/DetailRequirements';
import { DetailTimeline } from '@/app/[slug]/components/DetailTimeline';
import { DetailCampusDriveInfo } from '@/app/[slug]/components/DetailCampusDriveInfo';
import { ExpiredWarning } from '@/app/[slug]/components/ExpiredWarning';
import { DescriptionSection } from '@/app/[slug]/components/DescriptionSection';
import { GovernmentJobDetailView } from '@/app/[slug]/components/GovernmentJobDetailView';

// Hooks
import { useOpportunityDetail } from '@/features/opportunities/hooks/useOpportunityDetail';
import { useOpportunityDerivedState } from '@/features/opportunities/hooks/useOpportunityDerivedState';
import { CITY_TO_STATE, parseOpportunityLocation, getGroupedLocations, formatAllowedPassoutYears } from '@/features/opportunities/domain/opportunityDisplay';
import { getOpportunityPathFromItem } from '@/features/opportunities/domain/opportunityPath';

interface OpportunityDetailPaneProps {
    oppId: string;
    initialData: Opportunity;
    onClose: () => void;
    isMobile?: boolean;
}

function getPostedLabel(postedAtVal?: string | Date | null) {
    const postedAt = postedAtVal ? new Date(postedAtVal) : null;
    if (!postedAt || Number.isNaN(postedAt.getTime())) return null;
    const diff = Date.now() - postedAt.getTime();
    const days = Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
    const formattedDate = postedAt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    if (days === 0) return `Today (${formattedDate})`;
    if (days === 1) return `Yesterday (${formattedDate})`;
    return `${days} days ago (${formattedDate})`;
}


import { useRef, useEffect } from 'react';

export function OpportunityDetailPane({ oppId, initialData, onClose, isMobile = false }: OpportunityDetailPaneProps) {
    const searchParams = useSearchParams();
    const { user, profile } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Reset scroll position when oppId changes instead of completely unmounting the component
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [oppId]);

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
    } = useOpportunityDetail(oppId, initialData, user, []);

    const ds = useOpportunityDerivedState(opp as Opportunity, profile, searchParams);

    const jumpToTimeline = () => {
        if (typeof document === 'undefined') return;
        const section = document.getElementById('drive-timeline');
        if (!section) return;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <ArrowPathIcon className="w-8 h-8 text-primary animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading details...</span>
            </div>
        );
    }

    if (error || !opp) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-destructive" />
                <h3 className="text-base font-bold text-foreground">Failed to load opportunity</h3>
                <p className="text-xs text-muted-foreground">{error || 'Data unavailable.'}</p>
                <button
                    type="button"
                    onClick={() => void loadOpportunity()}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
                >
                    Retry
                </button>
            </div>
        );
    }

    const isGovernmentJob = Boolean(opp.governmentJobDetails);

    return (
        <div className="flex flex-col h-full bg-card relative">
            {/* Header toolbar — compact: logo, company name, action buttons only */}
            <div className="relative flex items-center justify-between p-4 border-b border-border/40 shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CompanyLogo
                        companyName={opp.company}
                        companyWebsite={opp.companyWebsite}
                        companyLogoUrl={opp.companyLogoUrl}
                        applyLink={opp.applyLink}
                        isGovernment={isGovernmentJob}
                        className="w-10 h-10 rounded-xl object-contain shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-muted-foreground block truncate leading-none">
                            {opp.company}
                        </span>
                        <h2 className="text-sm font-bold text-foreground mt-0.5 leading-snug line-clamp-2" title={opp.title}>
                            {opp.title}
                        </h2>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {ds.hasApplyLink && !isMobile && ds.listingState !== 'EXPIRED' && (
                        <button
                            onClick={handleApply}
                            className="px-4 h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.99] rounded-lg flex items-center justify-center gap-1.5 font-bold shadow-sm transition-all"
                        >
                            Apply Now
                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors hidden sm:flex"
                        aria-label="Share"
                    >
                        <ShareIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors hidden sm:flex"
                        aria-label="Copy link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>
                    <Link
                        href={getOpportunityPathFromItem(opp)}
                        target="_blank"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors hidden sm:flex"
                        aria-label="Open full page"
                        title="Open full page"
                    >
                        <ArrowsPointingOutIcon className="w-5 h-5" />
                    </Link>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden"
                        aria-label="Close details panel"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable details area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
                {isGovernmentJob ? (
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
                ) : (
                    <div className="space-y-5">
                        {opp.expiresAt && ds.isExpired(opp) && <ExpiredWarning />}

                        {/* Type + Status badges row — shown at top of content */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md bg-muted/80 text-foreground border border-border/70">
                                {ds.isCampusDrive ? 'Hiring drive' : opp.type === 'INTERNSHIP' ? 'Internship' : opp.type === 'WALKIN' ? 'Walk-in' : 'Job'}
                            </span>
                            {ds.listingState === 'ACTIVE' ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active
                                </div>
                            ) : ds.listingState === 'EXPIRED' ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-destructive/5 border border-destructive/10 text-destructive text-xs font-semibold rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Expired
                                </div>
                            ) : ds.listingState === 'CLOSING_SOON' ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                    Closing soon
                                </div>
                            ) : null}
                            {getGroupedLocations(opp.locations).length > 0 && (
                                <div className="flex items-center gap-1 text-muted-foreground ml-1">
                                    <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs font-medium leading-relaxed">
                                        {getGroupedLocations(opp.locations).join(' • ')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Meta boxes — Experience, Employment, Role Title, Salary, Posted, Deadline */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                                <BriefcaseIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Experience</p>
                                    <p className="text-xs font-semibold text-foreground mt-1 truncate" title={opp.experienceMax ? `${opp.experienceMin || 0}–${opp.experienceMax}y` : 'Fresher'}>
                                        {opp.experienceMax ? `${opp.experienceMin || 0}–${opp.experienceMax}y` : 'Fresher'}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                                <UsersIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Employment</p>
                                    <p className="text-xs font-semibold text-foreground mt-1 truncate" title={opp.employmentType ? opp.employmentType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Full Time'}>
                                        {opp.employmentType ? opp.employmentType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Full Time'}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                                <ShieldCheckIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Role title</p>
                                    <p className="text-xs font-semibold text-foreground mt-0.5 line-clamp-2 leading-tight" title={opp.jobFunction || 'General'}>
                                        {opp.jobFunction || 'General'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                                <CurrencyRupeeIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Salary</p>
                                    <p className="text-xs font-semibold text-foreground mt-1 truncate" title={ds.displaySalary || 'Competitive'}>{ds.displaySalary || 'Competitive'}</p>
                                </div>
                            </div>
                            {opp.postedAt && (() => {
                                const label = getPostedLabel(opp.postedAt);
                                return label ? (
                                    <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                                        <CalendarIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Posted</p>
                                            <p className="text-xs font-semibold text-foreground mt-1 line-clamp-2 leading-tight">{label}</p>
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                            {opp.expiresAt && (() => {
                                const exp = ds.isExpired(opp);
                                const cs = ds.isClosingSoon(opp);
                                const deadline = ds.formatDeadline(opp);
                                return (
                                    <div className={cn(
                                        'border rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0',
                                        exp ? 'bg-rose-500/5 border-rose-500/20' : cs ? 'bg-orange-500/5 border-orange-500/20' : 'bg-muted/10 border-border/40'
                                    )}>
                                        <ClockIcon className={cn('w-5 h-5 shrink-0 mt-0.5', exp ? 'text-rose-600' : cs ? 'text-orange-600' : 'text-primary')} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Deadline</p>
                                            <p className={cn('text-xs font-semibold mt-1 line-clamp-2 leading-tight',
                                                exp ? 'text-rose-600' : cs ? 'text-orange-600' : 'text-foreground'
                                            )}>
                                                {exp ? `Closed (${deadline})` : deadline || 'Not set'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Track Progress (User specific) */}
                        {user && (
                            <div className="p-4 bg-muted/10 border border-border/60 rounded-xl space-y-2">
                                <h4 className="text-xs font-bold text-foreground/80">Track your progress</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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



                        <DetailRequirements
                            opp={opp}
                            educationDetails={ds.educationDetails}
                        />

                        <AppPromoBanner />

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

                        {user?.role === 'ADMIN' && (
                            <div className="bg-card p-4 border border-primary/20 rounded-xl space-y-2">
                                <h4 className="text-xs font-bold text-primary">Admin Control</h4>
                                <Link href={`/opportunities/edit/${opp.id}`} className="block">
                                    <Button variant="outline" className="w-full text-xs font-bold h-8 hover:bg-primary/5">
                                        Edit Opportunity
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* Horizontal related jobs carousel */}
                        {!isLoadingRelated && relatedOpps && relatedOpps.length > 0 && (
                            <div className="pt-6 border-t border-border/40 space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-xs font-bold tracking-wide text-primary flex items-center gap-1.5">
                                        <span className="w-1 h-3.5 bg-primary rounded-full" />
                                        Explore Jobs
                                    </h4>
                                </div>
                                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-3 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                    {relatedOpps.slice(0, 5).map((item) => {
                                        const path = getOpportunityPathFromItem(item);
                                        const locLabel = parseOpportunityLocation(item.locations).shortLabel;
                                        return (
                                            <Link
                                                key={item.id}
                                                href={path}
                                                className="snap-start shrink-0 w-64 p-3.5 bg-card border border-border hover:border-primary/40 hover:shadow-sm rounded-xl transition-all flex flex-col justify-between group"
                                            >
                                                <div className="flex items-start gap-2.5">
                                                    <CompanyLogo
                                                        companyName={item.company}
                                                        companyWebsite={item.companyWebsite}
                                                        companyLogoUrl={item.companyLogoUrl}
                                                        applyLink={item.applyLink}
                                                        isGovernment={item.type === 'GOVERNMENT' || Boolean(item.governmentJobDetails)}
                                                        className="w-8 h-8 rounded-lg shrink-0 mt-0.5"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                                            {item.title}
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 truncate">{item.company}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/30 text-[10px] text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3 h-3 text-muted-foreground/75" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>
                                                        {locLabel}
                                                    </span>
                                                    <span className="font-bold text-primary/95 uppercase tracking-wide">{item.type}</span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sticky Bottom Apply Bar on Mobile */}
            {isMobile && ds.hasApplyLink && (
                <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur px-4 py-3.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] flex items-center gap-2.5">
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
        </div>
    );
}
