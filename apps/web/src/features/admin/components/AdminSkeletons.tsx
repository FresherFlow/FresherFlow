import * as React from "react";
import { Skeleton } from "@/ui/Skeleton";

/** Stat cell: pill icon plus label/value lines. Cells carry no border of their own. */
function StatSkeleton() {
    return (
        <div className="flex items-center gap-3">
            <Skeleton variant="pill" className="h-8 w-8 shrink-0" />
            <div className="min-w-0 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-12" />
            </div>
        </div>
    );
}

/** One rounded-xl bordered grid holds the whole stat group; per-stat borders are dropped. */
function StatGridSkeleton({ count, className }: { count: number; className: string }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <div className={className}>
                {Array.from({ length: count }).map((_, index) => (
                    <StatSkeleton key={index} />
                ))}
            </div>
        </div>
    );
}

/** Three lines stand in for a large empty placeholder box. */
function LineBlockSkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    );
}

export function AdminOverviewSkeleton() {
    return (
        <div className="space-y-4 md:space-y-6 animate-pulse pb-8">
            <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-36" />
            </div>
            <StatGridSkeleton
                count={4}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <LineBlockSkeleton />
                <LineBlockSkeleton />
            </div>
            <div className="bg-card rounded-lg border border-border p-4 md:p-5 space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                ))}
            </div>
        </div>
    );
}

export function AdminAnalyticsSkeleton() {
    return (
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 md:pb-20 px-2 md:px-4 pt-4 md:pt-0 animate-pulse">
            <div className="space-y-2 py-4">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-52" />
            </div>
            <LineBlockSkeleton />
            <StatGridSkeleton
                count={5}
                className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="bg-card/30 rounded-xl border border-border/50 p-4 md:p-6 space-y-3">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AdminFeedbackSkeleton() {
    return (
        <div className="space-y-4 md:space-y-8 animate-pulse">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-40" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>
                <StatGridSkeleton
                    count={3}
                    className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
                />
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-card rounded-lg border border-border p-4 md:p-5 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <LineBlockSkeleton />
                </div>
            ))}
        </div>
    );
}

export function AdminOpportunitiesSkeleton() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="bg-card rounded-lg border border-border p-4 space-y-3 animate-pulse">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-9 w-full" />
                    </div>
                ))}
            </div>
            <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden animate-pulse">
                <table className="w-full">
                    <tbody className="divide-y divide-border">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <tr key={index}>
                                <td className="px-5 py-4"><Skeleton className="h-4 w-4" /></td>
                                <td className="px-5 py-4"><Skeleton className="h-4 w-48" /></td>
                                <td className="px-5 py-4"><Skeleton className="h-4 w-36" /></td>
                                <td className="px-5 py-4"><Skeleton className="h-5 w-20" /></td>
                                <td className="px-5 py-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function AdminFormSkeleton() {
    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
            <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-7 w-56" />
            </div>
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <Skeleton className="h-5 w-40" />
                    <LineBlockSkeleton />
                </div>
            ))}
        </div>
    );
}
