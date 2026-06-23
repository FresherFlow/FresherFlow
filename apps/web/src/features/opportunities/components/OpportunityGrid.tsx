'use client';

import { Opportunity } from '@fresherflow/types';
import JobCard from './JobCard';
import { SkeletonJobCard } from '@/ui/Skeleton';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { cn } from '@repo/ui/utils/cn';

type OpportunityAction = { actionType: string };

interface OpportunityGridProps {
    opportunities: Opportunity[];
    isLoading: boolean;
    error: string | null;
    isAdmin: boolean;
    onToggleSave: (id: string) => void;
    onClearFilters: () => void;
    onRetry: () => void;
    isSplitView?: boolean;
    selectedOppId?: string | null;
    onSelectOpportunity?: (opp: Opportunity) => void;
}

import { useEffect } from 'react';

export function OpportunityGrid({
    opportunities,
    isLoading,
    error,
    isAdmin,
    onToggleSave,
    onClearFilters,
    onRetry,
    isSplitView = false,
    selectedOppId = null,
    onSelectOpportunity
}: OpportunityGridProps) {

    // Grid layout remains static and independent of selection in Drawer architecture
    if (isLoading && opportunities.length === 0) {
        return (
            <div className={cn(
                "grid gap-4 md:gap-6",
                isSplitView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )} role="status" aria-label="Loading opportunities">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                    <SkeletonJobCard key={item} />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <ErrorMessage
                title="Feed unavailable"
                message={error}
                onRetry={onRetry}
                variant="card"
            />
        );
    }

    if (opportunities.length === 0) {
        return (
            <ErrorMessage
                title="No results found"
                message="Try adjusting your filters or search keywords to find matching opportunities."
                onRetry={onClearFilters}
                variant="card"
            />
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className={cn(
                "grid gap-4 md:gap-6",
                isSplitView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
            )} role="list" aria-label="Job listings">
                {opportunities.map((opp) => (
                    <div key={opp.id} role="listitem" data-opp-id={opp.id}>
                        <JobCard
                            job={{
                                ...opp,
                                normalizedRole: opp.title,
                                salary: (opp.salaryMin !== undefined && opp.salaryMax !== undefined) ? { min: opp.salaryMin, max: opp.salaryMax } : undefined,
                            }}
                            jobId={opp.id}
                            isSaved={opp.isSaved || false}
                            isApplied={(opp.actions || []).some((a: OpportunityAction) => a.actionType === 'APPLIED')}
                            onToggleSave={() => onToggleSave(opp.id)}
                            isAdmin={isAdmin}
                            isSelected={opp.id === selectedOppId || opp.slug === selectedOppId}
                            variant={isSplitView ? "compact" : "default"}
                            onClick={(e) => {
                                if (onSelectOpportunity) {
                                    e.preventDefault();
                                    onSelectOpportunity(opp);
                                }
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
