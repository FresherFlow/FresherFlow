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

/** A labelled field: one short label line over two value lines. */
function FieldLines() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    );
}

export function AdminOverviewSkeleton() {
    return (
        <div className="space-y-6 p-4 md:p-8" aria-hidden="true">
            <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-44" />
                    <Skeleton className="h-3 w-72" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-32" />
                </div>
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
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8" aria-hidden="true">
            <div className="space-y-2 border-b border-border pb-5">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-3 w-72" />
            </div>
            <LineBlockSkeleton />
            <StatGridSkeleton
                count={5}
                className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-3 w-40" />
                            <Skeleton variant="pill" className="h-6 w-6" />
                        </div>
                        <FieldLines />
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
        <div className="space-y-4" aria-hidden="true">
            <div className="space-y-3 md:hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                        <div className="flex items-start gap-3">
                            <Skeleton variant="pill" className="h-9 w-9" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton variant="pill" className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                ))}
            </div>
            <div className="hidden space-y-3 md:block">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="ml-auto h-3 w-16" />
                </div>
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <Skeleton variant="pill" className="h-8 w-8 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-3 w-40" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton variant="pill" className="h-5 w-16" />
                        <Skeleton variant="pill" className="h-5 w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AdminFormSkeleton() {
    return (
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8" aria-hidden="true">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-8 w-56" />
                </div>
                <Skeleton className="h-9 w-28" />
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
