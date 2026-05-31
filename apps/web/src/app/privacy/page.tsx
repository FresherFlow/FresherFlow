import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'Learn how FresherFlow collects, processes, and protects your professional profile and usage data.',
    alternates: {
        canonical: '/privacy',
    },
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-background px-4 py-10 md:px-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <header className="space-y-3 pb-6 border-b border-border/60">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Legal Documentation</p>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">Privacy Policy</h1>
                    <p className="text-xs text-muted-foreground">Last updated: May 31, 2026</p>
                </header>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm md:text-base leading-relaxed text-foreground/90">
                    <p className="text-base text-muted-foreground">
                        At FresherFlow, we are committed to protecting your professional privacy. This policy explains how we collect, manage, and secure your information.
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">1. Data Collection</h2>
                        <p>
                            We collect information you provide directly, including your email address, educational background, passout year, and professional preferences. We also collect anonymous interaction data (saves, clicks) to improve our opportunity recommendation engine.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">2. Data Usage</h2>
                        <p>
                            Your data is used to personalize your job feed, send relevant alerts, and maintain your professional preferences. We use industry-standard encryption to protect your sensitive information.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">3. Third-Party Services</h2>
                        <p>
                            FresherFlow integrates with Firebase (Google) for authentication and push notifications. Your use of these features is subject to Google's privacy policies. We do not sell your personal data to advertisers.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">4. Data Retention & Deletion</h2>
                        <p>
                            You have the right to request deletion of your account and associated data at any time via the Account Settings. We process these requests promptly in accordance with applicable data protection laws.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">5. Updates</h2>
                        <p>
                            We may update this policy from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.
                        </p>
                    </section>

                    <footer className="pt-6 border-t border-border/40 text-xs md:text-sm text-muted-foreground flex flex-col sm:flex-row sm:justify-between gap-2">
                        <span>Contact: privacy@fresherflow.in</span>
                        <span>FresherFlow Platform Team</span>
                    </footer>
                </div>
            </div>
        </main>
    );
}
