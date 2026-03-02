import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How FresherFlow collects and uses data.',
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-background px-4 py-10 md:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
                    <p className="text-xs text-muted-foreground">Last updated: 2026-02-07</p>
                </header>

                <section className="space-y-3 text-sm text-foreground/90">
                    <p>FresherFlow collects only the data needed to run the service: account info, profile details, and basic usage for reliability.</p>
                    <p>We do not sell personal data. We may share data with trusted service providers (email, hosting, analytics) to operate the platform.</p>
                    <p>We use cookies for authentication and security, and may store UI preferences locally.</p>
                    <p>You can update or delete your account by contacting us.</p>
                </section>

                <section className="text-sm text-muted-foreground">
                    Contact: privacy@fresherflow.in
                </section>
            </div>
        </main>
    );
}
