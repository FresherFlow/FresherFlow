import type { Metadata } from 'next';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { getDiscussionConversations } from '@/features/discussions/getDiscussionConversations';
import DiscussionsClient from '@/features/discussions/DiscussionsClient';
import type { DiscussionJobMeta } from '@/features/discussions/types';

/**
 * The inbox: one row per job or company that has a discussion, opening the same
 * thread the dock shows. Conversations come from the two Firebase comment
 * indexes; the feed only supplies titles for the job ids that appear, and a
 * company thread is titled from its slug (the directory read is not worth a
 * round-trip just for a label).
 */
export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Discussions',
    description:
        'Ask about a job, read what other freshers found, and keep every conversation on the listing or company it belongs to.',
    alternates: {
        canonical: '/discussions',
    },
};

function prettifyCompanyName(slug: string): string {
    return slug
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export default async function DiscussionsPage() {
    const [conversations, feed] = await Promise.all([
        getDiscussionConversations(),
        fetchFeedIndex(),
    ]);

    const wantedJobIds = new Set(
        conversations.filter((conversation) => conversation.kind === 'job').map((conversation) => conversation.threadId)
    );
    const wantedCompanySlugs = new Set(
        conversations
            .filter((conversation) => conversation.kind === 'company')
            .map((conversation) => conversation.threadId)
    );

    const jobs: Record<string, DiscussionJobMeta> = {};

    for (const opportunity of feed?.opportunities ?? []) {
        const id = opportunity.id;
        const slug = opportunity.slug || opportunity.id;
        if (!id || !slug) continue;
        if (!wantedJobIds.has(id) && !wantedJobIds.has(slug)) continue;

        const meta: DiscussionJobMeta = {
            title: opportunity.title,
            company: opportunity.company,
            slug,
        };
        // Index by both keys: a thread may be stored under the id or the slug.
        jobs[id] = meta;
        jobs[slug] = meta;
    }

    for (const companySlug of wantedCompanySlugs) {
        jobs[companySlug] = {
            title: prettifyCompanyName(companySlug),
            company: 'Company thread',
            slug: companySlug,
        };
    }

    return <DiscussionsClient conversations={conversations} jobs={jobs} />;
}
