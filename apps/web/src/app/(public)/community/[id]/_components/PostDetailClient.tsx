'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { CommunityPost, CommunityPostComment, CommunityPostResult } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';

const CATEGORY_LABELS: Record<string, string> = {
    DISCUSSION: 'Discussion',
    QUESTION: 'Questions',
    EXPERIENCE: 'Experiences',
    INTERVIEW_EXPERIENCE: 'Interviews',
    HIRING_UPDATE: 'Hiring Updates',
    REFERRAL: 'Referrals',
    UPDATE: 'Updates',
    OTHER: 'Other',
};

// ─── Helpful Button (reusable) ──────────────────────────────────────────────

function HelpfulButton({
    helpfulCount,
    isHelpful,
    onToggle,
    onError,
}: {
    helpfulCount: number;
    isHelpful: boolean;
    onToggle: () => Promise<{ helpfulCount: number; isHelpful: boolean }>;
    onError?: () => void;
}) {
    const [optimistic, setOptimistic] = useState<{ count: number; marked: boolean } | null>(null);
    const display = optimistic ?? { count: helpfulCount, marked: isHelpful };

    const handleToggle = async () => {
        const prev = display;
        setOptimistic({
            count: prev.marked ? Math.max(0, prev.count - 1) : prev.count + 1,
            marked: !prev.marked,
        });
        try {
            const result = await onToggle();
            setOptimistic({ count: result.helpfulCount, marked: result.isHelpful });
        } catch {
            setOptimistic(null);
            onError?.();
        }
    };

    return (
        <button
            type="button"
            onClick={() => void handleToggle()}
            className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                display.marked
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
        >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={display.marked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Helpful
            <span className="tabular-nums font-bold">{display.count}</span>
        </button>
    );
}

// ─── Comment Thread ─────────────────────────────────────────────────────────

function CommentThread({
    postId,
    comments,
    onCommentAdded,
    onCommentDeleted,
}: {
    postId: string;
    comments: CommunityPostComment[];
    onCommentAdded: (comment: CommunityPostComment) => void;
    onCommentDeleted: (commentId: string) => void;
}) {
    const { user } = useAuth();
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyTo, setReplyTo] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!body.trim() || submitting) return;
        setSubmitting(true);
        try {
            const comment = await communityApi.addCommunityPostComment(postId, {
                body: body.trim(),
                parentId: replyTo ?? undefined,
            });
            onCommentAdded(comment);
            setBody('');
            setReplyTo(null);
        } catch {
            // silently fail
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        try {
            await communityApi.deleteCommunityPostComment(postId, commentId);
            onCommentDeleted(commentId);
        } catch {
            // silently fail
        }
    };

    const handleCommentHelpful = async (commentId: string) => {
        return communityApi.voteCommunityPostComment(postId, commentId);
    };

    return (
        <div className="space-y-3 border-t border-border pt-3">
            {comments.map((c) => (
                <div key={c.id} className="group flex gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-foreground">
                                @{c.author.username || c.author.fullName || 'Anon'}
                            </span>
                            <span className="text-muted-foreground">
                                {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap break-words">{c.body}</p>
                        <div className="mt-1 flex items-center gap-3">
                            {user ? (
                                <HelpfulButton
                                    helpfulCount={c.likesCount}
                                    isHelpful={((c.votes?.[0]?.value ?? null) as number | null) === 1}
                                    onToggle={() => handleCommentHelpful(c.id)}
                                />
                            ) : (
                                <span className="text-xs text-muted-foreground">{c.likesCount} helpful</span>
                            )}
                            {user && (
                                <button
                                    type="button"
                                    onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                                    className="text-xs font-semibold text-muted-foreground hover:text-primary"
                                >
                                    {replyTo === c.id ? 'Cancel' : 'Reply'}
                                </button>
                            )}
                            {user && c.author.id === user.id && (
                                <button
                                    type="button"
                                    onClick={() => void handleDelete(c.id)}
                                    className="text-xs font-semibold text-destructive/60 hover:text-destructive md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {user && (
                <div className="flex gap-2">
                    {replyTo && (
                        <div className="flex items-center rounded-lg bg-muted/40 px-2 text-xs text-muted-foreground">
                            ↳ replying
                        </div>
                    )}
                    <input
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void handleSubmit();
                            }
                        }}
                        placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={submitting || !body.trim()}
                        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {submitting ? '…' : 'Send'}
                    </button>
                </div>
            )}
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
            <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
                <div className="space-y-4">
                    <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted/40" />
                    <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />
                </div>
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
