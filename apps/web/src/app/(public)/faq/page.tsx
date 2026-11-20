import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * The questions used to sit on the landing page as a six item block, where
 * they added a full screen of reading for a visitor who had not decided yet.
 * They live here now: a page that is only questions, linked from the end of
 * the landing page and from the footer, and quotable in search answers.
 */
const QUESTIONS: { q: string; a: string }[] = [
    {
        q: 'Is FresherFlow free to use?',
        a: 'Yes. Browsing every board, saving roles and reading discussions costs nothing, and there is no paid tier for freshers. Posting an opportunity is free too.',
    },
    {
        q: 'Do I need an account to browse jobs?',
        a: 'No. The boards are open without signing in. An account only becomes useful when you want to save roles, follow companies or set alerts.',
    },
    {
        q: 'Where do the job listings come from?',
        a: 'They are shared by the community and pulled from official company pages. Every listing links through to the original source so you can verify it before applying.',
    },
    {
        q: 'Are the walk in drives verified?',
        a: 'Each drive links to its official notification with the address, date and contact number. Check the linked source before you travel, since drives can be postponed.',
    },
    {
        q: 'Can I post a job for my company?',
        a: 'Yes. Use Contribute to submit a role or a drive. Submissions are reviewed before they appear on the public boards.',
    },
    {
        q: 'How do I report a listing that is stale?',
        a: 'Open the listing and use the report action. Reports go to the moderators who remove dead roles and keep the counts honest.',
    },
];

const TITLE = 'Frequently asked questions';
const DESCRIPTION =
    'How FresherFlow works: free to use, no account needed to browse, every listing linked to its official source, and how to post or report a role.';

export const metadata: Metadata = {
    title: { absolute: `${TITLE} | FresherFlow` },
    description: DESCRIPTION,
    alternates: { canonical: '/faq' },
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: '/faq',
        type: 'website',
    },
};

export default function FaqPage() {
    return (
        <div className="mx-auto w-full max-w-300 px-5 sm:px-8 py-10 sm:py-20">
            <h1 className="ff-h1 font-display max-w-170">Questions about the board.</h1>
            <p className="ff-body-3 mt-5 max-w-140 text-muted-foreground">
                Short answers to what people ask before they sign up. If yours is missing, ask it
                on the discussions board.
            </p>

            <dl className="mt-10 grid gap-x-12 gap-y-8 border-t border-border pt-8 sm:mt-14 sm:grid-cols-2">
                {QUESTIONS.map((item) => (
                    <div key={item.q}>
                        <dt className="ff-body-1">{item.q}</dt>
                        <dd className="ff-body-6 mt-2 text-muted-foreground">{item.a}</dd>
                    </div>
                ))}
            </dl>

            <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-border pt-8">
                <Link href="/jobs" className="ff-btn ff-btn-primary">
                    Browse jobs
                </Link>
                <Link href="/contact" className="ff-btn ff-btn-secondary">
                    Ask us directly
                </Link>
            </div>
        </div>
    );
}
