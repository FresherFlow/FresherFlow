'use client';

import { Opportunity } from '@fresherflow/types';
import JobCard from './JobCard';
import { SkeletonJobCard } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';

interface OpportunityGridProps {
    opportunities: Opportunity[];
    isLoading: boolean;
    error: string | null;
    isFilterOpen: boolean;
    isAdmin: boolean;
    onToggleSave: (id: string) => void;
    onClearFilters: () => void;
    onRetry: () => void;
}

export function OpportunityGrid({
    opportunities,
    isLoading,
    error,
    isFilterOpen,
    isAdmin,
    onToggleSave,
    onClearFilters,
    onRetry
}: OpportunityGridProps) {
    const router = useRouter();

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
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-6",
                isFilterOpen ? "lg:grid-cols-2 xl:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"
            )} role="list" aria-label="Job listings">
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
                        isApplied={opp.actions && opp.actions.length > 0}
                        onToggleSave={() => onToggleSave(opp.id)}
                        onClick={() => router.push(getOpportunityPathFromItem(opp))}
                        isAdmin={isAdmin}
                    />
                ))}
            </div>
        </div>
    );
}
