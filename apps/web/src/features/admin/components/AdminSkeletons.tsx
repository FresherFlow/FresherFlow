import * as React from "react";
import { Skeleton } from "@/ui/Skeleton";

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
