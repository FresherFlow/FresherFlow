'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { CommunityPost, CommunityPostComment, CommunityPostResult } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { Skeleton } from '@/ui/Skeleton';
import { HelpfulButton } from '@/features/community/components/HelpfulButton';
import { CommentThread } from '@/features/community/components/CommentThread';
import { CATEGORY_LABELS } from '@/features/community/components/postCategories';

function PostDetailSkeleton() {
    return (
        <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-4 w-24" />
            <article className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton variant="pill" className="h-5 w-20" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-2/3" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Skeleton variant="pill" className="h-5 w-16" />
                    <Skeleton variant="pill" className="h-5 w-20" />
                </div>
                <div className="flex items-center gap-4 border-t border-border pt-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <div className="space-y-4 border-t border-border pt-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-3 w-11/12" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton variant="panel" className="h-9 flex-1" />
                        <Skeleton variant="panel" className="h-9 w-16" />
                    </div>
                </div>
            </article>
        </div>
    );
}

// ─── Main Detail Client ─────────────────────────────────────────────────────

export function PostDetailClient({
    postId,
    initialData,
}: {
    postId: string;
    initialData: CommunityPostResult | null;
}) {
    const { user } = useAuth();
    const [post, setPost] = useState<CommunityPost | null>(initialData?.post ?? null);
    const [comments, setComments] = useState<CommunityPostComment[]>(initialData?.comments ?? []);
    const [totalComments, setTotalComments] = useState(initialData?.totalComments ?? 0);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState(!initialData);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.getCommunityPost(postId);
            setPost(result.post);
            setComments(result.comments);
            setTotalComments(result.totalComments);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        if (!initialData) void load();
    }, [initialData, load]);

    const handleHelpful = async () => {
        return communityApi.voteCommunityPost(postId);
    };

    const handleCommentAdded = (comment: CommunityPostComment) => {
        setComments((prev) => [...prev, comment]);
        setTotalComments((prev) => prev + 1);
    };

    const handleCommentDeleted = (commentId: string) => {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setTotalComments((prev) => Math.max(0, prev - 1));
    };

    if (loading) {
        return (
            <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
                <PostDetailSkeleton />
            </main>
        );
    }

    if (error || !post) {
        return (
            <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    Post not found.{' '}
                    <a href="/community" className="font-semibold text-primary hover:underline">
                        Back to community
                    </a>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <Link href="/community" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                ← Back to community
            </Link>

            <article className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-foreground">
                        @{post.author.username || post.author.fullName || 'Anonymous'}
                    </span>
                    <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        {CATEGORY_LABELS[post.category] || post.category}
                    </span>
                    <span className="text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                </div>

                <h1 className="text-xl font-bold text-foreground">{post.title}</h1>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{post.body}</p>

                {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {post.sourceOpportunityId && (
                    <a
                        href={`/jobs/${post.sourceOpportunityId}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                        View original opportunity →
                    </a>
                )}

                <div className="flex items-center gap-4 border-t border-border pt-3">
                    {user ? (
                        <HelpfulButton
                            helpfulCount={post.likesCount}
                            isHelpful={((post.votes?.[0]?.value ?? null) as number | null) === 1}
                            onToggle={handleHelpful}
                        />
                    ) : (
                        <span className="text-xs text-muted-foreground">{post.likesCount} helpful</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                         {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                    </span>
                </div>

                <CommentThread
                    postId={post.id}
                    comments={comments}
                    onCommentAdded={handleCommentAdded}
                    onCommentDeleted={handleCommentDeleted}
                />
            </article>
        </main>
    );
}
