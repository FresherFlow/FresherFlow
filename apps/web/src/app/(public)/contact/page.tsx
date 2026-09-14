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
        <main className="mx-auto w-full max-w-[1120px] px-6 pb-24 pt-16">
            <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                Contact us
            </div>

            <h1 className="mt-6 max-w-[18ch] font-display text-[clamp(34px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.025em]">
                Reach the FresherFlow team.
            </h1>

            <p className="mt-5 max-w-[58ch] text-[15.5px] leading-relaxed text-muted-foreground">
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
                        <div className="font-record text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {item.title}
                        </div>
                        <div className="mt-3 break-all text-[17px] font-bold text-foreground group-hover:text-[var(--ff-accent)]">
                            {item.value}
                        </div>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{item.note}</p>
                    </a>
                ))}
            </div>

            {/* fastest paths — same hairline grid */}
            <div className="mt-14">
                <div className="font-record text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Faster inside the product
                </div>
                <div className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-2">
                    <Link href="/feedback" className="group bg-card px-6 py-5 transition-colors hover:bg-muted/40">
                        <div className="text-[14.5px] font-bold text-foreground group-hover:text-[var(--ff-accent)]">
                            Feedback page
                        </div>
                        <p className="mt-1.5 text-[13px] text-muted-foreground">
                            Share bugs, missing features, or product suggestions directly.
                        </p>
                    </Link>
                    <Link href="/contribute" className="group bg-card px-6 py-5 transition-colors hover:bg-muted/40">
                        <div className="text-[14.5px] font-bold text-foreground group-hover:text-[var(--ff-accent)]">
                            Submit a job link
                        </div>
                        <p className="mt-1.5 text-[13px] text-muted-foreground">
                            Send us roles you want reviewed and added to the platform.
                        </p>
                    </Link>
                </div>
            </div>
        </main>
    );
}
