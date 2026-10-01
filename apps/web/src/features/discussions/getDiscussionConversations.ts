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
            db.ref('/commentIndex').get(),
            db.ref('/companyCommentIndex').get(),
        ]);

        const rows = [
            ...toConversations(jobIndex.val() as Record<string, RawIndex> | null, 'job'),
            ...toConversations(companyIndex.val() as Record<string, RawIndex> | null, 'company'),
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
