import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'About FresherFlow',
    description: 'Learn what FresherFlow is building for freshers, graduates, and early-career job seekers in India.',
};

export default function AboutPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-16 space-y-10">
            <section className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">About Us</p>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">FresherFlow helps freshers move faster.</h1>
                <p className="max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
                    We built FresherFlow to make entry-level hiring simpler to navigate. Instead of scattered job links,
                    expired listings, and vague eligibility, we focus on verified opportunities, clearer requirements, and
                    a cleaner application flow for candidates early in their careers.
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                    <h2 className="text-lg font-bold text-foreground">Verified listings</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Jobs, internships, and walk-ins are surfaced with stronger structure, better expiry handling, and direct apply intent.
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                    <h2 className="text-lg font-bold text-foreground">Profile-fit discovery</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        We try to show candidates what is actually relevant instead of forcing them to scan everything manually.
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                    <h2 className="text-lg font-bold text-foreground">Community-driven growth</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Users can submit listings, share feedback, and help us improve what gets posted and how it is represented.
                    </p>
                </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-bold text-foreground">What we care about</h2>
                <ul className="space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed list-disc pl-5">
                    <li>Helping freshers discover opportunities without wasting time on noise.</li>
                    <li>Keeping listings readable, structured, and useful on both web and mobile.</li>
                    <li>Building a platform that can support both private and government job discovery cleanly.</li>
                </ul>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">Want to reach us?</h2>
                    <p className="text-sm text-muted-foreground">
                        Questions, ideas, product feedback, or partnership conversations are all welcome.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/contact" className="h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center">
                        Contact Us
                    </Link>
                    <Link href="/account/feedback" className="h-11 px-5 rounded-xl border border-border text-sm font-semibold inline-flex items-center justify-center">
                        Send Feedback
                    </Link>
                </div>
            </section>
        </main>
    );
}
