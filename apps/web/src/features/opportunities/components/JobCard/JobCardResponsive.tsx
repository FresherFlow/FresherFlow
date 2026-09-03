'use client';

import React from 'react';
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
    return (
        <>
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
        </>
    );
}

export default JobCardResponsive;