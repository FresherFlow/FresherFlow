'use client';

import { Opportunity } from '@fresherflow/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@repo/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PaperAirplaneIcon from '@heroicons/react/24/outline/PaperAirplaneIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import CheckIcon from '@heroicons/react/24/solid/CheckIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import { useMemo, useRef } from 'react';
import CompanyLogo from '@/ui/CompanyLogo';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseSaved } from '@/features/dashboard/hooks/useFirebaseSaved';
import { useFirebaseTracker } from '@/features/dashboard/hooks/useFirebaseTracker';
import { saveOpportunityToCache } from '@/lib/api/offline/opportunitiesFeedCache';
import { ActionType } from '@fresherflow/types';
import { getOpportunityPathFromItem } from '@/features/opportunities/domain/opportunityPath';
import { isCampusDriveOpportunity } from '@/lib/utils/driveTimeline';
import { parseOpportunityLocation } from '@/features/opportunities/domain/opportunityDisplay';
import { buildShareUrl } from '@/lib/utils/share';
import { promptLoginToast } from '@/lib/utils/toastUtils';
import { Hint } from '@/ui/Tooltip';
import { AutoFitBadges } from './AutoFitBadges';
import { JobCardMenu } from './JobCardMenu';
import { buildMetaItems } from './JobCardMetaConfig';
import {
    getAccentBorderClass,
    getJobTypeLabel,
    getPostedLabel,
    isFreshlyPosted,
    isJobExpired,
    reorderSkillsBySearch,
    resolvePassoutYears,
    formatPassoutYears,
    formatEducationEligibility,
    generateJobSummaryText,
} from './jobCardUtils';

export { resolvePassoutYears, generateJobSummaryText, reorderSkillsBySearch, formatPassoutYears, formatEducationEligibility } from './jobCardUtils';

interface JobCardProps {
    job: Opportunity & { matchScore?: number; matchReason?: string };
    jobId: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    isAdmin?: boolean;
    priority?: boolean;
    variant?: 'vertical' | 'compact' | 'wide';
    isSelected?: boolean;
    isHovered?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    searchQuery?: string;
    searchedSkill?: string;
    className?: string;
}

type JobAction = { actionType: string };
type JobWithActions = Opportunity & { actions?: JobAction[]; distanceKm?: number };

