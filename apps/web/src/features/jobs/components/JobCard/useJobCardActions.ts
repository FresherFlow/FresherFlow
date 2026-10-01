'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActionType, type Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseSaved } from '@/features/dashboard/hooks/useSavedJobs';
import { useTrackerWriter } from '@/features/dashboard/hooks/useFirebaseTracker';
import { saveOpportunityToCache } from '@/lib/cache/opportunitiesFeedCache';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import { isCampusDriveOpportunity } from '@/features/jobs/domain/driveTimeline';
import { parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';
import { buildShareUrl } from '@/lib/utils/share';
import { promptLoginToast } from '@/lib/utils/toastUtils';
import {
    getDriveDetails,
    isGovernmentOpportunity,
    isWalkinOpportunity,
} from '@/features/jobs/utils/walkinMapUtils';
import { getPostedLabel, isJobExpired, reorderSkillsBySearch } from './jobCardUtils';
import { resolveShowApplied } from '@/features/jobs/domain/trackerState';

/**
 * One home for the behaviour `JobCard` and `JobCardMobile` share.
 *
 * The two cards keep separate DOM trees on purpose — `JobCardResponsive`
 * explains why rendering both costs two `ResizeObserver`s and two saved/tracker
 * subscriptions per row. But they are the same row: the state, the derived
 * values and the handlers were duplicated line for line and had already
 * drifted (desktop reordered skills from a URL search, mobile did not). A
 * change to how a card saves, applies or navigates now lands once.
 */

/** Search params that carry the skill a visitor searched for. */
const SEARCH_PARAM_KEYS = ['q', 'search', 'skill', 'query'];

export type JobCardOpportunity = Opportunity & { matchScore?: number; matchReason?: string };

export interface UseJobCardActionsOptions {
    job: JobCardOpportunity;
    jobId: string;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    searchQuery?: string;
    searchedSkill?: string;
}

export function useJobCardActions({
    job,
    jobId,
    isSaved,
    isApplied = false,
    onToggleSave,
    onClick,
    searchQuery,
    searchedSkill,
}: UseJobCardActionsOptions) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);
    // Writer-only: this card records the apply action but never reads the
    // tracker map, so it must not hold a per-instance RTDB subscription.
    const { writeTrackerItem } = useTrackerWriter(user?.id);

    const isDrive = isCampusDriveOpportunity(job);
    const isGovernment = isGovernmentOpportunity(job);
    const isWalkin = isWalkinOpportunity(job);
    const isExpired = isJobExpired(job);

    const targetId = jobId || job.id;
    const isJobSaved = isSaved !== undefined ? isSaved : Boolean(savedJobsMap[targetId] || savedJobsMap[job.id]);

    // Shared with `OpportunityRow`, so the list card and the split-view sidebar
    // cannot disagree about the same row.
    const showApplied = resolveShowApplied(job, isApplied);

    // A skill searched from the URL is the same intent as one handed in as a
    // prop, so both variants resolve the query here. Desktop used to read the
    // params and mobile only its prop, which reordered skills on one breakpoint
    // and not the other.
    const effectiveSearchQuery = (
        searchQuery ||
        searchedSkill ||
        SEARCH_PARAM_KEYS.map((key) => searchParams?.get(key)).find(Boolean) ||
        ''
    ).trim();

    // Memoised on the source arrays, not on `job`: callers rebuild the job
    // object on every render, so reading them inline would hand a fresh array
    // to `orderedSkills` (and then to AutoFitBadges) on every pass.
    const jobSkills = (job as { skills?: string[] }).skills;
    const requiredSkills = job.requiredSkills;
    const allSkills = useMemo(
        () => (jobSkills || requiredSkills || []) as string[],
        [jobSkills, requiredSkills]
    );
    const orderedSkills = useMemo(
        () => reorderSkillsBySearch(allSkills, effectiveSearchQuery),
        [allSkills, effectiveSearchQuery]
    );

    const locationInfo = isDrive
        ? { shortLabel: 'PAN India', fullLabel: 'PAN India' }
        : parseOpportunityLocation(job.locations);

    const jobPath = getOpportunityPathFromItem(job);

    const shareUrl =
        typeof window !== 'undefined'
            ? buildShareUrl(`${window.location.origin}${jobPath}`, {
                  platform: 'other',
                  source: 'opportunity_share',
                  medium: 'share',
                  campaign: 'opportunity_share',
                  ref: 'share',
              })
            : '';

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
        const applyAction = isWalkin ? ActionType.PLANNED : ActionType.APPLIED;

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
        if (!e.defaultPrevented) router.push(jobPath);
    };

    /**
     * The idiom behind the Discuss link and the View-drive button: defer to the
     * caller's `onClick` when it supplied one, otherwise navigate.
     */
    const handleLinkClick = (href: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) onClick(e as unknown as React.MouseEvent<HTMLAnchorElement>);
        else router.push(href);
    };

    const handleAdminEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/admin/opportunities/edit/${job.slug || job.id}`);
    };

    return {
        isDrive,
        isGovernment,
        isWalkin,
        isExpired,
        targetId,
        isJobSaved,
        showApplied,
        orderedSkills,
        locationInfo,
        jobPath,
        shareUrl,
        directionsUrl,
        postedLabel,
        handleSaveClick,
        handleApplyClick,
        handleCardClick,
        handleLinkClick,
        handleAdminEditClick,
    };
}
