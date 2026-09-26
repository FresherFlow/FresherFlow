'use client';

export default function ProfilePageError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-3">
                <h2 className="text-sm font-bold text-foreground">Could not load this profile</h2>
                <p className="text-xs text-muted-foreground">
                    There was a connection error. The page may be back in a moment.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
                    >
                        Retry
                    </button>
                    <a
                        href="/jobs"
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-muted/40"
                    >
                        Back to jobs
                    </a>
                </div>
            </div>
        </main>
    );
}
