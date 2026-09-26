import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ContributeHub } from '@/features/contribute/components/ContributeHub';
import { Skeleton } from '@/ui/Skeleton';

export const metadata: Metadata = {
    title: 'Contribute',
    description:
        'Share a job, walk-in drive, or interview experience with other freshers. Reviewed before it goes live.',
};

export default function ContributePage() {
    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12 space-y-8">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Contribute</h1>
                <p className="text-sm text-muted-foreground">
                    Pick what you are sharing below — everything happens right here, nothing navigates away.
                </p>
            </header>
            <Suspense
                fallback={
                    // Mirrors the real ContributeHub layout: the 5 contribution
                    // cards in the same responsive grid, then the
                    // "Your contributions" heading, action and history rows.
                    <div className="space-y-10" aria-hidden>
                        <section className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-6 w-44" />
                                <Skeleton className="h-8 w-32" />
                            </div>
                            <div className="space-y-3">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        </section>
                    </div>
                }
            >
                <ContributeHub />
            </Suspense>
        </main>
    );
}