export default function JobCard({
    job,
    jobId,
    onClick,
    isSaved,
    isApplied = false,
    onToggleSave,
    isAdmin,
    priority = false,
    variant = 'wide',
    isSelected = false,
    isHovered = false,
    onMouseEnter,
    onMouseLeave,
    searchQuery,
    searchedSkill,
    className,
}: JobCardProps) {
    const mountedRef = useRef(false);
    if (typeof window !== 'undefined') mountedRef.current = true;

    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);
    const { writeTrackerItem } = useFirebaseTracker(user?.id);

    const isDrive = isCampusDriveOpportunity(job);
    const isGovernment = Boolean(job.governmentJobDetails) || (job.type as string) === 'GOVERNMENT';
    const isWalkin = job.type === 'WALKIN' || Boolean(job.walkInDetails);

    const targetId = jobId || job.id;
    const isJobSaved = isSaved !== undefined ? isSaved : Boolean(savedJobsMap[targetId] || savedJobsMap[job.id]);

    const trackerAction = (job as JobWithActions).actions?.find?.((a) =>
        ['APPLIED', 'PLANNED', 'SAVED_FOR_LATER', 'INTERVIEWING', 'OFFERED', 'REJECTED'].includes(a.actionType)
    );
    const trackerStatus = trackerAction?.actionType ?? null;
    const showApplied = trackerStatus === 'APPLIED' || (!trackerStatus && isApplied);

    const effectiveSearchQuery = (
        searchQuery ||
        searchedSkill ||
        searchParams?.get('q') ||
        searchParams?.get('search') ||
        searchParams?.get('skill') ||
        searchParams?.get('query') ||
        ''
    ).trim();

    const allSkills = ((job as { skills?: string[] }).skills || job.requiredSkills || []) as string[];
    const orderedSkills = useMemo(
        () => reorderSkillsBySearch(allSkills, effectiveSearchQuery),
        [allSkills, effectiveSearchQuery]
    );

    const locationInfo = isDrive
        ? { shortLabel: 'PAN India', fullLabel: 'PAN India' }
        : parseOpportunityLocation(job.locations);

    const shareUrl =
        typeof window !== 'undefined'
            ? buildShareUrl(`${window.location.origin}${getOpportunityPathFromItem(job)}`, {
                  platform: 'other',
                  source: 'opportunity_share',
                  medium: 'share',
                  campaign: 'opportunity_share',
                  ref: 'share',
              })
            : '';

    const walkinDestination =
        job.walkInDetails?.latitude && job.walkInDetails?.longitude
            ? `${job.walkInDetails.latitude},${job.walkInDetails.longitude}`
            : job.walkInDetails?.venueAddress;
    const directionsUrl =
        job.walkInDetails?.venueLink ||
        (walkinDestination ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(walkinDestination)}` : '');

    const metaItems = buildMetaItems(job, { isGovernment, isDrive, isWalkin });
    const typeLabel = getJobTypeLabel(job, isDrive, isGovernment);
    const accentClass = getAccentBorderClass(job, isDrive, isGovernment, isWalkin);
    const postedLabel = getPostedLabel(job);

    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            promptLoginToast('Sign in to save opportunities');
            return;
        }
        saveOpportunityToCache({ ...job, id: targetId } as Opportunity);
        if (onToggleSave) {
            onToggleSave();
        } else {
            toggleSavedJob(targetId)
                .then(() => toast.success(isJobSaved ? 'Removed from bookmarks' : 'Added to bookmarks'))
                .catch(() => toast.error('Bookmark update failed'));
        }
    };

    const handleApplyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const targetUrl = job.applyLink || job.companyWebsite;
        const applyAction = job.type === 'WALKIN' ? ActionType.PLANNED : ActionType.APPLIED;

        saveOpportunityToCache({ ...job, id: targetId } as Opportunity);
        writeTrackerItem(targetId, applyAction).catch(() => undefined);

        if (targetUrl) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
            toast.success('Opening application link...');
        } else {
            toast.error('No application link available');
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('a, button, [role="menuitem"], input, select, textarea')) return;
        onClick?.(e as unknown as React.MouseEvent<HTMLAnchorElement>);
        if (!e.defaultPrevented) router.push(getOpportunityPathFromItem(job));
    };

    return (
        <div
            id={`job-card-${targetId}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={handleCardClick}
            className={cn(
                'group relative bg-card text-card-foreground border border-l-[3px] rounded-xl p-3.5 flex flex-col gap-2 transition-[border-color,box-shadow,background-color] duration-150 ease-out cursor-pointer',
                isSelected
                    ? 'border-l-primary border-border/30 bg-primary/[0.03] shadow-xs'
                    : [accentClass, 'border-border/60 dark:border-border/40 hover:border-border dark:hover:border-border/70 hover:shadow-xs'],
                isHovered && !isSelected && 'border-border dark:border-border/70 shadow-xs',
                showApplied && 'border-l-emerald-500',
                isJobExpired(job) && 'opacity-60',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-start gap-3">
                <CompanyLogo
                    companyName={job.company}
                    companyWebsite={job.companyWebsite}
                    companyLogoUrl={job.companyLogoUrl}
                    applyLink={job.applyLink}
                    priority={priority}
                    isGovernment={isGovernment}
                    className="!w-10 !h-10 rounded-lg shrink-0 border border-border/50 shadow-xs"
                />
                <div className="flex-1 min-w-0">
                    {/* Top row: title + posted (desktop) + actions */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            {/* Mobile top badges: type + posted */}
                            <div className="flex items-center gap-1.5 mb-1 sm:hidden">
                                <span className="inline-flex items-center rounded-md bg-muted/60 border border-border/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
                                    {typeLabel}
                                </span>
                                {postedLabel && (
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-md bg-muted/40 border border-border/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0',
                                            isFreshlyPosted(job) && 'text-primary font-semibold border-border/40'
                                        )}
                                    >
                                        {postedLabel}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 sm:line-clamp-1">
                                {job.normalizedRole || job.title}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground min-w-0">
                                <span className="font-semibold text-foreground/80 truncate max-w-[45%] shrink-0">{job.company}</span>
                                <span className="text-muted-foreground/40 shrink-0">•</span>
                                <span className="inline-flex items-center gap-1 truncate min-w-0 max-w-[50%]">
                                    <MapPinIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                    <span className="truncate">{locationInfo.shortLabel}</span>
                                </span>
                                <span className="hidden sm:inline text-muted-foreground/40 shrink-0">·</span>
                                <span className="hidden sm:inline text-sm font-semibold text-muted-foreground whitespace-nowrap shrink-0">
                                    {typeLabel}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-start gap-0.5 shrink-0 relative z-20 pointer-events-auto">
                            {postedLabel && (
                                <span
                                    className={cn(
                                        'hidden sm:inline-block mt-1.5 mr-1 text-xs font-medium text-muted-foreground whitespace-nowrap',
                                        isFreshlyPosted(job) && 'text-primary font-semibold'
                                    )}
                                >
                                    {postedLabel}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={handleSaveClick}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                aria-label={isJobSaved ? 'Remove bookmark' : 'Save job'}
                            >
                                {isJobSaved ? (
                                    <BookmarkSolidIcon className="w-4 h-4 text-primary" />
                                ) : (
                                    <BookmarkIcon className="w-4 h-4" />
                                )}
                            </button>
                            <JobCardMenu job={job} shareUrl={shareUrl} isJobSaved={isJobSaved} onSaveClick={handleSaveClick} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges + skills wrap left, with Apply on the same row (right side) */}
            <div className="flex items-center gap-3 py-2 relative z-20 pointer-events-auto">
                <AutoFitBadges
                    metaItems={metaItems}
                    skills={orderedSkills}
                    maxRows={2}
                    className="relative z-20"
                />
                <div className="flex shrink-0 items-center gap-2">
                    {showApplied && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wide border border-emerald-500/20 shrink-0">
                            <CheckIcon className="w-3 h-3" aria-hidden />
                            Applied
                        </span>
                    )}
                    {isWalkin ? (
                        <>
                            {directionsUrl && (
                                <a
                                    href={directionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center justify-center gap-1 px-3 h-7 text-xs font-semibold rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40 hover:bg-amber-500/25 transition-colors"
                                >
                                    <MapPinIcon className="w-3.5 h-3.5" aria-hidden />
                                    Directions
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClick) onClick(e as unknown as React.MouseEvent<HTMLAnchorElement>);
                                    else router.push(getOpportunityPathFromItem(job));
                                }}
                                className="inline-flex items-center justify-center px-3 h-7 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                            >
                                View drive
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleApplyClick}
                            className="inline-flex items-center justify-center gap-1.5 px-3 h-7 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-[background-color,transform] duration-150 ease-out motion-reduce:transform-none shadow-xs"
                        >
                            Apply
                            <PaperAirplaneIcon className="w-3.5 h-3.5 -rotate-45 -mt-0.5" aria-hidden />
                        </button>
                    )}
                </div>
            </div>
            {isAdmin && (
                <Hint label="Edit Listing (Admin)" side="top">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/opportunities/edit/${job.slug || job.id}`);
                        }}
                        className="absolute top-2 right-20 p-1.5 rounded-full bg-card border border-border shadow-lg text-primary hover:bg-primary/10 transition-colors z-30"
                        aria-label="Edit Listing (Admin)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                    </button>
                </Hint>
            )}
        </div>
    );
}
