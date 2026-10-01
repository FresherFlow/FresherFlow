export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { RoomDetail } from '@/features/rooms/RoomDetail';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    // Title-case the slug: the raw value is lowercase and hyphenated
    // ("cse-2026"), which reads as a URL fragment in a SERP, not a page name.
    const label = slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    const title = `${label} — Fresher Community`;
    const description = `Join the ${label} community on FresherFlow — discussions, shared jobs, walk-in drives, and opportunities with other freshers.`;

    return {
        title,
        description,
        alternates: { canonical: `/community/rooms/${slug}` },
        openGraph: {
            title,
            description,
            url: `/community/rooms/${slug}`,
        },
        twitter: {
            card: 'summary',
            title,
            description,
        },
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
