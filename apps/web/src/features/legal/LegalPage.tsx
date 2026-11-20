import Link from 'next/link';

/**
 * Shared layout for /privacy and /terms.
 *
 * One structure, so the two pages cannot drift into different typography or
 * section rhythm. The copy is data; the layout owns measure, hierarchy and the
 * cross-link.
 */

export type LegalSection = {
    n: string;
    title: string;
    body: string;
    points?: readonly string[];
};

/** Stable in-page anchor: `04-billing-and-payments`. */
function sectionId(section: LegalSection): string {
    const slug = section.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `${section.n}-${slug}`;
}

interface LegalPageProps {
    title: string;
    intro: string;
    updated: string;
    /** Three plain sentences a reader can leave with. */
    summary: readonly string[];
    sections: readonly LegalSection[];
    contactEmail: string;
    crossLink: { href: string; label: string };
}

export function LegalPage({
    title,
    intro,
    updated,
    summary,
    sections,
    contactEmail,
    crossLink,
}: LegalPageProps) {
    return (
        <main className="mx-auto w-full max-w-280 px-5 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-16">
            <div className="flex items-center gap-2.5 font-record text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
                Legal
            </div>

            <h1 className="mt-5 ff-measure-tight font-display text-3xl font-extrabold ff-leading-display tracking-tight sm:text-4xl">
                {title}
            </h1>

            <p className="mt-3 font-record text-xs uppercase tracking-wider text-muted-foreground">
                Last updated {updated}
            </p>

            <p className="mt-5 ff-measure-intro text-base leading-relaxed text-muted-foreground text-pretty">
                {intro}
            </p>

            {/* The short version, before the long one. */}
            <section
                aria-labelledby="legal-summary"
                className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
                <h2
                    id="legal-summary"
                    className="font-record text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    In short
                </h2>
                <ul className="mt-3 space-y-2">
                    {summary.map((line) => (
                        <li
                            key={line}
                            className="flex gap-2.5 text-sm leading-relaxed text-foreground text-pretty"
                        >
                            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Desktop only: a legal page is long, and a reader who came for one
                clause should not have to scroll to find it. The rail collapses
                on small screens rather than adding another block of matter. */}
            <div className="mt-12 lg:grid lg:ff-legal-cols lg:items-start lg:gap-12">
                <nav aria-labelledby="legal-toc" className="hidden lg:sticky lg:top-24 lg:block">
                    <h2
                        id="legal-toc"
                        className="font-record text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        On this page
                    </h2>
                    <ol className="mt-3 space-y-1.5 border-l border-border">
                        {sections.map((section) => (
                            <li key={section.n}>
                                <a
                                    href={`#${sectionId(section)}`}
                                    className="-ml-px block border-l border-transparent py-0.5 pl-3 text-meta leading-snug text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                                >
                                    {section.title}
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className="border-t border-border">
                {sections.map((section) => (
                    <section
                        key={section.n}
                        id={sectionId(section)}
                        className="grid scroll-mt-24 gap-2 border-b border-border py-7 sm:ff-legal-section-cols sm:gap-6"
                    >
                        <div className="font-record text-xs font-semibold tabular-nums text-muted-foreground">
                            {section.n}
                        </div>
                        <h2 className="text-base font-semibold leading-snug text-foreground text-pretty">
                            {section.title}
                        </h2>
                        <div>
                            <p className="ff-measure-copy text-base leading-relaxed text-muted-foreground text-pretty">
                                {section.body}
                            </p>
                            {section.points ? (
                                <ul className="mt-3 ff-measure-copy list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                                    {section.points.map((point) => (
                                        <li key={point.slice(0, 32)}>{point}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    </section>
                ))}
                </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <a
                    href={`mailto:${contactEmail}`}
                    className="font-record text-xs tracking-wider text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                    {contactEmail}
                </a>
                <Link
                    href={crossLink.href}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-foreground/40"
                >
                    {crossLink.label}
                </Link>
            </div>
        </main>
    );
}
