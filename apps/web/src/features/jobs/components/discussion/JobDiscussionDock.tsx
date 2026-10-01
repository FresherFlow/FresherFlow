'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    companyCommentsPath,
    companyIndexPath,
    jobCommentsPath,
    jobIndexPath,
    useThreadComments,
    useThreadCount,
} from '@/features/jobs/hooks/useJobComments';
import { JobDiscussionChat } from './JobDiscussionChat';

/**
 * The discussion dock surface, shared by job and company threads.
 *
 * Cost shape: the badge subscribes only to `/…Index/{id}/count` (one number).
 * The thread listener opens with the panel and closes with it, and is bounded
 * to the newest 50 comments. A signed-out visitor opens neither — the
 * `/comments` rules are not guest-readable, so the panel shows the invitation
 * instead.
 *
 * The file name is historical; `CompanyDiscussionDock` lives here so both
 * entry points share one surface rather than two drifting copies.
 */
function DiscussionDock({
    commentsPath,
    indexPath,
    title,
    heading,
}: {
    commentsPath: string;
    indexPath: string;
    title: string;
    heading: string;
}) {
    const [open, setOpen] = useState(false);
    const { user } = useAuth();
    const signedIn = Boolean(user);

    const count = useThreadCount(indexPath, signedIn);
    const { comments, loading, error, postComment, deleteComment } = useThreadComments(
        commentsPath,
        indexPath,
        signedIn,
        open
    );

    // The job-card Discuss link arrives as `?discuss=1`; open on arrival. Read
    // from `location` rather than `useSearchParams` so this client component
    // needs no Suspense boundary inside the statically rendered page.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (new URLSearchParams(window.location.search).get('discuss') === '1') {
            setOpen(true);
        }
    }, []);

    // One pulse when the count goes up, so a thread that just got an answer
    // reads as live without animating on every render or on the initial load.
    const [pulse, setPulse] = useState(false);
    const previousCount = useRef(count);
    useEffect(() => {
        if (count > previousCount.current) {
            setPulse(true);
            previousCount.current = count;
            const timer = setTimeout(() => setPulse(false), 700);
            return () => clearTimeout(timer);
        }
        previousCount.current = count;
        return undefined;
    }, [count]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={count > 0 ? `Open ${heading.toLowerCase()} (${count} comments)` : `Open ${heading.toLowerCase()}`}
                    className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none lg:bottom-6 lg:right-6"
                >
                    {pulse && (
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 rounded-full bg-primary/40 animate-ping motion-reduce:animate-none"
                        />
                    )}
                    <ChatBubbleLeftRightIcon className="relative h-6 w-6" aria-hidden="true" />
                    {count > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-foreground px-1 text-micro font-bold text-background">
                            {count > 99 ? '99+' : count}
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent
                side="top"
                align="end"
                sideOffset={12}
                className="w-[min(92vw,380px)] overflow-hidden p-0"
            >
                <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3">
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-foreground">{heading}</h2>
                        <p className="truncate text-xs text-muted-foreground" title={title}>
                            {title}
                        </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {count} {count === 1 ? 'comment' : 'comments'}
                    </span>
                </header>

                <JobDiscussionChat
                    comments={comments}
                    loading={loading}
                    error={error}
                    onPost={postComment}
                    onDelete={deleteComment}
                    className="h-[min(60vh,420px)]"
                />
            </PopoverContent>
        </Popover>
    );
}

/** Job threads: `/comments/{jobId}`. */
export function JobDiscussionDock({
    opportunityId,
    jobTitle,
}: {
    opportunityId: string;
    jobTitle: string;
}) {
    return (
        <DiscussionDock
            commentsPath={jobCommentsPath(opportunityId)}
            indexPath={jobIndexPath(opportunityId)}
            title={jobTitle}
            heading="Discussion"
        />
    );
}

/**
 * Company threads: `/companyComments/{companySlug}`.
 *
 * A company thread outlives any single listing, which is the point — the
 * hiring-process talk for a company continues after the job that started it
 * expires and is no longer linked.
 */
export function CompanyDiscussionDock({
    companySlug,
    companyName,
}: {
    companySlug: string;
    companyName: string;
}) {
    return (
        <DiscussionDock
            commentsPath={companyCommentsPath(companySlug)}
            indexPath={companyIndexPath(companySlug)}
            title={companyName}
            heading="Hiring discussion"
        />
    );
}
