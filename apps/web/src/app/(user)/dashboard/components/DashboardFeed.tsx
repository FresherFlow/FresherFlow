import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Opportunity } from '@fresherflow/types';
import { SkeletonJobCard } from '@/features/opportunities/components/OpportunitySkeletons';
import JobCard from '@/features/opportunities/components/JobCard';
import { Button } from '@/ui/Button';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface DashboardFeedProps {
    isLoading: boolean;
    opportunities: Opportunity[];
    onToggleSave: (id: string) => void;
    isAdmin: boolean;
    hasAppliedAction: (opp: Opportunity) => boolean;
    mobileVisibleCount: number;
    setMobileVisibleCount: (v: number | ((prev: number) => number)) => void;
    mobileStep: number;
    searchQuery?: string;
}

export const DashboardFeed = ({
    isLoading,
    opportunities,
    onToggleSave,
    isAdmin,
    hasAppliedAction,
    mobileVisibleCount,
    setMobileVisibleCount,
    mobileStep,
    searchQuery
}: DashboardFeedProps) => {
    const router = useRouter();
    const desktopLimit = 24;
    const { targetRef: loadMoreRef, isIntersecting } = useIntersectionObserver({ threshold: 0.1, rootMargin: '400px' });
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        if (isIntersecting && opportunities.length > mobileVisibleCount && !isLoadingMore) {
            setIsLoadingMore(true);
            setTimeout(() => {
                setMobileVisibleCount((prev) => (typeof prev === 'number' ? prev + mobileStep : prev));
                setIsLoadingMore(false);
            }, 600);
        }
    }, [isIntersecting, opportunities.length, mobileVisibleCount, mobileStep, isLoadingMore, setMobileVisibleCount]);

    return (
        <>
            {/* Mobile Feed */}
            <div className="md:hidden min-h-150">
                {isLoading ? (
                    <div className="space-y-4"><SkeletonJobCard /><SkeletonJobCard /></div>
                ) : opportunities.length === 0 ? (
                    <div className="p-10 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">No listings here yet.</div>
                ) : (
                    <div className="space-y-4">
                        {opportunities.slice(0, mobileVisibleCount).map((opp, idx) => (
                            <JobCard
                                key={`mob-${opp.id}`}
                                job={opp}
                                jobId={opp.id}
                                isApplied={hasAppliedAction(opp)}
                                isSaved={opp.isSaved}
                                onToggleSave={() => onToggleSave(opp.id)}
                                isAdmin={isAdmin}
                                priority={idx < 2}
                                searchQuery={searchQuery}
                            />
                        ))}
                        {(opportunities.length > mobileVisibleCount || isLoadingMore) && (
                            <div ref={loadMoreRef} className="flex justify-center pt-8 pb-4">
                                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Desktop Feed */}
            <div className="hidden md:block min-h-150">
                {isLoading ? (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4].map(i => <SkeletonJobCard key={i} />)}
                    </div>
                ) : opportunities.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-border rounded-xl">
                        <p className="text-sm font-medium text-muted-foreground">No results found in this section.</p>
                        <Button onClick={() => router.push('/jobs')} variant="outline" className="mt-4 h-8 text-[10px] font-bold capitalize tracking-widest">
                            Browse all feed
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                        {opportunities.slice(0, desktopLimit).map((opp) => (
                            <JobCard
                                key={`desk-${opp.id}`}
                                job={opp}
                                jobId={opp.id}
                                isApplied={hasAppliedAction(opp)}
                                isSaved={opp.isSaved}
                                onToggleSave={() => onToggleSave(opp.id)}
                                isAdmin={isAdmin}
                                searchQuery={searchQuery}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};
