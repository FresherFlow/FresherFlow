export type DiscussionThreadKind = 'job' | 'company';

export interface DiscussionConversation {
    /** Which plane the thread lives on: `/comments/{id}` or `/companyComments/{id}`. */
    kind: DiscussionThreadKind;
    /** The opportunity id for a job thread, or the company slug for a company thread. */
    threadId: string;
    /** Visible comment count from the index node. */
    count: number;
    /** Newest comment, used for the row preview. */
    last: {
        text: string;
        createdAt: string;
        authorName: string;
    } | null;
}

/** Display meta resolved for a thread: job title/company, or a company name. */
export interface DiscussionJobMeta {
    title: string;
    company: string;
    slug: string;
}
