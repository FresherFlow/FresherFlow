export default function CommunityPostLoading() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <div className="h-4 w-32 animate-pulse rounded bg-muted/30" />
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted/30" />
                    <div className="h-4 w-16 animate-pulse rounded-full bg-muted/30" />
                </div>
                <div className="h-6 w-2/3 animate-pulse rounded bg-muted/40" />
                <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
                </div>
            </div>
        </main>
    );
}
