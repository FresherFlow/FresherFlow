'use client';

import { cn } from '@fresherflow/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import CheckIcon from '@heroicons/react/24/solid/CheckIcon';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { JobCardBadges } from './JobCardBadges';
import { AtsLogo } from '@/features/jobs/components/AtsLogo';
import { detectAtsProvider } from '@/features/jobs/utils/atsProvider';
import { ArrowUpRight } from 'lucide-react';
import { useJobCardActions, type JobCardOpportunity } from './useJobCardActions';

function MetaDot() {
    return (
        <span aria-hidden="true" className="shrink-0 text-muted-foreground/50">
            ·
        </span>
    );
}

interface MobileJobCardProps {
    job: JobCardOpportunity;
    jobId: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    priority?: boolean;
    searchQuery?: string;
    searchedSkill?: string;
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
    searchedSkill,
    className,
}: MobileJobCardProps) {
    const {
        isGovernment,
        isWalkin,
        isExpired,
        isJobSaved,
        showApplied,
        orderedSkills,
        locationInfo,
        jobPath,
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

    // Mobile data diet: title 1 line, company 1 line, 2 skills + overflow,
    // actions. No meta strip (mode duplicates the location row; education,
    // source and salary live on the detail page), no wrapping skill gallery.
    // The desktop list fits one measured row; mobile wraps, so uncapped
    // lists become full-screen cards — the whole card is 5 short rows.
    const mobileSkills = orderedSkills.slice(0, 2);
    const mobileOverflow = Math.max(0, orderedSkills.length - mobileSkills.length);
    const atsProvider = detectAtsProvider(job.applyLink);

    return (
        <div
            className={cn(
                'group relative min-w-0 bg-card text-card-foreground border rounded-lg p-2.5 flex flex-col gap-2 transition-colors duration-150 ease-out cursor-pointer',
                'border-border hover:border-primary/30',
                isExpired && 'opacity-60',
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
                    <h2
                        className="text-sm font-semibold text-foreground leading-snug line-clamp-2"
                        title={job.normalizedRole || job.title}
                    >
                        {job.normalizedRole || job.title?.trim() || job.company?.trim() || 'Untitled listing'}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground" title={job.company} dir="auto">
                        {job.company}
                    </p>
                    {/* Separators are elements between parts, not characters
                        joined into a string: a listing with no location and no
                        posted date used to print a leading ·, and a listing
                        whose ATS logo did not resolve printed a trailing one. */}
                    <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        {locationInfo.shortLabel && (
                            <span className="min-w-0 truncate">{locationInfo.shortLabel}</span>
                        )}
                        {locationInfo.shortLabel && postedLabel && <MetaDot />}
                        {postedLabel && <span className="shrink-0 whitespace-nowrap">{postedLabel}</span>}
                        {showApplied && (
                            <>
                                <MetaDot />
                                <span className="inline-flex shrink-0 items-center gap-0.5 text-success dark:text-success">
                                    <CheckIcon className="w-3 h-3" aria-hidden />
                                    Applied
                                </span>
                            </>
                        )}
                        {atsProvider ? <AtsLogo applyLink={job.applyLink} /> : null}
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
                                onClick={handleLinkClick(jobPath)}
                                className="inline-flex items-center justify-center px-2.5 h-7 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
                            className="inline-flex items-center justify-center gap-1.5 px-3 h-7 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition duration-150 ease-out motion-reduce:transform-none disabled:opacity-50 disabled:pointer-events-none"
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
