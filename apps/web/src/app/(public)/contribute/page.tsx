import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ContributeHub } from '@/features/contribute/components/ContributeHub';
import { Skeleton } from '@/ui/Skeleton';

export const metadata: Metadata = {
    title: 'Contribute | FresherFlow',
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
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Skeleton className="h-36 w-full" />
                        <Skeleton className="h-36 w-full" />
                        <Skeleton className="h-36 w-full" />
                    </div>
                }
            >
                <ContributeHub />
            </Suspense>
        </main>
    );
}
