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

// ─── Vote Button (reusable) ────────────────────────────────────────────────

function VoteButton({
    upvotes,
    myVote,
    onVote,
    onError,
}: {
    upvotes: number;
    myVote: number | null;
    onVote: (value: number) => Promise<{ upvotes: number; myVote: number | null }>;
    onError?: () => void;
}) {
    const [optimistic, setOptimistic] = useState<{ count: number; vote: number | null } | null>(null);
    const display = optimistic ?? { count: upvotes, vote: myVote };

    const handleVote = async (value: number) => {
        const prev = display;
        setOptimistic({
            count: prev.vote === value ? prev.count - 1 : prev.vote ? prev.count : prev.count + 1,
            vote: prev.vote === value ? null : value,
        });
        try {
            const result = await onVote(value);
            setOptimistic({ count: result.upvotes, vote: result.myVote });
        } catch {
            setOptimistic(null);
            onError?.();
        }
    };

    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => void handleVote(1)}
                className={cn(
                    'rounded-md px-2 py-1 text-xs font-bold transition-colors',
                    display.vote === 1
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
            >
                ▲
            </button>
            <span className="ff-min-w-2ch text-center text-xs font-semibold tabular-nums text-foreground">
                {display.count}
            </span>
            <button
                type="button"
                onClick={() => void handleVote(-1)}
                className={cn(
                    'rounded-md px-2 py-1 text-xs font-bold transition-colors',
                    display.vote === -1
                        ? 'bg-destructive/15 text-destructive'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
            >
                ▼
            </button>
        </div>
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

    const handleCommentVote = async (commentId: string, value: number) => {
        return communityApi.voteCommunityPostComment(postId, commentId, value);
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
                                <VoteButton
                                    upvotes={c.likesCount}
                                    myVote={(c.votes?.[0]?.value ?? null) as number | null}
                                    onVote={(v) => handleCommentVote(c.id, v)}
                                />
                            ) : (
                                <span className="text-xs text-muted-foreground">▲ {c.likesCount}</span>
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

    const handleVote = async (value: number) => {
        return communityApi.voteCommunityPost(postId, value);
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
                        <VoteButton
                            upvotes={post.likesCount}
                            myVote={(post.votes?.[0]?.value ?? null) as number | null}
                            onVote={handleVote}
                        />
                    ) : (
                        <span className="text-xs text-muted-foreground">▲ {post.likesCount}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                        💬 {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
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
