import * as React from "react";
import { Skeleton } from "@/ui/Skeleton";

/**
 * Line/pill skeletons — no card chrome (no bg-card, no border, no rounded
 * container). Each placeholder is a pill or a line so the loading state never
 * flashes a box that the loaded content does not have.
 */
export function SkeletonJobCard({ variant = 'wide' }: { variant?: 'vertical' | 'compact' | 'wide' }) {
    return (
        <div className="space-y-3 py-1" aria-hidden="true">
            <div className="flex items-start gap-3">
                <Skeleton variant="pill" className="h-10 w-10 shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton variant="pill" className="h-4 w-3/4" />
                    <Skeleton variant="pill" className="h-3 w-1/2" />
                </div>
                <Skeleton variant="pill" className="h-8 w-16 shrink-0" />
            </div>
            <div className="flex gap-4">
                <Skeleton variant="pill" className="h-3 w-16" />
                <Skeleton variant="pill" className="h-3 w-20" />
                {variant !== 'compact' && <Skeleton variant="pill" className="h-3 w-14" />}
            </div>
            <div className="flex gap-1.5">
                <Skeleton variant="pill" className="h-6 w-14" />
                <Skeleton variant="pill" className="h-6 w-16" />
                <Skeleton variant="pill" className="h-6 w-12" />
            </div>
            <div className="flex justify-between items-center">
                <Skeleton variant="pill" className="h-3 w-32" />
                <Skeleton variant="pill" className="h-8 w-20" />
            </div>
        </div>
    );
}

export function FeedPageSkeleton({ isGovt = false }: { isGovt?: boolean }) {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pb-12 md:pb-20 space-y-6 md:space-y-8">
            <div className="space-y-3 pb-4">
                <Skeleton variant="pill" className="h-8 w-64" />
                <Skeleton variant="pill" className="h-4 w-40" />
                <div className="flex flex-wrap gap-2 pt-1">
                    <Skeleton variant="pill" className="h-10 w-72" />
                    <Skeleton variant="pill" className="h-9 w-20" />
                    <Skeleton variant="pill" className="h-9 w-28" />
                    <Skeleton variant="pill" className="h-9 w-24" />
                </div>
            </div>
            {isGovt ? (
                <div className="max-w-3xl mx-auto grid grid-cols-1 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonJobCard key={index} variant="wide" />
                    ))}
                </div>
            ) : (
                <div className="w-full grid gap-6 items-start grid-cols-1 xl:grid-cols-2">
                    <div className="min-w-0 xl:sticky xl:top-14 xl:h-full xl:overflow-y-auto xl:pr-2">
                        <div className="grid grid-cols-1 gap-6">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <SkeletonJobCard key={index} variant="compact" />
                            ))}
                        </div>
                    </div>
                    <div className="hidden xl:flex flex-col sticky top-14 h-full space-y-4">
                        <Skeleton variant="pill" className="h-8 w-1/2" />
                        <Skeleton variant="pill" className="h-4 w-3/4" />
                        <Skeleton variant="pill" className="h-4 w-full" />
                        <Skeleton variant="pill" className="h-4 w-full" />
                        <Skeleton variant="pill" className="h-4 w-5/6" />
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
                        <Skeleton variant="pill" className="h-3 w-10" />
                        <span className="text-muted-foreground/40 text-xs">/</span>
                        <Skeleton variant="pill" className="h-3 w-16" />
                        <span className="text-muted-foreground/40 text-xs">/</span>
                        <Skeleton variant="pill" className="h-3 w-20" />
                        <span className="text-muted-foreground/40 text-xs">/</span>
                        <Skeleton variant="pill" className="h-3 w-24" />
                    </div>

                    {/* DetailHeroSection */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Skeleton variant="pill" className="h-5 w-24" />
                            <Skeleton variant="pill" className="h-5 w-16" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                            <div className="space-y-2.5 min-w-0 flex-1">
                                <Skeleton variant="pill" className="h-8 md:h-10 w-3/4" />
                                <div className="flex items-center gap-3">
                                    <Skeleton variant="pill" className="h-9 w-9 md:w-10 md:h-10 shrink-0" />
                                    <div className="space-y-1.5">
                                        <Skeleton variant="pill" className="h-4 w-32" />
                                        <Skeleton variant="pill" className="h-3.5 w-24" />
                                    </div>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-2 pt-2 shrink-0">
                                <Skeleton variant="pill" className="h-11 w-32" />
                                <Skeleton variant="pill" className="h-11 w-11" />
                                <Skeleton variant="pill" className="h-11 w-11" />
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
                        {/* Mobile-Only Sidebar lines */}
                        <div className="lg:hidden space-y-3">
                            <Skeleton variant="pill" className="h-3.5 w-24" />
                            <Skeleton variant="pill" className="h-4 w-1/2" />
                            <Skeleton variant="pill" className="h-4 w-3/4" />
                        </div>

                        {/* Snapshot lines */}
                        <div className="space-y-3">
                            <Skeleton variant="pill" className="h-4 w-28" />
                            <Skeleton variant="pill" className="h-3.5 w-full" />
                            <Skeleton variant="pill" className="h-3.5 w-5/6" />
                        </div>

                        {/* Description Section */}
                        <div className="space-y-3 py-2">
                            <Skeleton variant="pill" className="h-5 w-32" />
                            <div className="space-y-2.5">
                                <Skeleton variant="pill" className="h-4 w-full" />
                                <Skeleton variant="pill" className="h-4 w-full" />
                                <Skeleton variant="pill" className="h-4 w-4/5" />
                                <Skeleton variant="pill" className="h-4 w-5/6" />
                                <Skeleton variant="pill" className="h-4 w-2/3" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column (lg:col-span-2) */}
                    <aside className="hidden lg:block lg:col-span-2 space-y-4 md:space-y-6">
                        {/* Job Overview lines */}
                        <div className="space-y-4">
                            <Skeleton variant="pill" className="h-4 w-24" />
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <Skeleton variant="pill" className="w-5 h-5 shrink-0" />
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton variant="pill" className="h-3 w-16" />
                                        <Skeleton variant="pill" className="h-4 w-28" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Requirements lines */}
                        <div className="space-y-4">
                            <Skeleton variant="pill" className="h-3.5 w-24" />
                            {Array.from({ length: 2 }).map((_, index) => (
                                <div key={index} className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Skeleton variant="pill" className="w-4 h-4" />
                                        <Skeleton variant="pill" className="h-3 w-20" />
                                    </div>
                                    <Skeleton variant="pill" className="h-4 w-40" />
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
