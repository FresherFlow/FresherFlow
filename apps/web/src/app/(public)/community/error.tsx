'use client';

export default function CommunityError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-3">
                <h2 className="text-sm font-bold text-foreground">Something went wrong</h2>
                <p className="text-xs text-muted-foreground">
                    Could not load the community page. Please try again.
                </p>
                <button
                    type="button"
                    onClick={() => reset()}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
                >
                    Retry
                </button>
            </div>
        </main>
    );
}
