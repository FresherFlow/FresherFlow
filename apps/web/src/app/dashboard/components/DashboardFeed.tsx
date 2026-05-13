import React from 'react';
import Link from 'next/link';
import { Opportunity } from '@fresherflow/types';
import { SkeletonJobCard } from '@/features/system/components/ui/Skeleton';
import JobCard from '@/features/opportunities/components/JobCard';
import { Button } from '@/features/system/components/ui/Button';

interface DashboardFeedProps {
    isLoading: boolean;
    opportunities: Opportunity[];
    onToggleSave: (id: string) => void;
    isAdmin: boolean;
    hasAppliedAction: (opp: Opportunity) => boolean;
    mobileVisibleCount: number;
    setMobileVisibleCount: (v: number | ((prev: number) => number)) => void;
    mobileStep: number;
}

export const DashboardFeed = ({
    isLoading,
    opportunities,
    onToggleSave,
    isAdmin,
    hasAppliedAction,
    mobileVisibleCount,
    setMobileVisibleCount,
    mobileStep
}: DashboardFeedProps) => {
    const desktopLimit = 24;

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
                            />
                        ))}
                        {opportunities.length > mobileVisibleCount && (
                            <Button
                                variant="outline"
                                onClick={() => setMobileVisibleCount((prev) => (typeof prev === 'number' ? prev + mobileStep : prev))}
                                className="w-full h-10 text-[10px] font-bold capitalize tracking-widest"
                            >
                                Load more
                            </Button>
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
                        <Button asChild variant="outline" className="mt-4 h-8 text-[10px] font-bold capitalize tracking-widest">
                            <Link href="/opportunities">Browse all feed</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {opportunities.slice(0, desktopLimit).map((opp) => (
                            <JobCard
                                key={`desk-${opp.id}`}
                                job={opp}
                                jobId={opp.id}
                                isApplied={hasAppliedAction(opp)}
                                isSaved={opp.isSaved}
                                onToggleSave={() => onToggleSave(opp.id)}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};
