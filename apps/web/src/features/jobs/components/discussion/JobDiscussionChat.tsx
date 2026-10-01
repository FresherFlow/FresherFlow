'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Link from 'next/link';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
import { EmptyState } from '@/ui/EmptyState';
import { Skeleton } from '@/ui/Skeleton';
import { Textarea } from '@/ui/Textarea';
import type { ThreadComment, ThreadCommentAuthor } from '@/features/jobs/hooks/useJobComments';

/**
 * The discussion thread UI, shared by the job-page dock and the `/discussions`
 * inbox. Adapted from the reference chat pane (`shadcn-admin`
 * `features/chats/index.tsx`) onto this app's own `@/ui` primitives and
 * semantic tokens — the same adaptation the repo already made once in
 * `RoomPosts.tsx`.
 *
 * It is a public thread, not a private conversation: every comment is visible
 * to everyone and the left/right split only marks "yours", so the composer
 * says "Post", never "Send message".
 */

const DAY_LABEL = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const TIME_LABEL = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

function displayName(user: ThreadCommentAuthor): string {
    return user.fullName || user.username || 'Fresher';
}

function initials(user: ThreadCommentAuthor): string {
    const name = displayName(user).trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function dayKey(createdAt: string): string {
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime()) ? 'Earlier' : DAY_LABEL.format(date);
}

function DayDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 py-1" aria-hidden="true">
            <span className="h-px flex-1 bg-border/60" />
            <span className="text-micro font-semibold text-muted-foreground">{label}</span>
            <span className="h-px flex-1 bg-border/60" />
        </div>
    );
}

function MessageSkeleton() {
    return (
        <div className="space-y-4" aria-hidden="true">
            {[0, 1, 2].map((index) => (
                <div key={index} className={cn('flex gap-2.5', index % 2 === 1 && 'justify-end')}>
                    {index % 2 === 0 && <Skeleton variant="pill" className="h-8 w-8 shrink-0" />}
                    <div className="max-w-4/5 space-y-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton variant="panel" className="h-10 w-56" />
                    </div>
                </div>
            ))}
        </div>
    );
}

type Props = {
    comments: ThreadComment[];
    loading: boolean;
    error: boolean;
    onPost: (
        text: string,
        author: ThreadCommentAuthor,
        options?: { kind?: 'QUESTION'; parentId?: string | null }
    ) => Promise<boolean>;
    onDelete: (commentId: string) => Promise<void>;
    className?: string;
    style?: React.CSSProperties;
};

