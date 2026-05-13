'use client';

import { Opportunity } from '@fresherflow/types';
import JobCard from './JobCard';
import { SkeletonJobCard } from '@/features/system/components/ui/Skeleton';
import { ErrorMessage } from '@/features/system/components/ui/ErrorMessage';

type OpportunityAction = { actionType: string };

interface OpportunityGridProps {
    opportunities: Opportunity[];
    isLoading: boolean;
    error: string | null;
    isAdmin: boolean;
    onToggleSave: (id: string) => void;
    onClearFilters: () => void;
    onRetry: () => void;
}

export function OpportunityGrid({
    opportunities,
    isLoading,
    error,
    isAdmin,
    onToggleSave,
    onClearFilters,
    onRetry
}: OpportunityGridProps) {

    if (isLoading && opportunities.length === 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" role="status" aria-label="Loading opportunities">
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
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307L21.75 6.75" />
                        </svg>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {opportunities.length} SIGNALS DISCOVERED
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8" role="list" aria-label="Job listings">
                {opportunities.map((opp) => (
                    <JobCard
                        key={opp.id}
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
                    />
                ))}
            </div>
        </div>
    );
}
