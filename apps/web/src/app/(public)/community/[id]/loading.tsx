import { Skeleton } from '@/ui/Skeleton';

function CommentSkeleton() {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

export default function CommunityPostLoading() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6" aria-hidden="true">
            <Skeleton className="h-4 w-24" />
            <article className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton variant="pill" className="h-5 w-20" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-2/3" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Skeleton variant="pill" className="h-5 w-16" />
                    <Skeleton variant="pill" className="h-5 w-20" />
                </div>
                <div className="flex items-center gap-4 border-t border-border pt-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <div className="space-y-4 border-t border-border pt-3">
                    <CommentSkeleton />
                    <CommentSkeleton />
                    <div className="flex gap-2">
                        <Skeleton variant="panel" className="h-9 flex-1" />
                        <Skeleton variant="panel" className="h-9 w-16" />
                    </div>
                </div>
            </article>
        </main>
    );
}
