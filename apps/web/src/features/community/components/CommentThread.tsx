'use client';

import { useState } from 'react';
import { communityApi } from '@fresherflow/api-client';
import type { CommunityPostComment } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { HelpfulButton } from './HelpfulButton';

export function CommentThread({
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
