'use client';

import { cn } from "@/lib/utils/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn("animate-pulse rounded bg-muted", className)}
            {...props}
        />
    );
}

export function SkeletonJobCard() {
    return (
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            {/* Header Mirror */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="h-10 w-10 rounded shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
                <Skeleton className="h-10 w-10 rounded shrink-0" />
            </div>

            {/* Badge Row Mirror */}
            <div className="flex justify-between items-center pt-1">
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
            </div>

            {/* Grid Mirror */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>

            {/* Footer Mirror */}
            <div className="pt-4 border-t border-border/30 flex justify-between items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
            </div>
        </div>
    );
}

export function FeedPageSkeleton() {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pb-12 md:pb-20 space-y-6 md:space-y-8">
            <div className="space-y-3 pb-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
                <div className="flex flex-wrap gap-2 pt-1">
                    <Skeleton className="h-10 w-72" />
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                    <SkeletonJobCard key={index} />
                ))}
            </div>
        </div>
    );
}

export function OpportunityDetailSkeleton() {
    return (
        <div className="min-h-screen bg-background pb-16">
            <main className="relative z-10 max-w-6xl mx-auto px-4 py-4 md:py-7 space-y-3 md:space-y-5">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-24" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-lg" />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 items-start">
                    <div className="lg:col-span-8 space-y-3 md:space-y-4">
                        <div className="bg-card p-4 md:p-5 rounded-xl border border-border space-y-4">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-7 w-4/5" />
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-28" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Skeleton className="h-14 w-full rounded-lg" />
                                <Skeleton className="h-14 w-full rounded-lg" />
                                <Skeleton className="h-14 w-full rounded-lg" />
                                <Skeleton className="h-14 w-full rounded-lg" />
                            </div>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                    <aside className="lg:col-span-4 space-y-3">
                        <div className="bg-card p-4 rounded-xl border border-border space-y-3">
                            <Skeleton className="h-10 w-full rounded-lg" />
                            <Skeleton className="h-9 w-full rounded-lg" />
                        </div>
                        <div className="bg-card p-4 rounded-xl border border-border space-y-3">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}

// Admin skeleton components (merged from shared)
export function AdminOverviewSkeleton() {
    return (
        <div className="space-y-4 md:space-y-6 animate-pulse pb-8">
            <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-36" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="bg-card p-4 md:p-5 rounded-lg border border-border space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-12" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
            </div>
            <div className="bg-card rounded-lg border border-border p-4 md:p-5 space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-md" />
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
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="bg-card/50 rounded-xl border border-border/50 p-3 md:p-5 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-16" />
                    </div>
                ))}
            </div>
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
                    <Skeleton className="h-8 w-24 rounded-md" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="bg-card p-3 md:p-5 rounded-lg border border-border space-y-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-7 w-16" />
                        </div>
                    ))}
                </div>
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-card rounded-lg border border-border p-4 md:p-5 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <Skeleton className="h-20 w-full rounded-lg" />
                    </div>
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
                        <Skeleton className="h-9 w-full rounded-md" />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-11 w-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-8 w-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <tr className="border-b border-border">
            <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
            <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
        </tr>
    );
}

export function StatsSkeleton() {
    return (
        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-12" />
        </div>
    );
}

