'use client';

import { Opportunity, OpportunityCardDTO } from '@fresherflow/types';
import JobCard from './JobCard';
import { SkeletonJobCard } from '@/ui/Skeleton';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { cn } from '@repo/ui/utils/cn';

type OpportunityAction = { actionType: string };

interface OpportunityGridProps {
    opportunities: (Opportunity | OpportunityCardDTO)[];
    isLoading: boolean;
    error: string | null;
    isAdmin: boolean;
    onToggleSave: (id: string) => void;
    onClearFilters: () => void;
    onRetry: () => void;
    isSplitView?: boolean;
    selectedOppId?: string | null;
    onSelectOpportunity?: (opp: Opportunity | OpportunityCardDTO) => void;
    searchQuery?: string;
}

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
    onSelectOpportunity,
    searchQuery
}: OpportunityGridProps) {

    // Grid layout remains static and independent of selection in Drawer architecture
    if (isLoading && opportunities.length === 0) {
        return (
            <div className={cn(
                "grid gap-4 md:gap-6",
                isSplitView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )} role="status" aria-label="Loading opportunities">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                    <SkeletonJobCard key={item} variant={isSplitView ? "compact" : "wide"} />
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
                message="Try adjusting your filters or search keywords to find matching verified opportunities."
                onRetry={onClearFilters}
                variant="card"
            />
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className={cn(
                "grid gap-4 md:gap-6",
                isSplitView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )} role="list" aria-label="Job listings">
                {opportunities.map((opp, index) => (
                    <div 
                        key={opp.id} 
                        role="listitem" 
                        data-opp-id={opp.id}
                    >
                        <JobCard
                            job={{
                                ...opp,
                                normalizedRole: opp.title,
                                salary: ((opp as any).salaryMin !== undefined && (opp as any).salaryMax !== undefined) ? { min: (opp as any).salaryMin, max: (opp as any).salaryMax } : undefined,
                            } as any}
                            jobId={opp.id}
                            isSaved={(opp as any).isSaved || false}
                            isApplied={((opp as any).actions || []).some((a: OpportunityAction) => a.actionType === 'APPLIED')}
                            onToggleSave={() => onToggleSave(opp.id)}
                            isAdmin={isAdmin}
                            priority={index < 4}
                            variant={isSplitView ? 'compact' : 'wide'}
                            isSelected={opp.id === selectedOppId || (opp as any).slug === selectedOppId}
                            searchQuery={searchQuery}
                            className="bg-card/60 border-border/60 backdrop-blur-xl shadow-md hover:shadow-lg hover:border-primary/40 active:scale-[0.97] transition-all duration-150 ease-out"
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
