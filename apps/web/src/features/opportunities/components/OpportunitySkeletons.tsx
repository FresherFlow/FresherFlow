import * as React from "react";
import { Skeleton } from "@/ui/Skeleton";

export function SkeletonJobCard({ variant = 'wide' }: { variant?: 'vertical' | 'compact' | 'wide' }) {
    if (variant === 'compact' || variant === 'wide') {
        return (
            <div className="bg-card border border-border/50 rounded-xl p-3.5 shadow-sm space-y-3">
                <div className="flex items-start gap-3 relative">
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-3 w-24 rounded" />
                            <Skeleton className="h-3 w-12 rounded" />
                        </div>
                        <Skeleton className="h-4 w-3/4 rounded" />
                    </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/30">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-20 rounded" />
                        <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded" />
                </div>
            </div>
        );
    }

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

export function FeedPageSkeleton({ isGovt = false }: { isGovt?: boolean }) {
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
            {isGovt ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonJobCard key={index} variant="vertical" />
                    ))}
                </div>
            ) : (
                <div className="w-full grid gap-6 items-start grid-cols-1 lg:grid-cols-[1.3fr_1.7fr]">
                    <div className="min-w-0 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
                        <div className="grid grid-cols-1 gap-4 md:gap-6">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <SkeletonJobCard key={index} variant="compact" />
                            ))}
                        </div>
                    </div>
                    <div className="hidden lg:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] bg-card border border-border/50 rounded-2xl p-6">
                        <Skeleton className="h-8 w-1/2 mb-4" />
                        <Skeleton className="h-4 w-3/4 mb-8" />
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function OpportunityDetailSkeleton() {
    return (
        <div className="min-h-screen bg-background pb-16">
            {/* Visual Breadcrumbs & Hero Section Skeleton */}
            <div className="w-full bg-background py-5 md:py-7">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <Skeleton className="h-3 w-10 rounded" />
                        <span className="text-muted-foreground/40 text-xs">/</span>
                        <Skeleton className="h-3 w-16 rounded" />
                        <span className="text-muted-foreground/40 text-xs">/</span>
                        <Skeleton className="h-3 w-20 rounded" />
                        <span className="text-muted-foreground/40 text-xs">/</span>
                        <Skeleton className="h-3 w-24 rounded" />
                    </div>

                    {/* DetailHeroSection */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Skeleton className="h-5 w-24 rounded-md" />
                            <Skeleton className="h-5.5 w-16 rounded-md" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                            <div className="space-y-2.5 min-w-0 flex-1">
                                <Skeleton className="h-8 md:h-10 w-3/4 rounded-lg" />
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-9 w-9 md:w-10 md:h-10 rounded-lg shrink-0" />
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-4 w-32 rounded" />
                                        <Skeleton className="h-3.5 w-24 rounded" />
                                    </div>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-2 pt-2 shrink-0">
                                <Skeleton className="h-11 w-32 rounded-xl" />
                                <Skeleton className="h-11 w-11 rounded-xl" />
                                <Skeleton className="h-11 w-11 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6 pb-24 lg:pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    {/* Left/Main Column (lg:col-span-3) */}
                    <div className="space-y-4 md:space-y-6 lg:col-span-3">
                        {/* Mobile-Only Sidebar boxes simulator */}
                        <div className="lg:hidden space-y-4">
                            <div className="bg-muted/30 rounded-2xl p-5 space-y-4">
                                <Skeleton className="h-3.5 w-24 rounded border-b border-border/60 pb-2" />
                                <div className="space-y-3">
                                    <Skeleton className="h-4 w-1/2 rounded" />
                                    <Skeleton className="h-4 w-3/4 rounded" />
                                </div>
                            </div>
                        </div>

                        {/* Snapshot card */}
                        <div className="bg-muted/30 p-5 rounded-2xl space-y-4">
                            <Skeleton className="h-4 w-28 rounded" />
                            <div className="space-y-2">
                                <Skeleton className="h-3.5 w-full rounded" />
                                <Skeleton className="h-3.5 w-5/6 rounded" />
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="space-y-3 py-2">
                            <Skeleton className="h-5 w-32 rounded" />
                            <div className="space-y-2.5">
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="h-4 w-4/5 rounded" />
                                <Skeleton className="h-4 w-5/6 rounded" />
                                <Skeleton className="h-4 w-2/3 rounded" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column (lg:col-span-2) */}
                    <aside className="hidden lg:block lg:col-span-2 space-y-4 md:space-y-6">
                        {/* Job Overview Card */}
                        <div className="bg-muted/30 p-5 rounded-2xl space-y-4">
                            <Skeleton className="h-4 w-24 rounded border-b border-border/40 pb-2.5" />
                            <div className="space-y-4">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <Skeleton className="w-5 h-5 rounded-md shrink-0" />
                                        <div className="space-y-1.5 flex-1">
                                            <Skeleton className="h-3 w-16 rounded" />
                                            <Skeleton className="h-4 w-28 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Requirements Box */}
                        <div className="bg-muted/30 rounded-2xl p-5 md:p-6 space-y-4">
                            <Skeleton className="h-3.5 w-24 rounded border-b border-border/60 pb-2" />
                            <div className="space-y-4">
                                {Array.from({ length: 2 }).map((_, index) => (
                                    <div key={index} className="space-y-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Skeleton className="w-4 h-4 rounded-md" />
                                            <Skeleton className="h-3 w-20 rounded" />
                                        </div>
                                        <Skeleton className="h-4 w-40 rounded pl-5.5" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
