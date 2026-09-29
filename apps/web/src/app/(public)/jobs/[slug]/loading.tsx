import { Skeleton } from '@/ui/Skeleton';

/**
 * Route-level loading state for a job detail page.
 *
 * Without this the folder had only `page.tsx`, so a click that triggered a
 * `router.push` (job cards navigate programmatically, so Next prefetches
 * nothing) left the old screen on display with zero feedback until the route
 * payload and the page's own data both resolved. Two sequential round trips,
 * no indication anything was happening.
 *
 * Deliberately NOT a full-page loader. The header, breadcrumb band and the
 * two-column geometry stay put, so the page does not visibly re-lay-out when the
 * real content swaps in — the skeletons occupy the same boxes the content will.
 * Column widths match `OpportunityDetailClient`: `lg:grid-cols-5`, content
 * spanning 3, the rail spanning 2.
 */
export default function JobDetailLoading() {
    return (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-8 md:pt-6">
            {/* Breadcrumb line — mobile only, matching the page. */}
            <div className="mb-4 flex items-center gap-1.5 md:hidden" aria-hidden="true">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-24" />
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
                {/* Content column */}
                <div className="space-y-5 lg:col-span-3">
                    {/* Hero: status pills, title, company row */}
                    <div className="flex items-center gap-2">
                        <Skeleton variant="pill" className="h-6 w-14" />
                        <Skeleton variant="pill" className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-11 w-11 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                    </div>
                    {/* Fact chips, matching the box style on the real page */}
                    <div className="flex flex-wrap gap-1.5">
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-32" />
                    </div>

                    {/* Description + list sections */}
                    <div className="space-y-2.5 pt-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-11/12" />
                        <Skeleton className="h-3 w-4/5" />
                    </div>
                    <div className="space-y-2.5 pt-4">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-10/12" />
                        <Skeleton className="h-3 w-9/12" />
                    </div>
                </div>

                {/* Rail — same width and stickiness as the real sidebar. */}
                <aside className="hidden lg:col-span-2 lg:sticky lg:top-14 lg:block">
                    <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-5">
                        {/* Apply / Save / Share row */}
                        <div className="flex gap-2">
                            <Skeleton className="h-10 flex-1" />
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-10 w-10" />
                        </div>
                        {/* Key facts */}
                        <div className="flex flex-wrap gap-1.5">
                            <Skeleton className="h-8 w-28" />
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                        {/* Status select + submit */}
                        <div className="flex items-center gap-3 border-t border-border/40 pt-4">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-10 w-40" />
                        </div>
                        <div className="border-t border-border/40 pt-4">
                            <Skeleton className="h-10 w-40" />
                        </div>
                        {/* Requirements */}
                        <div className="space-y-2.5 border-t border-border/40 pt-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-4/5" />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
