'use client';

import { Opportunity } from '@fresherflow/types';
import { useRouter } from 'next/navigation';
import { cn } from '@repo/ui/utils/cn';
import React, { useMemo } from 'react';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import CheckIcon from '@heroicons/react/24/solid/CheckIcon';
import toast from 'react-hot-toast';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseSaved } from '@/features/dashboard/hooks/useSavedJobs';
import { useTrackerWriter } from '@/features/dashboard/hooks/useFirebaseTracker';
import { saveOpportunityToCache } from '@/lib/cache/opportunitiesFeedCache';
import { ActionType } from '@fresherflow/types';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import { isCampusDriveOpportunity } from '@/features/jobs/domain/driveTimeline';
import { parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';
import { promptLoginToast } from '@/lib/utils/toastUtils';
import { JobCardBadges } from './JobCardBadges';
import { ArrowUpRight } from 'lucide-react';
import { getDriveDetails, isGovernmentOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import {
    getPostedLabel,
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
    // Writer-only: this card records the apply action but never reads the
    // tracker map, so it must not hold a per-instance RTDB subscription.
    const { writeTrackerItem } = useTrackerWriter(user?.id);

    const isDrive = isCampusDriveOpportunity(job);
    const isGovernment = isGovernmentOpportunity(job);
    const isWalkin = isWalkinOpportunity(job);

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
    const locationInfo = isDrive
        ? { shortLabel: 'PAN India', fullLabel: 'PAN India' }
        : parseOpportunityLocation(job.locations);

    // Mobile data diet: title 1 line, company 1 line, 2 skills + overflow,
    // actions. No meta strip (mode duplicates the location row; education,
    // source and salary live on the detail page), no wrapping skill gallery.
    // The desktop list fits one measured row; mobile wraps, so uncapped
    // lists become full-screen cards — the whole card is 5 short rows.
    const mobileSkills = orderedSkills.slice(0, 2);
    const mobileOverflow = Math.max(0, orderedSkills.length - mobileSkills.length);
    const postedLabel = getPostedLabel(job);

    const driveDetails = getDriveDetails(job);
    const walkinDestination =
        driveDetails?.latitude && driveDetails?.longitude
            ? `${driveDetails.latitude},${driveDetails.longitude}`
            : driveDetails?.venueAddress;
    const directionsUrl =
        driveDetails?.venueLink ||
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
        const applyAction = isWalkinOpportunity(job) ? ActionType.PLANNED : ActionType.APPLIED;

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
                'group relative bg-card text-card-foreground border rounded-lg p-2.5 flex flex-col gap-2 transition-colors duration-150 ease-out cursor-pointer',
                'border-border hover:border-primary/30',
                isJobExpired(job) && 'opacity-60',
                className
            )}
            onClick={handleCardClick}
        >
            <div className="flex items-start gap-2">
                <CompanyLogo
                    companyName={job.company}
                    companyWebsite={job.companyWebsite}
                    companyLogoUrl={job.companyLogoUrl}
                    applyLink={job.applyLink}
                    priority={priority}
                    isGovernment={isGovernment}
                    className="!w-10 !h-10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                        {job.normalizedRole || job.title}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {job.company}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {locationInfo.shortLabel} · {postedLabel}
                        {showApplied ? (
                            <>
                                {' · '}
                                <span className="inline-flex items-center gap-0.5 text-success dark:text-success">
                                    <CheckIcon className="w-3 h-3" aria-hidden />
                                    Applied
                                </span>
                            </>
                        ) : null}
                    </p>
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

            <div className="flex min-w-0 items-center gap-1.5 relative z-20 pointer-events-auto">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <JobCardBadges metaItems={[]} skills={mobileSkills} overflow={mobileOverflow} compact />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {isWalkin ? (
                        <>
                            {directionsUrl && (
                                <a
                                    href={directionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center justify-center gap-1 px-2.5 h-7 text-xs font-semibold rounded-md bg-warning/15 text-warning dark:text-warning border border-warning/40 hover:bg-warning/25 transition-colors"
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
                                className="inline-flex items-center justify-center px-2.5 h-7 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                View drive
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleApplyClick}
                            className="inline-flex items-center justify-center gap-1.5 px-3 h-7 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-150 ease-out motion-reduce:transform-none"
                        >
                            Apply
                            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default JobCardMobile;
