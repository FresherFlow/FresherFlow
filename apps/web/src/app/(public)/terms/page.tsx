import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'Understand the terms and guidelines for using the FresherFlow platform.',
    alternates: {
        canonical: '/terms',
    },
};

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background px-4 py-10 md:px-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <header className="space-y-3 pb-6 border-b border-border/60">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Legal Documentation</p>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">Terms of Service</h1>
                    <p className="text-xs text-muted-foreground">Last updated: May 31, 2026</p>
                </header>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm md:text-base leading-relaxed text-foreground/90">
                    <p className="text-base text-muted-foreground">
                        Welcome to FresherFlow. These terms govern your use of the FresherFlow platform. By accessing our services, you agree to these conditions.
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">1. Eligibility</h2>
                        <p>
                            FresherFlow is designed for students, fresh graduates, and entry-level job seekers. There are no age restrictions to explore opportunities or seek career resources on the platform.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">2. User Conduct</h2>
                        <p>
                            You agree to use FresherFlow only for lawful purposes related to job discovery, networking, and career advancement. Prohibited activities include, but are not limited to, the submission of fraudulent job links, automated scraping of data, or attempting to compromise the security of our systems.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">3. Third-Party Links</h2>
                        <p>
                            FresherFlow is a discovery platform linking to external corporate career pages and job boards. We do not guarantee hiring outcomes and are not responsible for the content, privacy, or security of third-party websites. Users should perform their own due diligence before applying.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">4. Intellectual Property</h2>
                        <p>
                            The FresherFlow name, logo, and all original content and features are the exclusive property of the FresherFlow team. You may not reproduce or distribute any part of the service without prior written consent.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">5. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, FresherFlow is provided &quot;as is&quot; and shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the platform.
                        </p>
                    </section>

                    <footer className="pt-6 border-t border-border/40 text-xs md:text-sm text-muted-foreground flex flex-col sm:flex-row sm:justify-between gap-2">
                        <span>Contact: support@fresherflow.in</span>
                        <span>FresherFlow Platform Team</span>
                    </footer>
                </div>
            </div>
        </main>
    );
}
