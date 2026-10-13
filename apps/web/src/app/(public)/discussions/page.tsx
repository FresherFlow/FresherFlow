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
// Rendered per request, never at build time.
//
// This is a live inbox: rows come from the Firebase comment indexes and change
// whenever anyone comments. Pinning it to `revalidate = false` froze the HTML
// until a feed bust and forced Next to prerender it during the static export —
// which meant the build itself had to reach RTDB. On a deployment that
// intentionally holds no Firebase service-account credentials that read can
// never succeed, so the export burned three 60s retries per page and exited:
//
//   Failed to build /(public)/discussions/page after 3 attempts.
//   Export encountered an error on /(public)/discussions/page
//
// `force-dynamic` removes the build-time read entirely. Without credentials the
// read now times out in `getDiscussionConversations` and the page renders its
// empty state; with credentials it renders live threads per request, which is
// what this route wanted anyway. `/api/revalidate` no longer needs to bust it.
export const dynamic = 'force-dynamic';

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
