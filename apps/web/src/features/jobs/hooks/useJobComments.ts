'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    limitToLast,
    onValue,
    push,
    query,
    ref,
    remove,
    runTransaction,
    set,
} from 'firebase/database';
import { database } from '@/lib/api/firebase';
import { apiClient } from '@/lib/api/client';

/**
 * Thread-generic discussion data layer. The filename is historical (its first
 * consumer was the job page); the same hook now serves job threads and
 * company-level threads.
 *
 * Two reads, deliberately split by cost:
 *
 *  - a tiny `/commentIndex/{id}` node (`{ count, lastActivityAt, lastText,
 *    lastAuthor }`) that any surface can subscribe to for free, and
 *  - the thread itself, subscribed with `limitToLast(50)` ONLY while a panel is
 *    open. Before this split, the job page opened a full listener for the whole
 *    thread just to render a badge.
 *
 * Writes go to `/comments/{id}` (unchanged, so mobile keeps working) and the
 * index is updated in the same call with `runTransaction`, so concurrent
 * writers (web and mobile) cannot lose a count. RTDB transactions are the
 * reason this needs no Cloud Function to stay consistent.
 *
 * Guests never open a listener: production `/comments` rules are not
 * guest-readable, and mobile gates the same way.
 */

export interface ThreadCommentAuthor {
    id: string;
    fullName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
}

/**
 * A thread holds two kinds of post. A plain comment has no `kind`; a question
 * sets `kind: 'QUESTION'`. An answer to a specific question sets `parentId` to
 * that question's id. Both fields are optional, so every comment written before
 * this existed (and every comment mobile still writes) stays valid and reads as
 * a plain reply.
 */
export type ThreadCommentKind = 'QUESTION';

export interface ThreadComment {
    id: string;
    text: string;
    createdAt: string;
    user: ThreadCommentAuthor;
    kind?: ThreadCommentKind;
    parentId?: string | null;
}

export interface ThreadIndex {
    count?: number;
    lastActivityAt?: number;
    lastText?: string;
    lastAuthor?: string;
}

type RawComment = {
    text?: string;
    createdAt?: string;
    kind?: string;
    parentId?: string | null;
    user?: {
        id?: string;
        fullName?: string | null;
        username?: string | null;
        avatarUrl?: string | null;
    };
};

const READ_TIMEOUT_MS = 5000;
/** Bounds a single thread download. Push keys sort chronologically, so this is the newest slice. */
const THREAD_PAGE_LIMIT = 50;
const PREVIEW_MAX = 140;

export function jobCommentsPath(jobId: string): string {
    return `/comments/${jobId}`;
}

export function jobIndexPath(jobId: string): string {
    return `/commentIndex/${jobId}`;
}

export function companyCommentsPath(companyId: string): string {
    return `/companyComments/${companyId}`;
}

export function companyIndexPath(companyId: string): string {
    return `/companyCommentIndex/${companyId}`;
}

/**
 * Maps a thread's comment path onto its follow root and the coordinates the API
 * needs. Posting follows the thread you posted in, so a later reply can notify
 * you; the API reads the same node to fan out.
 */
function followPathFor(
    commentsPath: string
): { threadKind: 'job' | 'company'; threadId: string; followPath: string } | null {
    if (commentsPath.startsWith('/comments/')) {
        const threadId = commentsPath.slice('/comments/'.length);
        return { threadKind: 'job', threadId, followPath: `/commentFollows/job/${threadId}` };
    }
    if (commentsPath.startsWith('/companyComments/')) {
        const threadId = commentsPath.slice('/companyComments/'.length);
        return { threadKind: 'company', threadId, followPath: `/commentFollows/company/${threadId}` };
    }
    return null;
}

function authorName(author: ThreadCommentAuthor): string {
    return author.fullName || author.username || 'Fresher';
}

