import app from '@/lib/firebase/admin';
import { getDatabase } from 'firebase-admin/database';
import type { DiscussionConversation, DiscussionThreadKind } from './types';

/**
 * Builds the `/discussions` inbox from the comment indexes.
 *
 * Two tiny roots — `/commentIndex` (job threads) and `/companyCommentIndex`
 * (company threads) — so the read stays small and can be ranked by real
 * activity without downloading a single thread. A thread absent from its index
 * (written before the index existed, by a client that does not write it) is
 * simply not listed; the index is a convenience, never the thread body.
 */

const MAX_CONVERSATIONS = 120;

/**
 * Upper bound on the RTDB read.
 *
 * The `catch` below cannot save us on its own. When the service-account
 * credentials are absent — which is the correct state for a client-facing
 * deployment that has no business holding an admin key — the Admin SDK does not
 * reject promptly. It retries credential discovery with backoff and the promise
 * stays pending for the better part of a minute.
 *
 * That turns a missing dependency into a build failure instead of an empty
 * inbox: the static export calls this while rendering `/discussions`, the read
 * outlasts Next's 60s per-page budget, and the page is retried three times
 * before the whole build exits:
 *
 *   Failed to build /(public)/discussions/page (attempt 1 of 3)
 *   because it took more than 60 seconds
 *
 * Racing the read against a timer makes the degradation immediate and bounded:
 * no credentials, a slow network, or an unreachable database all render the
 * empty state in a few seconds rather than stalling the build.
 */
const READ_TIMEOUT_MS = 4000;

function withTimeout<T>(read: Promise<T>, fallback: T): Promise<T> {
    return Promise.race([
        read.catch(() => fallback),
        new Promise<T>((resolve) => {
            setTimeout(() => resolve(fallback), READ_TIMEOUT_MS);
        }),
    ]);
}

type RawIndex = {
    count?: number;
    lastActivityAt?: number;
    lastText?: string;
    lastAuthor?: string;
};

function toConversations(
    root: Record<string, RawIndex> | null,
    kind: DiscussionThreadKind
): DiscussionConversation[] {
    if (!root) return [];

    const rows: DiscussionConversation[] = [];

    for (const [threadId, item] of Object.entries(root)) {
        const count = Number(item?.count) || 0;
        if (count <= 0) continue;

        const lastActivityAt = Number(item?.lastActivityAt) || 0;

        rows.push({
            kind,
            threadId,
            count,
            last:
                lastActivityAt || item?.lastText
                    ? {
                          text: item?.lastText ?? '',
                          createdAt: lastActivityAt ? new Date(lastActivityAt).toISOString() : '',
                          authorName: item?.lastAuthor || 'Fresher',
                      }
                    : null,
        });
    }

    return rows;
}

export async function getDiscussionConversations(): Promise<DiscussionConversation[]> {
    try {
        const db = getDatabase(app);
        const [jobIndex, companyIndex] = await Promise.all([
            withTimeout(db.ref('/commentIndex').get(), null),
            withTimeout(db.ref('/companyCommentIndex').get(), null),
        ]);

        const rows = [
            ...toConversations(jobIndex?.val() as Record<string, RawIndex> | null, 'job'),
            ...toConversations(companyIndex?.val() as Record<string, RawIndex> | null, 'company'),
        ];

        rows.sort(
            (a, b) => new Date(b.last?.createdAt ?? 0).getTime() - new Date(a.last?.createdAt ?? 0).getTime()
        );

        return rows.slice(0, MAX_CONVERSATIONS);
    } catch {
        // A discussion inbox is not worth failing the page for: an unreachable
        // RTDB renders the empty state instead of a 500.
        return [];
    }
}
