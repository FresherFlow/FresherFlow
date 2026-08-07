import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Careers',
    description: 'Join the FresherFlow team and help us build the community-driven platform for verifying off-campus opportunities.',
    alternates: {
        canonical: '/careers',
    },
};

export default function CareersPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20 text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Careers at FresherFlow</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                We are on a mission to eliminate scam and spam from entry-level recruitment. 
                Currently, we don&apos;t have any open positions, but we are always looking for passionate people.
            </p>
            <div className="pt-8">
                <a href="mailto:contact@fresherflow.in" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                    Send us your Resume
                </a>
            </div>
        </main>
    );
}
