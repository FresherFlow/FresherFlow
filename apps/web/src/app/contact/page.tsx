import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Contact FresherFlow',
    description: 'Contact FresherFlow for support, feedback, listing questions, or collaboration.',
};

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
        <main className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-16 space-y-10">
            <section className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Contact Us</p>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Reach the FresherFlow team.</h1>
                <p className="max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
                    If something is broken, unclear, or missing, tell us. If you want to work with us, tell us that too.
                    We would rather hear specific feedback than let users get stuck.
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                {contactItems.map((item) => (
                    <a
                        key={item.title}
                        href={item.href}
                        className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:border-primary/30 transition-colors"
                    >
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{item.title}</p>
                        <p className="text-xl font-bold text-foreground break-all">{item.value}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.note}</p>
                    </a>
                ))}
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Fastest ways to reach us inside the app</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <Link href="/account/feedback" className="rounded-2xl border border-border px-5 py-4 hover:border-primary/30 transition-colors">
                        <div className="font-semibold text-foreground">Feedback page</div>
                        <div className="text-sm text-muted-foreground mt-1">Share bugs, missing features, or product suggestions directly.</div>
                    </Link>
                    <Link href="/submit-link" className="rounded-2xl border border-border px-5 py-4 hover:border-primary/30 transition-colors">
                        <div className="font-semibold text-foreground">Submit a job link</div>
                        <div className="text-sm text-muted-foreground mt-1">Send us roles you want reviewed and added to the platform.</div>
                    </Link>
                </div>
            </section>
        </main>
    );
}
