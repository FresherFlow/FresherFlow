import * as React from "react";
import { Skeleton } from "@/ui/Skeleton";
import { cn } from "@/ui/cn";

type JobCardVariant = "vertical" | "compact" | "wide";

function SkeletonMetaRow() {
    return (
        <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <span className="h-1 w-1 rounded-full bg-border" />
            <Skeleton className="h-3 w-16" />
        </div>
    );
}

function SkeletonTagRow() {
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <Skeleton variant="pill" className="h-6 w-16" />
            <Skeleton variant="pill" className="h-6 w-20" />
            <Skeleton variant="pill" className="h-6 w-12" />
        </div>
    );
}

function SkeletonActionRow() {
    return (
        <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton variant="action" className="h-7 w-16" />
        </div>
    );
}

export function SkeletonJobCard({ variant = "wide" }: { variant?: JobCardVariant }) {
    const compact = variant === "compact" || variant === "vertical";

    return (
        <div
            className={cn("space-y-2 py-3", compact && "py-2.5")}
            aria-hidden="true"
        >
            <div className="flex items-start gap-3">
                <Skeleton
                    variant="panel"
                    className={cn("shrink-0", compact ? "h-9 w-9" : "h-10 w-10")}
                />
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <SkeletonMetaRow />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {!compact && <Skeleton className="h-3 w-12" />}
                    <Skeleton variant="panel" className="h-8 w-8" />
                </div>
            </div>
            <div className="mt-2">
                <SkeletonTagRow />
            </div>
            <div className="mt-2">
                <SkeletonActionRow />
            </div>
        </div>
    );
}

export function SkeletonListRow({ className }: { className?: string }) {
    return (
        <div
            className={cn("flex items-start gap-3 py-3", className)}
            aria-hidden="true"
        >
            <Skeleton variant="pill" className="mt-1.5 h-2 w-2 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="mt-0.5 h-3 w-10 shrink-0" />
        </div>
    );
}

export function SkeletonSettingsRow() {
    return (
        <div className="flex items-center justify-between gap-4 py-3" aria-hidden="true">
            <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton variant="pill" className="h-7 w-12 shrink-0" />
        </div>
    );
}

export function SkeletonDiscussionRow() {
    return (
        <div className="space-y-2 py-3" aria-hidden="true">
            <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton variant="pill" className="h-5 w-14" />
                <Skeleton className="h-3 w-16" />
            </div>
            <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
            </div>
            <div className="mt-3 flex items-center gap-4">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-12" />
            </div>
        </div>
    );
}

export function SkeletonUpdateRow() {
    return (
        <div className="relative flex gap-3 py-3 pl-8" aria-hidden="true">
            <Skeleton variant="pill" className="absolute left-2.5 top-2 h-3 w-3" />
            <div className="flex-1 space-y-2 py-1">
                <div className="flex items-center justify-between gap-2">
                    <Skeleton variant="pill" className="h-5 w-20" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-full" />
            </div>
        </div>
    );
}

export function SkeletonInterviewRow() {
    return (
        <div className="space-y-2 py-3" aria-hidden="true">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex gap-1.5">
                    <Skeleton variant="pill" className="h-5 w-16" />
                    <Skeleton variant="pill" className="h-5 w-14" />
                </div>
            </div>
            <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
            </div>
        </div>
    );
}

export function SkeletonCommunityPanel() {
    return (
        <div className="space-y-4 py-3" aria-hidden="true">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-lg bg-muted/30 p-3 text-center">
                        <Skeleton className="mx-auto h-7 w-12" />
                        <Skeleton className="mx-auto mt-2 h-3 w-20" />
                    </div>
                ))}
            </div>
            <div className="space-y-2 border-t border-border/40 pt-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-lg bg-muted/30 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="mt-2 h-3 w-4/5" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonTrackerTable() {
    return (
        <div
            className="w-full overflow-x-auto rounded-xl border border-border/60 bg-card/60"
            aria-hidden="true"
        >
            <div className="min-w-3xl">
                <div className="grid grid-cols-6 gap-4 bg-muted/20 px-4 py-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-14" />
                </div>
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-6 items-center gap-4 border-t border-border/40 px-4 py-3"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <Skeleton variant="panel" className="h-9 w-9 shrink-0" />
                            <div className="min-w-0 space-y-1.5">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-4 w-36" />
                            </div>
                        </div>
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton variant="pill" className="h-6 w-20" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton variant="panel" className="h-8 w-8 justify-self-end" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonSettingsPanel() {
    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-5" aria-busy="true">
            <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <SkeletonSettingsRow />
                <SkeletonSettingsRow />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <SkeletonSettingsRow />
            </div>
            <div className="space-y-3 py-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
                <div className="flex flex-wrap gap-2 pt-1">
                    <Skeleton variant="pill" className="h-8 w-14" />
                    <Skeleton variant="pill" className="h-8 w-14" />
                    <Skeleton variant="pill" className="h-8 w-14" />
                    <Skeleton variant="pill" className="h-8 w-14" />
                </div>
            </div>
        </div>
    );
}

