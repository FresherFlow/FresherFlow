export default function CommunityLoading() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <div className="space-y-2">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/40" />
                <div className="h-4 w-72 animate-pulse rounded bg-muted/30" />
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/40" />
                ))}
            </div>
        </main>
    );
}
