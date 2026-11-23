'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
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
    matchBadge?: ReactNode;
    /** Feed's desktop flag. Passed by CategoryPageView so the card follows the
     *  same width + pointer rule as the list it lives in. */
    isDesktop?: boolean | null;
}

/**
 * Matches `useCategoryPageState`'s desktop gate: the shell is desktop only at
 * `lg` **and** with a fine pointer. Width alone handed a coarse-pointer tablet
 * at 1131px the full desktop card (education, source, skill chips, Discuss)
 * inside the mobile grid — the "extra data only at this ratio" bug.
 */
const DESKTOP_QUERY = '(min-width: 64rem) and (pointer: fine)';

/**
 * The two cards are responsive *variants* of one row, not two halves of it.
 *
 * Rendering both and letting CSS hide one doubles the work for every row: two
 * ResizeObservers and measurement strips in AutoFitBadges, two rounds of skill
 * icon loads, two saved/tracker subscriptions. On a long feed that is what made
 * the List view crawl while Split view — which renders a single hook-less
 * `JobRow` per row — stayed smooth.
 *
 * The pointer type is not known during SSR, so the first client render still
 * emits both (matching the server HTML); once mounted, the variant CSS that
 * would have hidden one is dropped. The `@media` variants on the wrappers keep
 * the right one visible during that first paint on both fine and coarse pointers.
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
    matchBadge,
    isDesktop,
}: JobCardResponsiveProps) {
    const [detectedDesktop, setDetectedDesktop] = useState<boolean | null>(null);

    useEffect(() => {
        const query = window.matchMedia(DESKTOP_QUERY);
        const update = () => setDetectedDesktop(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    // The feed's flag wins; other callers fall back to the pointer-aware query.
    const desktop = isDesktop ?? detectedDesktop;

    return (
        <>
            {desktop !== true && (
            <div className="min-w-0 [@media(min-width:64rem)_and_(pointer:fine)]:hidden">
                <JobCardMobile
                    job={job}
                    jobId={jobId}
                    onClick={onClick}
                    isSaved={isSaved}
                    isApplied={isApplied}
                    onToggleSave={onToggleSave}
                    priority={priority}
                    searchQuery={searchQuery}
                    searchedSkill={searchedSkill}
                    className={className}
                    matchBadge={matchBadge}
                />
            </div>
            )}
            {desktop !== false && (
            <div className="hidden min-w-0 [@media(min-width:64rem)_and_(pointer:fine)]:block">
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