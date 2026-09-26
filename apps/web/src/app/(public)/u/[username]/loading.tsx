/**
 * Profile page skeleton — plain divs with the design-system skeleton tokens
 * (`animate-pulse` + `bg-muted`), mirroring the live page's max-w-3xl header
 * (avatar, name, headline) and content cards.
 */
export default function ProfilePageLoading() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="h-6 w-20 animate-pulse rounded-full bg-muted/60" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-muted/60" />
                    <div className="h-6 w-16 animate-pulse rounded-full bg-muted/60" />
                </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
                <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted/60" />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-16 w-full animate-pulse rounded-xl bg-muted/60" />
                <div className="h-16 w-full animate-pulse rounded-xl bg-muted/60" />
            </div>
        </main>
    );
}
