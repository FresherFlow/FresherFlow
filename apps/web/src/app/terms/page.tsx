import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'Terms for using FresherFlow.',
};

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background px-4 py-10 md:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
                    <p className="text-xs text-muted-foreground">Last updated: 2026-02-07</p>
                </header>

                <section className="space-y-3 text-sm text-foreground/90">
                    <p>By using FresherFlow, you agree to use the service lawfully and keep your account secure.</p>
                    <p>Listings link to third‑party sites. FresherFlow does not guarantee hiring outcomes and is not responsible for external sites.</p>
                    <p>We may update or suspend parts of the service to improve reliability and security.</p>
                </section>

                <section className="text-sm text-muted-foreground">
                    Contact: support@fresherflow.in
                </section>
            </div>
        </main>
    );
}
