export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { Suspense } from 'react';
import { RoomDetail } from '@/features/rooms/RoomDetail';

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

export default async function RoomDetailPage({ params }: Props) {
    const { slug } = await params;
    return (
        <main className="mx-auto max-w-4xl px-4 py-6">
            <Suspense fallback={<div className="space-y-4">
                <div className="h-12 w-48 animate-pulse rounded-lg bg-muted/40" />
                <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
                <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
            </div>}>
                <RoomDetail slug={slug} />
            </Suspense>
        </main>
    );
}
