import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'FresherFlow Blog',
    description: 'Product notes, hiring trends, and updates from the FresherFlow team.',
};

const blogSections = [
    {
        title: 'Product updates',
        description: 'Changes to feed quality, matching, mobile experience, alerts, and overall platform behavior.',
    },
    {
        title: 'Hiring insights',
        description: 'Observations from fresher hiring patterns, role structures, deadlines, and eligibility rules.',
    },
    {
        title: 'Guides',
        description: 'Simple practical content around applications, job discovery, and using FresherFlow better.',
    },
] as const;

export default function BlogPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-16 space-y-10">
            <section className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Blog</p>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Updates, notes, and hiring context from FresherFlow.</h1>
                <p className="max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
                    This is where we will publish product updates, hiring observations, and practical guides for early-career candidates.
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                {blogSections.map((section) => (
                    <div key={section.title} className="rounded-2xl border border-border bg-card p-5 space-y-2">
                        <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">{section.description}</p>
                    </div>
                ))}
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-bold text-foreground">First posts are being prepared</h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    We have created the blog route now so it is part of the site properly. As posts go live, this page can evolve into a full archive.
                </p>
                <div className="flex flex-wrap gap-3">
                    <Link href="/about" className="h-11 px-5 rounded-xl border border-border text-sm font-semibold inline-flex items-center justify-center">
                        About FresherFlow
                    </Link>
                    <Link href="/contact" className="h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center">
                        Contact Us
                    </Link>
                </div>
            </section>
        </main>
    );
}
