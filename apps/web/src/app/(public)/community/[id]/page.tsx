import type { Metadata } from 'next';
import { communityApi } from '@fresherflow/api-client';
import { PostDetailClient } from './_components/PostDetailClient';

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    try {
        const result = await communityApi.getCommunityPost(id);
        return {
            title: `${result.post.title} | FresherFlow Community`,
            description: result.post.body.slice(0, 160),
        };
    } catch {
        return { title: 'Post Not Found | FresherFlow' };
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
