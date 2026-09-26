import { Skeleton } from '@/ui/Skeleton';

function GovernmentJobCardSkeleton() {
    return (
        <article className="rounded-xl border border-border bg-card p-4 md:p-5" aria-hidden="true">
            <div className="flex items-start gap-3">
                <Skeleton variant="pill" className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
            </div>
            <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
            </div>
        </article>
    );
}

export default function GovernmentJobsLoading() {
    return (
        <div className="mx-auto w-full max-w-7xl space-y-3 px-3 py-6 md:px-6" aria-hidden="true">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <Skeleton className="h-9 w-full max-w-md" />
                <div className="hidden items-center gap-2 lg:flex">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                </div>
            </div>
            <div className="flex gap-2 overflow-hidden border-b border-border pb-3">
                {['Upcoming', 'Open', 'Results', 'Admit Cards'].map((label) => (
                    <Skeleton key={label} className="h-8 w-24 rounded-lg" />
                ))}
            </div>
            <div className="space-y-3 pt-2">
                {[1, 2, 3].map((index) => (
                    <GovernmentJobCardSkeleton key={index} />
                ))}
            </div>
        </div>
    );
}
