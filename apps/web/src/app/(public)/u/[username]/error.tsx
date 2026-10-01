'use client';

export default function ProfilePageError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    // The digest is the only thing that ties this render to a server log line, so it is
    // surfaced instead of swallowed; the message itself stays generic for the visitor.
    if (error.digest) {
        console.error('[profile-page] render failed', error.digest);
    }

    return (
        <div className="flex w-full items-center justify-center bg-background px-6 py-16 text-foreground" style={{ minHeight: '60vh' }}>
            <div className="w-full max-w-md space-y-4 rounded-xs border border-border bg-card p-8">
                <p className="font-record text-micro uppercase text-muted-foreground" style={{ letterSpacing: '0.14em' }}>
                    Something broke
                </p>
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                    Could not load this profile
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    There was a connection error. The page may be back in a moment.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="inline-flex h-9 items-center justify-center rounded-xs bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-px active-press-soft"
                    >
                        Try again
                    </button>
                    <a
                        href="/jobs"
                        className="inline-flex h-9 items-center justify-center rounded-xs border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors duration-150 ease-out hover:border-primary/40 hover:bg-muted/40"
                    >
                        Browse fresher jobs
                    </a>
                </div>
            </div>
        </div>
    );
}
