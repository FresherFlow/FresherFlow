import Link from 'next/link';
import { PROFILE_PAGE_ACTIVE_DAYS } from '@fresherflow/utils';
import { EmptyState } from '@/ui/EmptyState';

// The copy depends only on the activation rule, never on the visitor or the requested
// handle, so this boundary is static and can be cached indefinitely.
//
// It must also stay free of cookies. Reading them here would opt the whole (public)/u
// branch out of ISR and into per-request rendering for every crawler hit.
export const revalidate = false;

/**
 * Rendered when `notFound()` is thrown by the profile page. That happens in two cases the
 * API deliberately answers identically — an unknown handle, and a page whose
 * PROFILE_PAGE_ACTIVE_DAYS activation window has lapsed — so the copy has to cover both
 * without confirming whether a handle exists. The owner still needs a way back, which is
 * what the CTA is for.
 */
export default function ProfilePageNotFound() {
    return (
        <div className="min-h-dvh bg-background px-4 py-16 text-foreground md:px-6">
            <div className="mx-auto flex max-w-lg flex-col justify-center space-y-5">
                <EmptyState
                    icon="inbox"
                    size="md"
                    title="This profile page isn't live right now"
                    description={`Fresher profile pages stay online ${PROFILE_PAGE_ACTIVE_DAYS} days at a time. This one has either not been activated yet, or its activation window has ended.`}
                    action={
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link
                                href="/login?redirect=/account?tab=profile"
                                className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                            >
                                Sign in to reactivate
                            </Link>
                            <Link
                                href="/jobs"
                                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                            >
                                Browse opportunities
                            </Link>
                        </div>
                    }
                />
                <p className="text-center text-xs font-medium leading-relaxed text-muted-foreground">
                    Is this your page? Signing in takes you straight to the activation control on your
                    profile — your handle and link stay reserved either way.
                </p>
            </div>
        </div>
    );
}
