export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { Suspense } from 'react';
import { RoomDetail } from '@/features/rooms/RoomDetail';
import { Skeleton } from '@/ui/Skeleton';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    return {
        title: slug.replace(/-/g, ' '),
        description: `Join the ${slug.replace(/-/g, ' ')} community — discussions, jobs, and opportunities.`,
    };
}

function RoomPageSkeleton() {
    return (
        <div className="space-y-6" aria-hidden="true">
            <Skeleton className="h-4 w-16" />
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton variant="panel" className="h-8 w-20" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
            <div className="flex gap-4 border-b border-border">
                {['Posts', 'Jobs', 'Members'].map((label) => (
                    <Skeleton key={label} variant="tabActive" className="h-9 w-20" />
                ))}
            </div>
            <div className="space-y-3">
                {[1, 2].map((index) => (
                    <article key={index} className="rounded-xl border border-border bg-card p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton variant="pill" className="h-5 w-24" />
                            <Skeleton variant="pill" className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}

export default async function RoomDetailPage({ params }: Props) {
    const { slug } = await params;
    return (
        <main className="mx-auto max-w-4xl px-4 py-6">
            <Suspense fallback={<RoomPageSkeleton />}>
                <RoomDetail slug={slug} />
            </Suspense>
        </main>
    );
}