export function JobDiscussionChat({ comments, loading, error, onPost, onDelete, className, style }: Props) {
    const { user } = useAuth();
    const [draft, setDraft] = useState('');
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    /** Composer intent: a new question, or an answer aimed at one question. */
    const [asking, setAsking] = useState(false);
    const [answerTarget, setAnswerTarget] = useState<ThreadComment | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const currentUserId = user?.id ?? null;

    // Grouped by calendar day, oldest first, so a single long thread still reads
    // as dated messages rather than one undifferentiated column.
    const groups = useMemo(() => {
        const byDay = new Map<string, ThreadComment[]>();
        for (const comment of comments) {
            const key = dayKey(comment.createdAt);
            const existing = byDay.get(key);
            if (existing) existing.push(comment);
            else byDay.set(key, [comment]);
        }
        return Array.from(byDay.entries());
    }, [comments]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
    }, [comments.length]);

    const canPost = draft.trim().length > 0 && !posting;

    const submit = async () => {
        if (!canPost || !user) return;
        setPosting(true);
        setPostError(null);
        try {
            await onPost(
                draft,
                {
                    id: user.id,
                    fullName: user.fullName ?? null,
                    username: user.username ?? null,
                    avatarUrl: user.profile?.avatarUrl ?? null,
                },
                asking ? { kind: 'QUESTION' } : answerTarget ? { parentId: answerTarget.id } : undefined
            );
            setDraft('');
            setAsking(false);
            setAnswerTarget(null);
        } catch {
            setPostError('Could not post that. Check your connection and try again.');
        } finally {
            setPosting(false);
        }
    };

    const onDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.shiftKey) return;
        event.preventDefault();
        void submit();
    };

    const handleDelete = async (commentId: string) => {
        setDeletingId(commentId);
        try {
            await onDelete(commentId);
        } catch {
            setPostError('Could not delete that comment. Try again.');
        } finally {
            setDeletingId(null);
        }
    };

    // The mobile app hides the thread entirely while signed out, because the
    // production `/comments` rules are not guest-readable. Mirror that here so
    // a visitor is invited in rather than shown an empty, erroring thread.
    if (!user) {
        return (
            <div className={cn('flex min-h-0 flex-col items-center justify-center gap-3 px-6 text-center', className)}>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <ChatBubbleLeftRightIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Sign in to join the discussion</p>
                    <p className="text-xs text-muted-foreground">Comments on this job are visible to signed-in freshers.</p>
                </div>
                <Button asChild size="sm">
                    <Link href="/login">Sign in</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className={cn('flex min-h-0 flex-col', className)} style={style}>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {loading ? (
                    <MessageSkeleton />
                ) : error ? (
                    <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                        Could not load the discussion. Check your connection and try again.
                    </p>
                ) : comments.length === 0 ? (
                    <EmptyState
                        icon="inbox"
                        size="md"
                        variant="ghost"
                        title="No discussion yet"
                        description="Ask about the process, the pay, or the last date. The first question helps everyone after you."
                    />
                ) : (
                    groups.map(([day, dayComments]) => (
                        <div key={day} className="space-y-3">
                            <DayDivider label={day} />
                            {dayComments.map((comment) => {
                                const isOwn = currentUserId !== null && comment.user.id === currentUserId;
                                const isQuestion = comment.kind === 'QUESTION';
                                const parent = comment.parentId
                                    ? comments.find((c) => c.id === comment.parentId) ?? null
                                    : null;
                                const created = new Date(comment.createdAt);
                                const time = Number.isNaN(created.getTime()) ? '' : TIME_LABEL.format(created);

                                return (
                                    <div
                                        key={comment.id}
                                        className={cn('group flex gap-2.5', isOwn ? 'justify-end' : 'justify-start')}
                                    >
                                        {!isOwn && (
                                            <Avatar size="sm">
                                                {comment.user.avatarUrl ? (
                                                    <AvatarImage src={comment.user.avatarUrl} alt="" />
                                                ) : null}
                                                <AvatarFallback textSize="micro" textWeight="bold" tone="muted">
                                                    {initials(comment.user)}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={cn('flex flex-col gap-1', isOwn && 'items-end')} style={{ maxWidth: '82%' }}>
                                            <div className={cn('flex items-center gap-2', isOwn && 'flex-row-reverse')}>
                                                <span className="text-micro font-semibold text-muted-foreground">
                                                    {isOwn ? 'You' : displayName(comment.user)}
                                                </span>
                                                {isQuestion ? (
                                                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-micro font-bold text-primary">
                                                        Question
                                                    </span>
                                                ) : null}
                                                {time ? <span className="text-micro text-muted-foreground/70">{time}</span> : null}
                                                {isOwn && !loading && (
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDelete(comment.id)}
                                                        disabled={deletingId === comment.id}
                                                        aria-label="Delete comment"
                                                        className="text-muted-foreground/60 opacity-0 transition-opacity duration-150 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                                                    >
                                                        <TrashIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            {parent ? (
                                                <p className="line-clamp-2 rounded-md border-l-2 border-border pl-2 text-micro text-muted-foreground">
                                                    {parent.kind === 'QUESTION' ? 'Answer to: ' : 'Re: '}
                                                    {parent.text}
                                                </p>
                                            ) : null}
                                            <div
                                                className={cn(
                                                    'rounded-xl border px-3 py-2 text-sm leading-relaxed break-words',
                                                    isOwn
                                                        ? 'rounded-br-sm border-primary/20 bg-primary/10 text-foreground'
                                                        : 'rounded-bl-sm border-border bg-muted/50 text-foreground'
                                                )}
                                            >
                                                {comment.text}
                                            </div>
                                            {isQuestion && !isOwn ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAnswerTarget(comment);
                                                        setAsking(false);
                                                    }}
                                                    className="self-start text-micro font-semibold text-primary transition-colors hover:underline"
                                                >
                                                    Answer
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                }}
                className="shrink-0 border-t border-border/60 bg-card px-3 py-3"
            >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setAsking((value) => !value);
                            setAnswerTarget(null);
                        }}
                        aria-pressed={asking}
                        className={cn(
                            'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-150',
                            asking
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Ask a question
                    </button>
                    {answerTarget ? (
                        <span className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                            <span className="truncate">Answering: {answerTarget.text}</span>
                            <button
                                type="button"
                                onClick={() => setAnswerTarget(null)}
                                aria-label="Cancel answer"
                                className="shrink-0 font-bold hover:text-foreground"
                            >
                                ×
                            </button>
                        </span>
                    ) : null}
                </div>
                <div className="flex items-end gap-2">
                    <Textarea
                        rows={2}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={onDraftKeyDown}
                        maxLength={1000}
                        placeholder={asking ? 'What do you want to ask?' : answerTarget ? 'Your answer…' : 'Add a comment…'}
                        aria-label={asking ? 'Write a question' : 'Write a comment'}
                        className="min-h-0 resize-none"
                    />
                    <div className="shrink-0">
                        <Button type="submit" size="chip" disabled={!canPost}>
                            <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                            {posting ? 'Posting…' : asking ? 'Ask' : 'Post'}
                        </Button>
                    </div>
                </div>
            </form>

            {postError ? (
                <p className="border-t border-border/60 px-4 py-2 text-xs text-destructive" role="alert">
                    {postError}
                </p>
            ) : null}
        </div>
    );
}
