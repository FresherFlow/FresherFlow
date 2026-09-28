export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
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
            {/* No route-level <Suspense> skeleton. RoomDetail is a client
                component that fetches in an effect, so it never suspends and a
                Suspense fallback here could not render. It owns
                RoomDetailSkeleton for its own loading state. */}
            <RoomDetail slug={slug} />
        </main>
    );
}
