'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
import { EmptyState } from '@/ui/EmptyState';
import { Input } from '@/ui/Input';
import { useAuth } from '@/lib/auth/AuthContext';
import { JobDiscussionChat } from '@/features/jobs/components/discussion/JobDiscussionChat';
import {
    companyCommentsPath,
    companyIndexPath,
    jobCommentsPath,
    jobIndexPath,
    useThreadComments,
} from '@/features/jobs/hooks/useJobComments';
import type { DiscussionConversation, DiscussionJobMeta, DiscussionThreadKind } from './types';

const DATE_LABEL = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

function formatDate(value: string | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : DATE_LABEL.format(date);
}

function conversationKey(kind: DiscussionThreadKind, threadId: string): string {
    return `${kind}:${threadId}`;
}

/** One thread (job or company). Keyed by the caller so switching resets the subscription. */
function Thread({
    kind,
    threadId,
    meta,
}: {
    kind: DiscussionThreadKind;
    threadId: string;
    meta?: DiscussionJobMeta;
}) {
    const { user } = useAuth();
    // Same guest gate as the dock: `/comments` is not readable while signed out.
    // `subscribe` is true because this thread is only mounted once selected.
    const { comments, loading, error, postComment, deleteComment } = useThreadComments(
        kind === 'company' ? companyCommentsPath(threadId) : jobCommentsPath(threadId),
        kind === 'company' ? companyIndexPath(threadId) : jobIndexPath(threadId),
        Boolean(user),
        true
    );

    const isCompany = kind === 'company';
    const heading = isCompany ? 'Hiring discussion' : meta?.title ?? 'Job discussion';
    const subtitle = isCompany ? meta?.title ?? threadId : meta?.company ?? threadId;
    const href = isCompany ? `/companies/${threadId}` : `/jobs/${meta?.slug ?? threadId}`;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3">
                <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-foreground" title={heading}>
                        {heading}
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                </div>
                <div className="shrink-0">
                    <Button asChild variant="outline" size="sm">
                        <Link href={href}>{isCompany ? 'Open company' : 'Open job'}</Link>
                    </Button>
                </div>
            </header>
            <JobDiscussionChat
                comments={comments}
                loading={loading}
                error={error}
                onPost={postComment}
                onDelete={deleteComment}
                className="flex-1"
            />
        </div>
    );
}

export default function DiscussionsClient({
    conversations,
    jobs,
}: {
    conversations: DiscussionConversation[];
    jobs: Record<string, DiscussionJobMeta>;
}) {
    const [search, setSearch] = useState('');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return conversations;
        return conversations.filter((conversation) => {
            const meta = jobs[conversation.threadId];
            const haystack =
                `${meta?.title ?? ''} ${meta?.company ?? ''} ${conversation.last?.text ?? ''}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [conversations, jobs, search]);

    const selected = useMemo(
        () => conversations.find((c) => conversationKey(c.kind, c.threadId) === selectedKey) ?? null,
        [conversations, selectedKey]
    );

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="mb-5">
                <h1 className="text-2xl font-bold text-foreground">Discussions</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Every conversation sits on the job or company it is about. Ask first, and the next fresher gets an
                    answer.
                </p>
            </div>

            <div className="flex gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2" style={{ height: '70vh' }}>
                {/* Conversation list */}
                <div className={cn('flex min-h-0 w-full flex-col sm:w-72', selected && 'hidden sm:flex')}>
                    <div className="px-1 pb-2 pt-1">
                        <Input
                            variant="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search jobs and companies"
                            aria-label="Search discussions"
                        />
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex-1 px-1">
                            <EmptyState
                                icon="inbox"
                                size="md"
                                variant="ghost"
                                title={conversations.length === 0 ? 'No discussions yet' : 'No threads match'}
                                description={
                                    conversations.length === 0
                                        ? 'Open any job and start the first conversation about it.'
                                        : 'Try a different job or company name.'
                                }
                            />
                        </div>
                    ) : (
                        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-1">
                            {filtered.map((conversation) => {
                                const meta = jobs[conversation.threadId];
                                const isCompany = conversation.kind === 'company';
                                const key = conversationKey(conversation.kind, conversation.threadId);
                                const active = selectedKey === key;
                                return (
                                    <li key={key}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedKey(key)}
                                            className={cn(
                                                'w-full rounded-lg px-3 py-2.5 text-left transition-colors duration-150',
                                                active ? 'bg-muted' : 'hover:bg-muted/60'
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-semibold text-foreground">
                                                    {meta?.title ?? (isCompany ? 'Company thread' : 'Job discussion')}
                                                </span>
                                                <span className="shrink-0 text-micro text-muted-foreground">
                                                    {formatDate(conversation.last?.createdAt)}
                                                </span>
                                            </div>
                                            <span className="truncate text-xs font-medium text-muted-foreground">
                                                {isCompany ? 'Company thread' : meta?.company ?? conversation.threadId}
                                            </span>
                                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/90">
                                                {conversation.last
                                                    ? `${conversation.last.authorName}: ${conversation.last.text}`
                                                    : ''}
                                            </p>
                                            <span className="text-micro font-semibold text-muted-foreground/80">
                                                {conversation.count}{' '}
                                                {conversation.count === 1 ? 'comment' : 'comments'}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Selected thread */}
                <div
                    className={cn(
                        'min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-background',
                        selected ? 'flex flex-col' : 'hidden sm:flex sm:flex-col'
                    )}
                >
                    {selected ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setSelectedKey(null)}
                                className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:hidden"
                            >
                                <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                                All discussions
                            </button>
                            <Thread
                                key={selectedKey ?? undefined}
                                kind={selected.kind}
                                threadId={selected.threadId}
                                meta={jobs[selected.threadId]}
                            />
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center p-6">
                            <EmptyState
                                icon="inbox"
                                size="md"
                                variant="ghost"
                                title="Pick a thread"
                                description="Choose a job or company discussion on the left to read it and reply."
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
