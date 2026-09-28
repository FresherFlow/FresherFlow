'use client';

import { useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { CommunityPost, CommunityPostComment } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { HelpfulButton } from './HelpfulButton';
import { CommentThread } from './CommentThread';
import { CATEGORY_LABELS } from './postCategories';

export function PostCard({
    post: initial,
    detailHref,
    canInteract = true,
}: {
    post: CommunityPost;
    detailHref?: string;
    canInteract?: boolean;
}) {
    const { user } = useAuth();
    const [post, setPost] = useState(initial);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<CommunityPostComment[]>(initial.comments ?? []);

    const handleHelpful = async () => {
        return communityApi.voteCommunityPost(post.id);
    };

    const handleCommentAdded = (comment: CommunityPostComment) => {
        setComments((prev) => [...prev, comment]);
        setPost((prev) => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
    };

    const handleCommentDeleted = (commentId: string) => {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setPost((prev) => ({ ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) }));
    };

    const canVote = canInteract && user;
    const readMoreHref = detailHref ?? `/community/${post.id}`;

    return (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
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

            {detailHref ? (
                <Link href={detailHref} className="block group">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{post.title}</h3>
                </Link>
            ) : (
                <h3 className="text-base font-bold text-foreground">{post.title}</h3>
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-3">{post.body}</p>
            {post.body.length > 200 && (
                <Link href={readMoreHref} className="text-xs font-semibold text-primary hover:underline">
                    Read more →
                </Link>
            )}

            {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-4">
                    {canVote ? (
                        <HelpfulButton
                            helpfulCount={post.likesCount}
                            isHelpful={((post.votes?.[0]?.value ?? null) as number | null) === 1}
                            onToggle={handleHelpful}
                        />
                    ) : (
                        <span className="text-xs text-muted-foreground">{post.likesCount} helpful</span>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowComments(!showComments)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
                    </button>
                </div>

            {canInteract && !user && (
                <div className="rounded-xl border border-dashed border-border bg-card p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        Sign in to{' '}
                        <a href="/login" className="font-semibold text-primary hover:underline">post</a>
                        {' · '}
                        <a href="/login" className="font-semibold text-primary hover:underline">vote</a>
                        {' · '}
                        <a href="/login" className="font-semibold text-primary hover:underline">comment</a>
                    </p>
                </div>
            )}

            {showComments && (
                <CommentThread
                    postId={post.id}
                    comments={comments}
                    onCommentAdded={handleCommentAdded}
                    onCommentDeleted={handleCommentDeleted}
                />
            )}
        </div>
    );
}