export function OpportunityDetailPaneSkeleton() {
    return (
        <div className="flex h-full min-h-96 flex-col bg-transparent" aria-busy="true" aria-label="Loading opportunity details">
            <div className="shrink-0 border-b border-border/40 px-4 py-4 md:px-6">
                <div className="flex items-center gap-3">
                    <Skeleton variant="pill" className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                        <Skeleton variant="pill" className="h-9 w-16" />
                        <Skeleton variant="pill" className="h-9 w-20" />
                    </div>
                </div>
            </div>
            <div className="flex-1 space-y-5 overflow-hidden p-4 md:p-6">
                <div className="flex flex-wrap gap-1.5">
                    <Skeleton variant="pill" className="h-6 w-16" />
                    <Skeleton variant="pill" className="h-6 w-20" />
                    <Skeleton variant="pill" className="h-6 w-24" />
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-2.5">
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>
                <div className="space-y-2 py-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                </div>
            </div>
        </div>
    );
}

export function FeedPageSkeleton({ isGovt = false }: { isGovt?: boolean }) {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6" aria-busy="true" aria-label="Loading opportunities">
            <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96 max-w-full" />
                <div className="flex flex-wrap gap-2 pt-1">
                    <Skeleton variant="pill" className="h-8 w-28" />
                    <Skeleton variant="pill" className="h-8 w-24" />
                    <Skeleton variant="pill" className="h-8 w-32" />
                </div>
            </div>
            <div className={cn("grid items-start gap-6", isGovt ? "max-w-3xl grid-cols-1" : "xl:grid-cols-2")}>
                <div className="grid min-w-0 gap-4 md:gap-6">
                    {Array.from({ length: isGovt ? 6 : 5 }).map((_, index) => (
                        <SkeletonJobCard key={index} variant={isGovt ? "wide" : "compact"} />
                    ))}
                </div>
                {!isGovt && (
                    <div className="hidden min-h-96 overflow-hidden xl:block">
                        <OpportunityDetailPaneSkeleton />
                    </div>
                )}
            </div>
        </div>
    );
}

export function OpportunityDetailSkeleton() {
    return (
        <div className="min-h-screen bg-background pb-16" aria-busy="true" aria-label="Loading opportunity">
            <div className="mx-auto max-w-7xl px-4 pb-8 pt-4 md:pt-6">
                <div className="mb-4 flex items-center gap-1.5 md:hidden">
                    <Skeleton className="h-3 w-12" />
                    <span className="h-3 w-px bg-border" />
                    <Skeleton className="h-3 w-16" />
                    <span className="h-3 w-px bg-border" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
                    <div className="space-y-5 lg:col-span-3">
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                                <Skeleton variant="pill" className="h-6 w-20" />
                                <Skeleton variant="pill" className="h-6 w-24" />
                            </div>
                            <Skeleton className="h-8 w-4/5" />
                            <Skeleton className="h-7 w-3/5" />
                            <div className="flex items-center gap-2.5">
                                <Skeleton variant="panel" className="h-9 w-9 shrink-0" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 lg:hidden">
                                <Skeleton variant="pill" className="h-7 w-20" />
                                <Skeleton variant="pill" className="h-7 w-24" />
                                <Skeleton variant="pill" className="h-7 w-20" />
                            </div>
                        </div>
                        <div className="space-y-3 py-1">
                            <Skeleton className="h-5 w-28" />
                            <div className="space-y-2.5">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-4/5" />
                                <Skeleton className="h-3 w-5/6" />
                            </div>
                        </div>
                        <div className="space-y-3 border-t border-border/40 pt-4">
                            <Skeleton className="h-4 w-40" />
                            <div className="flex flex-wrap gap-2">
                                <Skeleton variant="pill" className="h-7 w-24" />
                                <Skeleton variant="pill" className="h-7 w-28" />
                                <Skeleton variant="pill" className="h-7 w-20" />
                            </div>
                        </div>
                    </div>
                    <aside className="space-y-4 lg:col-span-2">
                        <div className="space-y-4 py-1">
                            <div className="flex gap-2">
                                <Skeleton variant="pill" className="h-10 w-20" />
                                <Skeleton variant="pill" className="h-10 w-16" />
                                <Skeleton variant="pill" className="h-10 w-10" />
                            </div>
                            <div className="space-y-3 border-t border-border/40 pt-4">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="flex items-center gap-2.5">
                                        <Skeleton className="h-3 w-28" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3 py-1">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-40" />
                            <Skeleton className="h-3 w-5/6" />
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                <Skeleton variant="pill" className="h-6 w-16" />
                                <Skeleton variant="pill" className="h-6 w-20" />
                                <Skeleton variant="pill" className="h-6 w-12" />
                            </div>
                        </div>
                    </aside>
                </div>
                <div className="mt-8 space-y-4 border-t border-border/40 pt-6">
                    <Skeleton className="h-4 w-40" />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <SkeletonJobCard key={index} variant="compact" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