function toComments(value: unknown): ThreadComment[] {
    if (!value || typeof value !== 'object') return [];

    const rows = Object.entries(value as Record<string, RawComment>).map(([id, item]) => ({
        id,
        text: item?.text ?? '',
        createdAt: item?.createdAt ?? '',
        kind: item?.kind === 'QUESTION' ? ('QUESTION' as const) : undefined,
        parentId: item?.parentId ?? null,
        user: {
            id: item?.user?.id ?? 'unknown',
            fullName: item?.user?.fullName ?? null,
            username: item?.user?.username ?? null,
            avatarUrl: item?.user?.avatarUrl ?? null,
        },
    }));

    return rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * The tiny badge count. Safe to keep mounted: it reads one number, not the
 * thread. Returns 0 while signed out or unindexed.
 */
export function useThreadCount(indexPath: string | null, enabled: boolean): number {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!indexPath || !enabled) {
            setCount(0);
            return;
        }

        let unsubscribe = () => {};
        try {
            unsubscribe = onValue(
                ref(database, `${indexPath}/count`),
                (snapshot) => setCount(Number(snapshot.val()) || 0),
                () => {
                    // A missing index is not an error surface: the badge stays at 0.
                }
            );
        } catch {
            setCount(0);
        }

        return () => unsubscribe();
    }, [indexPath, enabled]);

    return count;
}

export function useThreadComments(
    commentsPath: string | null,
    indexPath: string | null,
    enabled: boolean,
    /** True only while the panel is open — this is the whole cost control. */
    subscribe: boolean
) {
    const [comments, setComments] = useState<ThreadComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!commentsPath || !enabled || !subscribe) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(false);

        let settled = false;
        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                setLoading(false);
            }
        }, READ_TIMEOUT_MS);

        let unsubscribe = () => {};
        try {
            unsubscribe = onValue(
                query(ref(database, commentsPath), limitToLast(THREAD_PAGE_LIMIT)),
                (snapshot) => {
                    settled = true;
                    clearTimeout(timeout);
                    setComments(toComments(snapshot.val()));
                    setLoading(false);
                },
                () => {
                    settled = true;
                    clearTimeout(timeout);
                    setError(true);
                    setLoading(false);
                }
            );
        } catch {
            settled = true;
            clearTimeout(timeout);
            setError(true);
            setLoading(false);
        }

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, [commentsPath, enabled, subscribe]);

    const postComment = useCallback(
        async (
            text: string,
            author: ThreadCommentAuthor,
            options?: { kind?: ThreadCommentKind; parentId?: string | null }
        ): Promise<boolean> => {
            if (!commentsPath || !indexPath) return false;
            const trimmed = text.trim();
            if (!trimmed) return false;

            const commentRef = push(ref(database, commentsPath));
            const commentId = commentRef.key ?? '';

            await set(commentRef, {
                text: trimmed,
                createdAt: new Date().toISOString(),
                ...(options?.kind ? { kind: options.kind } : {}),
                ...(options?.parentId ? { parentId: options.parentId } : {}),
                user: {
                    id: author.id,
                    fullName: author.fullName ?? null,
                    username: author.username ?? null,
                    avatarUrl: author.avatarUrl ?? null,
                },
            });

            await runTransaction(ref(database, indexPath), (current) => {
                const existing = (current ?? {}) as ThreadIndex;
                return {
                    ...existing,
                    count: (Number(existing.count) || 0) + 1,
                    lastActivityAt: Date.now(),
                    lastText: trimmed.slice(0, PREVIEW_MAX),
                    lastAuthor: authorName(author),
                };
            });

            // Follow this thread, then ask the API to notify the other followers.
            // Both are best-effort: the comment is already saved, so neither a
            // failed follow nor a failed fanout should fail the post.
            const follow = followPathFor(commentsPath);
            if (follow) {
                try {
                    await set(ref(database, `${follow.followPath}/${author.id}`), true);
                } catch {
                    // Ignored: following is a convenience.
                }

                try {
                    await apiClient('/api/discussions/comment-activity', {
                        method: 'POST',
                        body: JSON.stringify({
                            threadKind: follow.threadKind,
                            threadId: follow.threadId,
                            commentId,
                            excerpt: trimmed,
                        }),
                    });
                } catch {
                    // Ignored: notifications are a side channel.
                }
            }

            return true;
        },
        [commentsPath, indexPath]
    );

    const deleteComment = useCallback(
        async (commentId: string) => {
            if (!commentsPath || !indexPath) return;

            await remove(ref(database, `${commentsPath}/${commentId}`));
            await runTransaction(ref(database, indexPath), (current) => {
                const existing = (current ?? {}) as ThreadIndex;
                return { ...existing, count: Math.max(0, (Number(existing.count) || 0) - 1) };
            });
        },
        [commentsPath, indexPath]
    );

    return { comments, loading, error, postComment, deleteComment };
}
