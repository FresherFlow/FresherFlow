import Link from 'next/link';

/**
 * The last argument before the footer: three rules in one line each.
 *
 * This replaces the four paragraph benefits band and the three step explainer.
 * Both said the same things at length; a reader who wants the long version
 * follows the row to `/about`, which already carries the principles, the
 * origin story and the walk in policy.
 */
const CLAIMS = [
    {
        title: "Every link opens the employer's page",
        detail: 'No screenshots, no resellers, no redirect chains.',
        href: '/about',
    },
    {
        title: 'Off campus, internships, walk ins and government together',
        detail: 'Four boards, one place to check each morning.',
        href: '/jobs',
    },
    {
        title: 'Ask the people who already applied',
        detail: 'Every listing carries its own discussion.',
        href: '/community?tab=discussions',
    },
];

export function ClaimsSection() {
    return (
        <section aria-labelledby="claims-heading" className="border-b border-border">
            <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-10 sm:py-20">
                <h2 id="claims-heading" className="ff-h2 font-display max-w-[680px]">
                    Three rules the board runs on.
                </h2>

                <div className="mt-10 border-t border-border">
                    {CLAIMS.map((c) => (
                        <Link
                            key={c.title}
                            href={c.href}
                            className="grid items-baseline gap-1 border-b border-border py-6 transition-colors sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] sm:gap-12 [@media(hover:hover)_and_(pointer:fine)]:hover:text-muted-foreground"
                        >
                            <span className="ff-h5 font-display">{c.title}</span>
                            <span className="ff-body-6 text-muted-foreground">{c.detail}</span>
                        </Link>
                    ))}
                </div>

                <p className="ff-caption-2 mt-6 text-muted-foreground">
                    Still deciding?{' '}
                    <Link href="/faq" className="font-semibold text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground">
                        Read the questions
                    </Link>
                    .
                </p>

                <div className="mt-10 rounded-2xl bg-foreground px-6 py-8 text-background sm:mt-14 sm:px-10 sm:py-12">
                    <p className="ff-h5 font-display max-w-[680px]">
                        Free, open, and nothing to cancel. Start with today&apos;s openings.
                    </p>
                    <div className="mt-6">
                        <Link href="/jobs" className="ff-btn ff-btn-onink">
                            Browse jobs
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
