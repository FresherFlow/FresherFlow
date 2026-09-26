import { Skeleton } from '@/ui/Skeleton';

const COMMUNITY_TABS = [
    { label: 'Discussions', width: 'w-24' },
    { label: 'Referrals', width: 'w-20' },
    { label: 'Salary & Offers', width: 'w-28' },
    { label: 'Rooms', width: 'w-16' },
    { label: 'Saved Searches', width: 'w-28' },
];

function CommunityPostSkeleton() {
    return (
        <article className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton variant="pill" className="h-5 w-20" />
                <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
                <Skeleton variant="pill" className="h-5 w-16" />
                <Skeleton variant="pill" className="h-5 w-20" />
            </div>
            <div className="flex items-center gap-4 pt-1">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
            </div>
        </article>
    );
}

export default function CommunityLoading() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6" aria-hidden="true">
            <header className="space-y-3">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-muted/40 p-1">
                    {COMMUNITY_TABS.map((tab) => (
                        <Skeleton key={tab.label} variant="panel" className={`h-7 ${tab.width}`} />
                    ))}
                </div>
            </header>
            <div className="space-y-4">
                {[1, 2, 3].map((index) => (
                    <CommunityPostSkeleton key={index} />
                ))}
            </div>
        </main>
    );
}
