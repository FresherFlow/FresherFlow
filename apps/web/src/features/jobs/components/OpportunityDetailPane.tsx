'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { type Opportunity } from '@fresherflow/types';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import UsersIcon from '@heroicons/react/24/outline/UsersIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import { cn } from '@/ui/cn';
import Link from 'next/link';
import { Button } from '@/ui/Button';
import { Hint } from '@/ui/Tooltip';
import { ApplyAction, ApplyActionContent } from '@/features/jobs/components/ApplyAction';

// Subcomponents from detail page
import { DetailRequirements } from '@/features/jobs/components/detail/DetailRequirements';
import { DetailTimeline } from '@/features/jobs/components/detail/DetailTimeline';
import { DescriptionSection } from '@/features/jobs/components/detail/DescriptionSection';
import {
    CampusDriveInfoIfCampus,
    ExpiredWarningIfAny,
    FormComplexityCard,
    WalkInDetailsCardIfAny,
} from '@/features/jobs/components/detail/OpportunityDetailSections';
import { GovernmentJobDetailView } from '@/features/jobs/components/detail/GovernmentJobDetailView';
import { OpportunityDetailPaneSkeleton } from '@/features/jobs/components/OpportunitySkeletons';

// Hooks
import { useOpportunityDetail } from '@/features/jobs/hooks/useOpportunityDetail';
import { useOpportunityDerivedState } from '@/features/jobs/hooks/useOpportunityDerivedState';
import { WalkinTrustStrip } from '@/features/jobs/components/WalkinTrustStrip';
import { parseOpportunityLocation, getGroupedLocations } from '@/features/jobs/domain/opportunityDisplay';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import { getPrimaryEmploymentType, isInternshipOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';

interface OpportunityDetailPaneProps {
    oppId: string;
    initialData: Opportunity;
    onClose: () => void;
    isMobile?: boolean;
    allOpps?: Opportunity[];
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


import { useRef, useEffect, useState } from 'react';

/** Shared geometry for the pane header's icon controls. */
const PANE_ICON_BUTTON =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

export function OpportunityDetailPane({ oppId, initialData, onClose, isMobile = false, allOpps = [] }: OpportunityDetailPaneProps) {
    const { user, profile } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);
    /* Copy keeps its toast — that was never the thing to remove. The icon swap
       stays as a second, quieter cue and is plain ink: no green fill. */
    const [justCopied, setJustCopied] = useState(false);

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
        isUpdatingAction,
        loadOpportunity,
        handleToggleSave,
        handleSetAction,
        handleApply,
        handleShare,
        handleCopyLink
    } = useOpportunityDetail(oppId, initialData, user, [], allOpps);

    const ds = useOpportunityDerivedState(opp as Opportunity);


    if (isLoading) {
        return <OpportunityDetailPaneSkeleton />;
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

    const primaryEmployment = getPrimaryEmploymentType(opp);
    const primaryEmploymentLabel = primaryEmployment
        ? primaryEmployment.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'Full Time';

    const isOppSaved = Boolean((opp as unknown as Record<string, unknown>).isSaved);
    const showApply = ds.hasApplyLink && !isMobile && ds.listingState !== 'EXPIRED';

    return (
        <div className="flex flex-col h-full bg-transparent relative">
            {/* Header — title + actions in one row */}
            <div className="relative flex items-center justify-between px-4 md:px-6 py-4 border-b border-border/40 shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CompanyLogo
                        companyName={opp.company}
                        companyWebsite={opp.companyWebsite}
                        companyLogoUrl={opp.companyLogoUrl}
                        applyLink={opp.applyLink}
                        isGovernment={isGovernmentJob}
                        className="w-10 h-10 object-contain shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-muted-foreground block truncate leading-none">
                            {opp.company}
                        </span>
                        <h2 className="text-sm font-bold text-foreground mt-1 leading-snug line-clamp-2" title={opp.title}>
                            {opp.title}
                        </h2>
                    </div>
                </div>
                {/* All actions in one right-hand area: the icon controls as one
                    group (save, copy, open, close), then Apply last so the
                    primary action owns the right edge. Apply used to sit in the
                    middle of the icons, which split the group in two. */}
                <div className="flex shrink-0 items-center gap-1.5">
                    <Hint label={isOppSaved ? 'Saved' : 'Save'} side="top" avoidCollisions={false}>
                        <button
                            type="button"
                            onClick={() => void handleToggleSave()}
                            aria-pressed={isOppSaved}
                            aria-label={isOppSaved ? 'Saved' : 'Save'}
                            className={cn(
                                PANE_ICON_BUTTON,
                                isOppSaved && 'border-transparent bg-accent text-accent-foreground'
                            )}
                        >
                            {isOppSaved ? (
                                <BookmarkSolidIcon className="w-4 h-4" />
                            ) : (
                                <BookmarkIcon className="w-4 h-4" />
                            )}
                        </button>
                    </Hint>
                    <Hint label={justCopied ? 'Copied' : 'Copy link'} side="top" avoidCollisions={false}>
                        <button
                            type="button"
                            onClick={async () => {
                                await handleCopyLink();
                                setJustCopied(true);
                                window.setTimeout(() => setJustCopied(false), 1600);
                            }}
                            aria-label={justCopied ? 'Copied' : 'Copy link'}
                            className={cn(PANE_ICON_BUTTON, 'hidden sm:inline-flex')}
                        >
                            {justCopied ? <CheckIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                        </button>
                    </Hint>
                    <Hint label="Open full page" side="top" avoidCollisions={false}>
                        <Link
                            href={getOpportunityPathFromItem(opp)}
                            target="_blank"
                            aria-label="Open full page"
                            className={cn(PANE_ICON_BUTTON, 'hidden sm:inline-flex')}
                        >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </Link>
                    </Hint>
                    <Hint label="Close details panel" side="top" avoidCollisions={false}>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            aria-label="Close details panel"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </Hint>
                    {showApply && (
                        <ApplyAction
                            size="pane"
                            applyLink={opp.applyLink}
                            isGovernment={isGovernmentJob}
                            onApply={handleApply}
                        />
                    )}
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
                    />
                ) : (
                    <div className="space-y-4">
                        <ExpiredWarningIfAny opp={opp} isExpired={ds.isExpired} />

                        {/* Compact header: badges + location + meta — all in one tight block */}
                        <div className="space-y-3">
                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-muted text-foreground">
                                    {ds.isCampusDrive ? 'Hiring drive' : isInternshipOpportunity(opp) ? 'Internship' : isWalkinOpportunity(opp) ? 'Walk-in' : 'Job'}
                                </span>
                                {ds.listingState === 'ACTIVE' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success dark:text-success text-xs font-bold rounded">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Active
                                    </span>
                                ) : ds.listingState === 'EXPIRED' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-bold rounded">
                                        <span className="w-1.5 h-1.5 rounded-full bg-error" /> Expired
                                    </span>
                                ) : ds.listingState === 'CLOSING_SOON' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-signal-aging/10 text-destructive dark:text-signal-aging text-xs font-bold rounded">
                                        <span className="w-1.5 h-1.5 rounded-full bg-signal-aging animate-pulse" /> Closing soon
                                    </span>
                                ) : null}
                                {getGroupedLocations(opp.locations).length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                                        <MapPinIcon className="w-3 h-3" />
                                        <span className="text-xs font-medium">{getGroupedLocations(opp.locations).join(', ')}</span>
                                    </span>
                                )}
                            </div>

                            {/* Fact rows — icon + value */}
                            <div className="space-y-3">
                                {([
                                    { icon: CurrencyRupeeIcon, value: ds.displaySalary || 'No salary listed' },
                                    ...(getGroupedLocations(opp.locations).length > 0 ? [{ icon: MapPinIcon, value: getGroupedLocations(opp.locations).join(', ') }] : []),
                                    { icon: BriefcaseIcon, value: opp.experienceMax ? `${opp.experienceMin || 0}–${opp.experienceMax} years` : 'Fresher' },
                                    { icon: UsersIcon, value: primaryEmploymentLabel },
                                    ...(opp.postedAt && getPostedLabel(opp.postedAt) ? [{ icon: CalendarIcon, value: `Posted ${getPostedLabel(opp.postedAt)}` }] : []),
                                ] as const).map((item) => (
                                    <div key={item.value} className="flex items-center gap-2.5">
                                        <item.icon className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                                        <span className="text-sm font-semibold text-foreground">{item.value}</span>
                                    </div>
                                ))}
                                {opp.expiresAt && (() => {
                                    const exp = ds.isExpired(opp);
                                    const cs = ds.isClosingSoon(opp);
                                    const deadline = ds.formatDeadline(opp);
                                    return (
                                        <div className="flex items-center gap-2.5">
                                            <CalendarIcon className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                                            <span className={cn('text-sm font-semibold', exp ? 'text-error' : cs ? 'text-destructive' : 'text-foreground')}>
                                                {exp ? `Closed (${deadline})` : `Deadline ${deadline || 'Not set'}`}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Track Progress */}
                            {user && (
                                <div className="flex items-center gap-2 pt-0.5">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Progress</span>
                                    <div className="flex gap-1">
                                        {ds.trackerOptions.map((option) => {
                                            const isActive = ds.currentAction === option.key;
                                            return (
                                                <button
                                                    key={option.key}
                                                    onClick={() => handleSetAction(option.key)}
                                                    disabled={isUpdatingAction}
                                                    className={cn(
                                                        "h-6 px-2.5 rounded text-xs font-bold transition-colors duration-150",
                                                        isActive
                                                            ? "bg-foreground text-background"
                                                            : "bg-muted text-muted-foreground hover:text-foreground",
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
                        </div>


                        {(() => {
                            const userProfileSkills = profile?.skills?.map(s => s.toLowerCase()) || [];
                            return (
                                <DetailRequirements
                                    opp={opp}
                                    educationDetails={ds.educationDetails}
                                    userProfileSkills={userProfileSkills}
                                    userProfile={profile}
                                />
                            );
                        })()}

                        <DescriptionSection
                            description={opp.description}
                            title="Description"
                        />

                        <FormComplexityCard opp={opp} />

                        <WalkInDetailsCardIfAny opp={opp} />

                        {isWalkinOpportunity(opp) && (
                            <WalkinTrustStrip opportunityIdOrSlug={opp.slug || opp.id} />
                        )}

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

                        {user?.role === 'ADMIN' && (
                            <div className="bg-card p-4 border border-primary/20 rounded-xl space-y-2">
                                <h4 className="text-xs font-bold text-primary">Admin Control</h4>
                                <Link href={`/admin/opportunities/edit/${opp.id}`} className="block">
                                    <Button variant="outline" size="sm" className="w-full">
                                        Edit Opportunity
                                    </Button>
                                </Link>
                            </div>
                        )}

                    </div>
                )}
            </div>

            {/* Sticky Bottom Apply Bar on Mobile */}
            {isMobile && ds.hasApplyLink && (
                <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur px-4 py-3.5 pb-3 shadow-sm flex items-center gap-2.5">
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
                                className="w-full h-12 text-sm bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.97] rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg transition motion-reduce:transform-none"
                            >
                                {/* Same ATS-aware label and mark as the desktop
                                    pane: the phone was told "Apply on Website"
                                    for a Greenhouse posting. */}
                                <ApplyActionContent
                                    applyLink={opp.applyLink}
                                    isGovernment={isGovernmentJob}
                                    showDestination
                                    showArrow
                                />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleCopyLink()}
                        aria-label="Copy link"
                        className="shrink-0 w-12 h-12 inline-flex items-center justify-center rounded-xl border border-border text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted"
                    >
                        <LinkIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
