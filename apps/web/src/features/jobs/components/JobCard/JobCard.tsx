'use client';

import { cn } from '@fresherflow/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import CheckIcon from '@heroicons/react/24/solid/CheckIcon';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { JobCardBadges } from './JobCardBadges';
import { JobCardMenu } from './JobCardMenu';
import { WalkinDateChip } from '@/features/jobs/components/WalkinEventWidgets';
import { APPLY_CARD_CLASS, ApplyActionContent } from '@/features/jobs/components/ApplyAction';
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
        canApply,
        handleSaveClick,
        handleApplyClick,
        handleCardClick,
        handleLinkClick,
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

        const typeLabel = getJobTypeLabel(job, isDrive, isGovernment);
    // Card data diet: education, source/ATS, salary and the long skill gallery
    // belong on the detail page. Showing them here only added noise and made
    // the row taller than the list and mobile variants. Keep two skills + "+N".
    const cardSkills = orderedSkills.slice(0, 2);
    const skillOverflow = Math.max(0, orderedSkills.length - cardSkills.length);

    return (
        <div
            id={`job-card-${targetId}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={handleCardClick}
            className={cn(
                'group relative bg-card text-card-foreground border border-border-strong rounded-lg p-3.5 flex flex-col gap-2 transition-colors duration-150 ease-out cursor-pointer dark:border-transparent',
                isSelected
                    ? 'border-primary/70 bg-primary/[0.07]'
                    : 'hover:border-primary/50',
                isHovered && !isSelected && 'border-primary/50',
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
                            {/* Two lines at every width: the title is the only
                                field that identifies the row, and a single
                                clamped line hid the rest with no way to read
                                it (the schema allows up to 200 characters). */}
                            <h2
                                className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2"
                                title={job.normalizedRole || job.title}
                            >
                                {job.normalizedRole || job.title?.trim() || job.company?.trim() || 'Untitled listing'}
                            </h2>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                <span
                                    className="font-semibold text-foreground/80 truncate min-w-0 ff-company-cap sm:ff-company-cap-lg"
                                    title={job.company}
                                    dir="auto"
                                >
                                    {job.company}
                                </span>
                                {/* `parseOpportunityLocation` reports an empty
                                    location list as "Remote"; say nothing
                                    instead of claiming a work mode the listing
                                    never stated. */}
                                {locationInfo.shortLabel && (
                                    <>
                                        <span className="text-muted-foreground/40 shrink-0 hidden sm:inline">•</span>
                                        <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                                            <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
                                            <span className="truncate">{locationInfo.shortLabel}</span>
                                        </span>
                                    </>
                                )}
                                {locationInfo.shortLabel && (
                                    <span className="hidden sm:inline text-muted-foreground/30 shrink-0">·</span>
                                )}
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
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/60 ff-press motion-reduce:transform-none"
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

            {/* Skills + single action row. No meta strip and no Discuss CTA —
                those duplicated the detail page and made tablet cards noisy. */}
            <div className="flex min-w-0 items-center gap-2 py-1.5 relative z-20 pointer-events-auto">
                <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                    <JobCardBadges metaItems={[]} skills={cardSkills} overflow={skillOverflow} compact />
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
                                    className="inline-flex items-center justify-center gap-1 px-3 h-7 text-xs font-semibold rounded-md bg-warning/15 text-warning dark:text-warning border border-warning/40 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-warning/25 ff-press motion-reduce:transform-none"
                                >
                                    <MapPinIcon className="w-3.5 h-3.5" aria-hidden />
                                    Directions
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={handleLinkClick(jobPath)}
                                className="inline-flex items-center justify-center px-3 h-7 text-xs font-semibold rounded-md bg-primary text-primary-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90 ff-press motion-reduce:transform-none"
                            >
                                View drive
                            </button>
                        </>
                    ) : (
                                <button
                                    type="button"
                                    onClick={handleApplyClick}
                                    disabled={!canApply}
                                    title={canApply ? undefined : 'This listing has no application link'}
                                    className={cn(APPLY_CARD_CLASS, 'disabled:opacity-50 disabled:pointer-events-none')}
                                >
                                    <ApplyActionContent applyLink={job.applyLink} showDestination showArrow />
                                </button>
                    )}
                </div>
            </div>
        </div>
    );
}
