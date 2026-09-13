'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { communityApi } from '@fresherflow/api-client';
import { CommentType, CommentVoteValue, ReportReason } from '@fresherflow/types';
import type { CommunityComment, CommentListResult } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';
import { SignalsPanel } from './SignalsPanel';
import { ProvenanceStrip } from './ProvenanceStrip';

const COMMENT_TYPES: { key: CommentType; label: string }[] = [
    { key: CommentType.GENERAL, label: 'General' },
    { key: CommentType.QUESTION, label: 'Question' },
    { key: CommentType.EXPERIENCE, label: 'Experience' },
    { key: CommentType.UPDATE, label: 'Update' },
    { key: CommentType.WARNING, label: 'Warning' },
];

const REPORT_REASONS: { key: ReportReason; label: string }[] = [
    { key: ReportReason.SPAM, label: 'Spam' },
    { key: ReportReason.INACCURATE, label: 'Inaccurate' },
    { key: ReportReason.EXPIRED, label: 'Expired' },
    { key: ReportReason.OFFENSIVE, label: 'Offensive' },
    { key: ReportReason.OTHER, label: 'Other' },
];

type Props = {
    opportunityIdOrSlug: string;
    postedByUsername?: string | null;
    postedAt?: string | Date | null;
    sourceLink?: string | null;
};

export function DiscussionSection({
    opportunityIdOrSlug,
    postedByUsername,
    postedAt,
    sourceLink,
}: Props) {
    const pathname = usePathname();
    const { user } = useAuth();
    const [data, setData] = useState<CommentListResult>({ comments: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [text, setText] = useState('');
    const [commentType, setCommentType] = useState<CommentType>(CommentType.GENERAL);
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [reportTarget, setReportTarget] = useState<string | null>(null);

    const loginHref = `/login?next=${encodeURIComponent(pathname || `/jobs/${opportunityIdOrSlug}`)}`;

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listComments(opportunityIdOrSlug);
            setData(result);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [opportunityIdOrSlug]);

    useEffect(() => {
        void load();
    }, [load]);

    const submit = async () => {
        const trimmed = text.trim();
        if (!trimmed || trimmed.length > 500) {
            setFormError('Your comment must be between 1 and 500 characters.');
            return;
        }
        setPosting(true);
        setFormError(null);
        try {
            await communityApi.postComment(opportunityIdOrSlug, {
                text: trimmed,
                commentType,
                parentCommentId: replyTo ?? undefined,
            });
            setText('');
            setReplyTo(null);
            setCommentType(CommentType.GENERAL);
            await load();
        } catch (e) {
            setFormError(e instanceof Error ? e.message : 'Could not post your comment.');
        } finally {
            setPosting(false);
        }
    };

    const vote = async (commentId: string, value: CommentVoteValue) => {
        try {
            await communityApi.voteComment(opportunityIdOrSlug, commentId, value);
            await load();
        } catch {
            /* keep the current tree on failure */
        }
    };

    const remove = async (commentId: string) => {
        try {
            await communityApi.deleteComment(opportunityIdOrSlug, commentId);
            await load();
        } catch {
            /* keep the current tree on failure */
        }
    };

    const report = async (commentId: string, reason: ReportReason) => {
        try {
            await communityApi.createCommentReport(opportunityIdOrSlug, commentId, { reason });
        } finally {
            setReportTarget(null);
        }
    };

    const renderComment = (comment: CommunityComment) => (
        <div key={comment.id} className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-foreground">
                    @{comment.user.username || comment.user.fullName || 'user'}
                </span>
                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {comment.commentType}
                </span>
                <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{comment.text}</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <button
                    type="button"
                    onClick={() => void vote(comment.id, CommentVoteValue.UPVOTE)}
                    className={cn('font-semibold hover:text-primary', comment.myVote === 'UPVOTE' && 'text-primary')}
                >
                    ▲ {comment.upvotes}
                </button>
                <button
                    type="button"
                    onClick={() => void vote(comment.id, CommentVoteValue.DOWNVOTE)}
                    className={cn('font-semibold hover:text-primary', comment.myVote === 'DOWNVOTE' && 'text-primary')}
                >
                    ▼ {comment.downvotes}
                </button>
                {user && (
                    <button
                        type="button"
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                        className="font-semibold hover:text-primary"
                    >
                        Reply
                    </button>
                )}
                {user?.id === comment.user.id && (
                    <button
                        type="button"
                        onClick={() => void remove(comment.id)}
                        className="font-semibold hover:text-destructive"
                    >
                        Delete
                    </button>
                )}
                {user && user.id !== comment.user.id && (
                    <button
                        type="button"
                        onClick={() => setReportTarget(reportTarget === comment.id ? null : comment.id)}
                        className="font-semibold hover:text-primary"
                    >
                        Report
                    </button>
                )}
            </div>
            {reportTarget === comment.id && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {REPORT_REASONS.map(reason => (
                        <button
                            key={reason.key}
                            type="button"
                            onClick={() => void report(comment.id, reason.key)}
                            className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted/40"
                        >
                            {reason.label}
                        </button>
                    ))}
                </div>
            )}
            {comment.replies.length > 0 && (
                <div className="ml-4 space-y-3 border-l border-border/50 pl-3">
                    {comment.replies.map(renderComment)}
                </div>
            )}
        </div>
    );

    return (
        <section id="discussion" className="space-y-5 py-3 border-t border-border/40">
            <ProvenanceStrip
                postedByUsername={postedByUsername}
                postedAt={postedAt}
                sourceLink={sourceLink}
            />

            <SignalsPanel opportunityIdOrSlug={opportunityIdOrSlug} />

            <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                    Discussion{data.total > 0 ? ` (${data.total})` : ''}
                </h3>

                {user ? (
                    <div className="space-y-2">
                        {replyTo && (
                            <p className="text-[11px] text-muted-foreground">
                                Replying to a comment.{' '}
                                <button type="button" onClick={() => setReplyTo(null)} className="font-semibold text-primary hover:underline">
                                    Cancel
                                </button>
                            </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                            {COMMENT_TYPES.map(type => (
                                <button
                                    key={type.key}
                                    type="button"
                                    onClick={() => setCommentType(type.key)}
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
                                        commentType === type.key
                                            ? 'border-primary/30 bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:bg-muted/40'
                                    )}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="Share what you know about this opening…"
                            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {formError && <p className="text-[11px] text-destructive">{formError}</p>}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{text.length}/500</span>
                            <button
                                type="button"
                                onClick={() => void submit()}
                                disabled={posting || text.trim().length === 0}
                                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                            >
                                {posting ? 'Posting…' : replyTo ? 'Reply' : 'Post'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                        <Link href={loginHref} className="font-semibold text-primary hover:underline">
                            Sign in
                        </Link>{' '}
                        to join the discussion.
                    </div>
                )}

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
                        Could not load the discussion.{' '}
                        <button type="button" onClick={() => void load()} className="font-semibold text-primary hover:underline">
                            Retry
                        </button>
                    </div>
                ) : data.comments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
                        Be the first to discuss this job.
                    </div>
                ) : (
                    <div className="space-y-4">{data.comments.map(renderComment)}</div>
                )}
            </div>
        </section>
    );
}
