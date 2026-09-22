import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Contact FresherFlow',
    description: 'Contact FresherFlow for support, feedback, listing questions, or collaboration.',
    alternates: {
        canonical: '/contact',
    },
};

/**
 * Contact — homepage design language: mono eyebrow, Bricolage headline,
 * sharp 2px-corner hairline cards, no rounded-2xl/3xl blobs.
 */
const contactItems = [
    {
        title: 'General support',
        value: 'support@fresherflow.in',
        href: 'mailto:support@fresherflow.in',
        note: 'For login problems, listing issues, and general platform questions.',
    },
    {
        title: 'Business & partnerships',
        value: 'hello@fresherflow.in',
        href: 'mailto:hello@fresherflow.in',
        note: 'For hiring partnerships, sourcing, and collaboration requests.',
    },
] as const;

export default function ContactPage() {
    return (
        <main className="mx-auto w-full max-w-280 px-6 pb-24 pt-16">
            <div className="flex items-center gap-2.5 font-record text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-1.75 w-1.75 rounded-full bg-warning" aria-hidden />
                Contact us
            </div>

            <h1 className="mt-6 max-w-xs font-display text-4xl font-extrabold leading-none tracking-tight">
                Reach the FresherFlow team.
            </h1>

            <p className="mt-5 max-w-prose text-base leading-relaxed text-muted-foreground">
                If something is broken, unclear, or missing, tell us. If you want to
                work with us, tell us that too. We would rather hear specific feedback
                than let users get stuck.
            </p>

            {/* contact cards — sharp hairline boxes */}
            <div className="mt-12 grid gap-px border border-border bg-border sm:grid-cols-2">
                {contactItems.map((item) => (
                    <a
                        key={item.title}
                        href={item.href}
                        className="group bg-card p-6 transition-colors hover:bg-muted/40"
                    >
                        <div className="font-record text-xs uppercase tracking-widest text-muted-foreground">
                            {item.title}
                        </div>
                        <div className="mt-3 break-all text-base font-bold text-foreground group-hover:text-warning">
                            {item.value}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.note}</p>
                    </a>
                ))}
            </div>

            {/* fastest paths — same hairline grid */}
            <div className="mt-14">
                <div className="font-record text-xs uppercase tracking-widest text-muted-foreground">
                    Faster inside the product
                </div>
                <div className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-2">
                    <Link href="/account?tab=feedback" className="group bg-card px-6 py-5 transition-colors hover:bg-muted/40">
                        <div className="text-sm font-bold text-foreground group-hover:text-warning">
                            Feedback page
                        </div>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Share bugs, missing features, or product suggestions directly.
                        </p>
                    </Link>
                    <Link href="/contribute" className="group bg-card px-6 py-5 transition-colors hover:bg-muted/40">
                        <div className="text-sm font-bold text-foreground group-hover:text-warning">
                            Submit a job link
                        </div>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Send us roles you want reviewed and added to the platform.
                        </p>
                    </Link>
                </div>
            </div>
        </main>
    );
}
