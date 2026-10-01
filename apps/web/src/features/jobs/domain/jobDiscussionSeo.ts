import app from '@/lib/firebase/admin';
import { getDatabase } from 'firebase-admin/database';

/**
 * Reads just enough of a job's discussion to emit structured data.
 *
 * Two outputs from one read:
 *
 *  - `comments` — the newest few posts, for a `DiscussionForumPosting` node.
 *  - `faqs` — only questions that actually have an answer, for a `FAQPage`.
 *
 * The FAQ half is deliberately strict. A question with no reply is not an FAQ
 * entry; pairing a question with an unrelated comment would be fabricated
 * structured data. A pair is emitted only when a comment carries `parentId`
 * equal to the question's id — i.e. someone explicitly answered it.
 */

export interface DiscussionSeoComment {
    author: string;
    text: string;
    createdAt: string;
}

export interface DiscussionSeoFaq {
    question: string;
    answer: string;
}

export interface DiscussionSeoData {
    comments: DiscussionSeoComment[];
    faqs: DiscussionSeoFaq[];
    total: number;
}

/** Wide enough that a question and its answer usually land in the same window. */
const MAX_COMMENTS = 20;
const MAX_TEXT = 300;

type RawComment = {
    text?: string;
    createdAt?: string;
    kind?: string;
    parentId?: string | null;
    user?: { fullName?: string | null; username?: string | null };
};

function authorOf(item: RawComment): string {
    return item.user?.fullName || item.user?.username || 'Fresher';
}

export async function getJobDiscussionForSeo(jobId: string): Promise<DiscussionSeoData | null> {
    if (!jobId) return null;

    try {
        const db = getDatabase(app);

        const indexSnapshot = await db.ref(`/commentIndex/${jobId}`).get();
        const total = Number((indexSnapshot.val() as { count?: number } | null)?.count) || 0;
        if (total <= 0) return null;

        const commentsSnapshot = await db.ref(`/comments/${jobId}`).limitToLast(MAX_COMMENTS).get();
        const raw = commentsSnapshot.val() as Record<string, RawComment> | null;
        if (!raw) return null;

        const entries = Object.entries(raw)
            .filter(([, item]) => Boolean(item) && typeof item?.text === 'string' && item.text.length > 0)
            .map(([id, item]) => ({ id, item }))
            .sort(
                (a, b) =>
                    new Date(a.item.createdAt ?? 0).getTime() - new Date(b.item.createdAt ?? 0).getTime()
            );

        if (entries.length === 0) return null;

        const comments: DiscussionSeoComment[] = entries.map(({ item }) => ({
            author: authorOf(item),
            text: (item.text ?? '').slice(0, MAX_TEXT),
            createdAt: item.createdAt || new Date().toISOString(),
        }));

        // First explicit answer wins; a second answer to the same question does
        // not replace it, so the accepted answer stays stable between renders.
        const firstAnswerByQuestion = new Map<string, RawComment>();
        for (const { item } of entries) {
            if (item.parentId && !firstAnswerByQuestion.has(item.parentId)) {
                firstAnswerByQuestion.set(item.parentId, item);
            }
        }

        const faqs: DiscussionSeoFaq[] = entries
            .filter(({ item }) => item.kind === 'QUESTION')
            .map(({ id, item }) => {
                const answer = firstAnswerByQuestion.get(id);
                if (!answer) return null;
                return {
                    question: (item.text ?? '').slice(0, MAX_TEXT),
                    answer: (answer.text ?? '').slice(0, MAX_TEXT),
                };
            })
            .filter((faq): faq is DiscussionSeoFaq => faq !== null);

        return { comments, faqs, total };
    } catch {
        // Structured data is an enhancement: an unreachable RTDB must not fail
        // the page render.
        return null;
    }
}
