import Link from 'next/link';

// The copy depends only on the reachability rule, never on the visitor or the requested
// handle, so this boundary is static and can be cached indefinitely.
//
// It must also stay free of cookies. Reading them here would opt the whole (public)/u
// branch out of ISR and into per-request rendering for every crawler hit.
export const revalidate = false;

/**
 * Rendered when `notFound()` is thrown by the profile page: the handle does not exist, or
 * the profile was never published. The API answers both identically so the copy must cover
 * both without confirming whether a handle exists.
 *
 * It deliberately does not mention any window. Publishing is permanent, and a checkpoint
 * that a working page could be mistaken for an expired one would send visitors away from a
 * URL that is perfectly fine.
 */
export default function ProfilePageNotFound() {
    return (
        <div className="flex w-full items-center justify-center bg-background px-6 py-16 text-foreground" style={{ minHeight: '70vh' }}>
            <div className="w-full max-w-lg space-y-5">
                <div className="flex items-center gap-3 font-record text-micro uppercase text-muted-foreground" style={{ letterSpacing: '0.14em' }}>
                    <span className="h-1.75 w-1.75 rounded-full bg-warning" aria-hidden />
                    Fresher profile
                    <span className="h-px flex-1 bg-border" aria-hidden />
                    <span>Not found</span>
                </div>

                <div className="space-y-3 rounded-xs border border-border bg-card p-6 md:p-8">
                    <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                        We couldn&apos;t find that fresher
                    </h1>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        No published profile lives at this handle. It may never have been published,
                        or the handle may have changed — published pages keep their link for good.
                    </p>

                    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                        <Link
                            href="/login?redirect=/account?tab=profile"
                            className="inline-flex h-10 items-center justify-center rounded-xs bg-primary px-5 text-xs font-semibold text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-px active-press-soft"
                        >
                            Sign in to publish
                        </Link>
                        <Link
                            href="/jobs"
                            className="inline-flex h-10 items-center justify-center rounded-xs border border-border bg-card px-5 text-xs font-semibold text-foreground transition-colors duration-150 ease-out hover:border-primary/40 hover:bg-muted/40"
                        >
                            Browse fresher jobs
                        </Link>
                    </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                    Is this your page? Signing in takes you straight to the publish control on your
                    profile — your handle and link stay reserved either way.
                </p>
            </div>
        </div>
    );
}
