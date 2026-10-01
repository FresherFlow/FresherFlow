import type { Metadata } from 'next';
import { communityApi } from '@fresherflow/api-client';
import { truncateDescription } from '@/lib/seo/seoMetrics';
import { PostDetailClient } from './_components/PostDetailClient';

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    try {
        const result = await communityApi.getCommunityPost(id);
        // A community post is user prose, so it can arrive with leading
        // whitespace, newlines, and no spaces near the cut. `truncateDescription`
        // is the shared helper that guarantees a word-boundary cut inside the
        // snippet limit; a bare `.slice(0, 160)` produced mid-word truncations
        // in the SERP description.
        const description = truncateDescription(result.post.body.replace(/\s+/g, ' ').trim());
        const title = result.post.title;
        return {
            title,
            description,
            alternates: { canonical: `/community/${id}` },
            openGraph: {
                title,
                description,
                url: `/community/${id}`,
                type: 'article',
            },
            twitter: {
                card: 'summary',
                title,
                description,
            },
        };
    } catch {
        // The page body swallows this same failure and renders a client 404 state
        // with a 200, so without `noindex` every deleted post leaves an
        // indexable "Post Not Found" page behind.
        return {
            title: 'Post Not Found',
            robots: { index: false, follow: true },
        };
    }
}

export default async function CommunityPostPage({ params }: Props) {
    const { id } = await params;
    let initialData = null;
    try {
        const result = await communityApi.getCommunityPost(id);
        initialData = result;
    } catch {
        // Will render 404 state in client
    }

    return <PostDetailClient postId={id} initialData={initialData} />;
}
