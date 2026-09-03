'use client';

import { Opportunity } from '@fresherflow/types';
import { useRouter } from 'next/navigation';
import { cn } from '@repo/ui/utils/cn';
import React, { useMemo } from 'react';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PaperAirplaneIcon from '@heroicons/react/24/outline/PaperAirplaneIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import CheckIcon from '@heroicons/react/24/solid/CheckIcon';
import toast from 'react-hot-toast';
import CompanyLogo from '@/ui/CompanyLogo';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseSaved } from '@/features/dashboard/hooks/useFirebaseSaved';
import { useFirebaseTracker } from '@/features/dashboard/hooks/useFirebaseTracker';
import { saveOpportunityToCache } from '@/lib/api/offline/opportunitiesFeedCache';
import { ActionType } from '@fresherflow/types';
import { getOpportunityPathFromItem } from '@/features/opportunities/domain/opportunityPath';
import { isCampusDriveOpportunity } from '@/lib/utils/driveTimeline';
import { parseOpportunityLocation } from '@/features/opportunities/domain/opportunityDisplay';
import { promptLoginToast } from '@/lib/utils/toastUtils';
import { JobCardBadges } from './JobCardBadges';
import { buildMetaItems } from './JobCardMetaConfig';
import {
    getAccentBorderClass,
    getJobTypeLabel,
    getPostedLabel,
    getVisibleSkills,
    isFreshlyPosted,
    isJobExpired,
    reorderSkillsBySearch,
} from './jobCardUtils';

type JobAction = { actionType: string };
type JobWithActions = Opportunity & { actions?: JobAction[] };

interface MobileJobCardProps {
    job: Opportunity;
    jobId: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    priority?: boolean;
    searchQuery?: string;
    className?: string;
}

export function JobCardMobile({
    job,
    jobId,
    onClick,
    isSaved,
    isApplied = false,
    onToggleSave,
    priority = false,
    searchQuery,
    className,
}: MobileJobCardProps) {
    const router = useRouter();
    const { user } = useAuth();
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

    const allSkills = ((job as { skills?: string[] }).skills || job.requiredSkills || []) as string[];
    const orderedSkills = useMemo(
        () => reorderSkillsBySearch(allSkills, searchQuery || ''),
        [allSkills, searchQuery]
    );
    const { visible: visibleSkills } = getVisibleSkills(orderedSkills, 88);
    const displaySkills = visibleSkills.slice(0, 6);
    const skillOverflow = Math.max(0, orderedSkills.length - displaySkills.length);

    const locationInfo = isDrive
        ? { shortLabel: 'PAN India', fullLabel: 'PAN India' }
        : parseOpportunityLocation(job.locations);

    const metaItems = buildMetaItems(job, { isGovernment, isDrive, isWalkin });
    const typeLabel = getJobTypeLabel(job, isDrive, isGovernment);
    const accentClass = getAccentBorderClass(job, isDrive, isGovernment, isWalkin);
    const postedLabel = getPostedLabel(job);

    const walkinDestination =
        job.walkInDetails?.latitude && job.walkInDetails?.longitude
            ? `${job.walkInDetails.latitude},${job.walkInDetails.longitude}`
            : job.walkInDetails?.venueAddress;
    const directionsUrl =
        job.walkInDetails?.venueLink ||
        (walkinDestination
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(walkinDestination)}`
            : '');

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
            className={cn(
                'group relative bg-card text-card-foreground border border-l-[3px] rounded-xl p-2.5 flex flex-col gap-2 transition-[border-color,box-shadow,background-color] duration-150 ease-out cursor-pointer',
                accentClass,
                'border-border/60 dark:border-border/40 hover:border-border dark:hover:border-border/70',
                isJobExpired(job) && 'opacity-60',
                className
            )}
            onClick={handleCardClick}
        >
            <div className="flex items-start gap-2.5">
                <CompanyLogo
                    companyName={job.company}
                    companyWebsite={job.companyWebsite}
                    companyLogoUrl={job.companyLogoUrl}
                    applyLink={job.applyLink}
                    priority={priority}
                    isGovernment={isGovernment}
                    className="!w-9 !h-9 rounded-lg shrink-0 border border-border/50 shadow-xs"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">
                        <span className="uppercase tracking-wide">{typeLabel}</span>
                        {postedLabel && (
                            <>
                                <span className="text-muted-foreground/40">•</span>
                                <span>{postedLabel}</span>
                            </>
                        )}
                        {showApplied && (
                            <>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                    <CheckIcon className="w-3 h-3" aria-hidden />
                                    Applied
                                </span>
                            </>
                        )}
                    </div>
                    <h2 className="text-[14px] font-semibold text-foreground leading-snug line-clamp-2">
                        {job.normalizedRole || job.title}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[13px] text-muted-foreground min-w-0">
                        <span className="font-semibold text-foreground/80 truncate max-w-[45%] shrink-0">
                            {job.company}
                        </span>
                        <span className="text-muted-foreground/40 shrink-0">•</span>
                        <span className="inline-flex items-center gap-1 truncate min-w-0">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{locationInfo.shortLabel}</span>
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleSaveClick}
                    className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    aria-label={isJobSaved ? 'Remove bookmark' : 'Save job'}
                >
                    {isJobSaved ? (
                        <BookmarkSolidIcon className="w-4 h-4 text-primary" />
                    ) : (
                        <BookmarkIcon className="w-4 h-4" />
                    )}
                </button>
            </div>

            {metaItems.length > 0 || displaySkills.length > 0 || skillOverflow > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 relative z-20 pointer-events-auto">
                    <JobCardBadges metaItems={metaItems} skills={displaySkills} overflow={skillOverflow} compact />
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                        {isWalkin ? (
                            <>
                                {directionsUrl && (
                                    <a
                                        href={directionsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center justify-center gap-1 px-2.5 h-6 text-[11px] font-semibold rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40 hover:bg-amber-500/25 transition-colors"
                                    >
                                        <MapPinIcon className="w-3 h-3" aria-hidden />
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
                                    className="inline-flex items-center justify-center px-2.5 h-6 text-[11px] font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                                >
                                    View drive
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={handleApplyClick}
                                className="inline-flex items-center justify-center gap-1.5 px-3 h-6 text-[11px] font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-[background-color,transform] duration-150 ease-out motion-reduce:transform-none shadow-xs"
                            >
                                Apply
                                <PaperAirplaneIcon className="w-3 h-3 -rotate-45 -mt-0.5" aria-hidden />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex justify-end pt-1 relative z-20 pointer-events-auto">
                    {isWalkin ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onClick) onClick(e as unknown as React.MouseEvent<HTMLAnchorElement>);
                                else router.push(getOpportunityPathFromItem(job));
                            }}
                            className="inline-flex items-center justify-center px-2.5 h-6 text-[11px] font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                        >
                            View drive
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleApplyClick}
                            className="inline-flex items-center justify-center gap-1.5 px-3 h-6 text-[11px] font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-[background-color,transform] duration-150 ease-out motion-reduce:transform-none shadow-xs"
                        >
                            Apply
                            <PaperAirplaneIcon className="w-3 h-3 -rotate-45 -mt-0.5" aria-hidden />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default JobCardMobile;
