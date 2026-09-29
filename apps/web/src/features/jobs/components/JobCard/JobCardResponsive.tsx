'use client';

import React, { useEffect, useState } from 'react';
import { Opportunity } from '@fresherflow/types';
import JobCard from './JobCard';
import { JobCardMobile } from './JobCardMobile';

interface JobCardResponsiveProps {
    job: Opportunity & { matchScore?: number; matchReason?: string };
    jobId: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    priority?: boolean;
    searchQuery?: string;
    searchedSkill?: string;
    className?: string;
    isAdmin?: boolean;
    variant?: 'vertical' | 'compact' | 'wide';
    isSelected?: boolean;
    isHovered?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

/** Tailwind's `md` step. Kept in sync with the `md:hidden` / `md:block` below. */
const MD_MIN_WIDTH = '(min-width: 48rem)';

/**
 * The two cards are responsive *variants* of one row, not two halves of it.
 *
 * Rendering both and letting CSS hide one doubles the work for every row: two
 * ResizeObservers and measurement strips in AutoFitBadges, two rounds of skill
 * icon loads, two saved/tracker subscriptions. On a long feed that is what made
 * the List view crawl while Split view — which renders a single hook-less
 * `OpportunityRow` per row — stayed smooth.
 *
 * The breakpoint is not known during SSR, so the first client render still emits
 * both (matching the server HTML); once mounted, the variant CSS would have
 * hidden is dropped. `md:hidden` / `md:block` stay on the wrappers so the
 * correct one is shown during that first paint.
 */
export function JobCardResponsive({
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
    isAdmin,
    variant = 'wide',
    isSelected = false,
    isHovered = false,
    onMouseEnter,
    onMouseLeave,
}: JobCardResponsiveProps) {
    const [isMdUp, setIsMdUp] = useState<boolean | null>(null);

    useEffect(() => {
        const query = window.matchMedia(MD_MIN_WIDTH);
        const update = () => setIsMdUp(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return (
        <>
            {isMdUp !== true && (
            <div className="min-w-0 md:hidden">
                <JobCardMobile
                    job={job}
                    jobId={jobId}
                    onClick={onClick}
                    isSaved={isSaved}
                    isApplied={isApplied}
                    onToggleSave={onToggleSave}
                    priority={priority}
                    searchQuery={searchQuery}
                    className={className}
                />
            </div>
            )}
            {isMdUp !== false && (
            <div className="hidden min-w-0 md:block">
                <JobCard
                    job={job}
                    jobId={jobId}
                    onClick={onClick}
                    isSaved={isSaved}
                    isApplied={isApplied}
                    onToggleSave={onToggleSave}
                    isAdmin={isAdmin}
                    priority={priority}
                    variant={variant}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    searchQuery={searchQuery}
                    searchedSkill={searchedSkill}
                    className={className}
                />
            </div>
            )}
        </>
    );
}

export default JobCardResponsive;