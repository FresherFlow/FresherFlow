'use client';

import { useMemo } from 'react';
import { cn } from '@repo/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import CheckIcon from '@heroicons/react/24/solid/CheckIcon';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { Hint } from '@/ui/Tooltip';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import { ArrowUpRight } from 'lucide-react';
import { useCommentCount } from '@/features/jobs/hooks/useCommentCounts';
import { AutoFitBadges } from './AutoFitBadges';
import { JobCardMenu } from './JobCardMenu';
import { buildMetaItems } from './JobCardMetaConfig';
import { WalkinDateChip } from '@/features/jobs/components/WalkinEventWidgets';
import { getJobTypeLabel, isFreshlyPosted } from './jobCardUtils';
import { useJobCardActions, type JobCardOpportunity } from './useJobCardActions';

interface JobCardProps {
    job: JobCardOpportunity;
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
    const {
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
    } = useJobCardActions({
        job,
        jobId,
        isSaved,
        isApplied,
        onToggleSave,
        onClick,
        searchQuery,
        searchedSkill,
    });

      // Memoized: this feeds AutoFitBadges, which measures rendered badge widths
    // in a layout effect. An unmemoized call returned a fresh array on every
    // render, so the effect body re-ran on every unrelated parent render and
    // forced a synchronous layout pass per card.
    const metaItems = useMemo(
        () => buildMetaItems(job, { isGovernment, isDrive, isWalkin }),
        [job, isGovernment, isDrive, isWalkin]
    );
    const typeLabel = getJobTypeLabel(job, isDrive, isGovernment);
    const commentCount = useCommentCount(job.slug || job.id);
    // V1 job-card requirement: the Discuss CTA must SSR even before counts
    // hydrate client-side, so fall back to the zero-state (0 discussing).
    const discussionCount = commentCount ?? 0;
    // The job page hosts the thread in a dock; the query flag opens it on
    // arrival instead of jumping to an anchor that no longer exists.
    const discussionHref = `${jobPath}?discuss=1`;

    return (
        <div
            id={`job-card-${targetId}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={handleCardClick}
            className={cn(
                'group relative bg-card text-card-foreground border rounded-lg p-3.5 flex flex-col gap-2 transition-colors duration-150 ease-out cursor-pointer',
                isSelected
                    ? 'border-primary/40 bg-primary/[0.03]'
                    : 'border-border hover:border-primary/30',
                isHovered && !isSelected && 'border-primary/30',
                isExpired && 'opacity-60',
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
                    className="!w-10 !h-10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                    {/* Top row: title + posted (desktop) + actions */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            {/* Mobile top badges: type + posted + next drive date */}
                            <div className="flex items-center gap-1.5 mb-1 sm:hidden">
                                <span className="inline-flex items-center rounded-md bg-muted/60 border border-border/50 px-1.5 py-0.5 text-xs font-semibold text-muted-foreground shrink-0">
                                    {typeLabel}
                                </span>
                                {isWalkin && <WalkinDateChip opp={job} className="hidden" />}
                                {postedLabel && (
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-md bg-muted/40 border border-border/50 px-1.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0',
                                            isFreshlyPosted(job) && 'text-primary font-semibold border-border/40'
                                        )}
                                    >
                                        {postedLabel}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 sm:line-clamp-1">
                                {job.normalizedRole || job.title}
                            </h2>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs sm:text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground/80 truncate min-w-0 ff-company-cap sm:ff-company-cap-lg">{job.company}</span>
                                <span className="text-muted-foreground/40 shrink-0 hidden sm:inline">•</span>
                                <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                                    <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
                                    <span className="truncate">{locationInfo.shortLabel}</span>
                                </span>
                                <span className="hidden sm:inline text-muted-foreground/30 shrink-0">·</span>
                                <span className="hidden sm:inline text-xs font-semibold tracking-wide text-muted-foreground whitespace-nowrap shrink-0">
                                    {typeLabel}
                                </span>
                                {isWalkin && <WalkinDateChip opp={job} className="shrink-0 sm:ml-auto" />}
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

            {/* Badges + single action row — badges shrink, actions stay on one row */}
            <div className="flex min-w-0 items-center gap-2 py-1.5 relative z-20 pointer-events-auto">
                <AutoFitBadges
                    metaItems={metaItems}
                    skills={orderedSkills}
                    maxRows={1}
                    className="relative z-20 min-w-0 flex-1"
                />
                <div className="flex shrink-0 items-center gap-2">
                    <a
                        href={discussionHref}
                        onClick={handleLinkClick(discussionHref)}
                        className="inline-flex items-center gap-1 px-1 h-7 text-xs font-medium rounded-md text-muted-foreground hover:text-primary transition-colors shrink-0 whitespace-nowrap"
                        title={discussionCount > 0 ? `${discussionCount} discussing — Discuss this job` : 'Discuss this job'}
                        aria-label={discussionCount > 0 ? `Discuss this job (${discussionCount} discussing)` : 'Discuss this job'}
                    >
                        <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {discussionCount > 0 ? (
                            <>
                                <span className="hidden sm:inline">{discussionCount} discussing · Discuss</span>
                                <span className="sm:hidden">{discussionCount} Discuss</span>
                            </>
                        ) : (
                            <span className="hidden sm:inline">Discuss</span>
                        )}
                    </a>
                    {showApplied && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-success/10 text-success dark:text-success rounded text-xs font-bold uppercase tracking-wide border border-success/20 shrink-0">
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
                                    className="inline-flex items-center justify-center gap-1 px-3 h-7 text-xs font-semibold rounded-md bg-warning/15 text-warning dark:text-warning border border-warning/40 hover:bg-warning/25 transition-colors"
                                >
                                    <MapPinIcon className="w-3.5 h-3.5" aria-hidden />
                                    Directions
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={handleLinkClick(jobPath)}
                                className="inline-flex items-center justify-center px-3 h-7 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
            {isAdmin && (
                <Hint label="Edit Listing (Admin)" side="top">
                    <button
                        onClick={handleAdminEditClick}
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
