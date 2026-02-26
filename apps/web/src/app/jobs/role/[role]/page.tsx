import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 300;

const formatLabel = (value: string) =>
    value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export function generateMetadata({ params }: { params: { role: string } }): Metadata {
    const roleLabel = formatLabel(params.role);
    const title = `${roleLabel} Jobs for Freshers | FresherFlow`;
    const description = `Verified ${roleLabel} jobs for freshers and entry-level candidates. Every listing is checked and includes direct apply links.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: '/main.png',
                    width: 1200,
                    height: 630,
                    alt: `${roleLabel} jobs on FresherFlow`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['/main.png'],
        },
    };
}

export default function RoleLandingPage({ params }: { params: { role: string } }) {
    const roleLabel = formatLabel(params.role);
    const pageUrl = `https://fresherflow.in/jobs/role/${params.role}`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${roleLabel} Jobs for Freshers`,
        description: `Verified ${roleLabel} jobs for freshers and entry-level candidates.`,
        url: pageUrl,
        about: roleLabel,
    };

    return (
        <main className="min-h-screen bg-background px-3 md:px-6 py-10 md:py-14">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verified role feed</p>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {roleLabel} jobs for freshers.
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        Every listing is checked before it reaches you. Direct apply links only, no noise.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/opportunities" className="premium-button h-10 px-5 text-xs rounded-lg">
                            Browse the verified feed
                        </Link>
                        <Link
                            href="/login"
                            className="premium-button-outline h-10 px-5 text-xs rounded-lg bg-background hover:bg-muted"
                        >
                            Get alerts for {roleLabel}
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { title: 'Verified only', text: 'Manual checks remove broken links.' },
                        { title: 'Direct apply', text: 'No third-party redirects or spam.' },
                        { title: 'Updated daily', text: 'Fresh listings surfaced fast.' },
                    ].map((item) => (
                        <div key={item.title} className="rounded-lg border border-border bg-card p-4 space-y-2">
                            <h2 className="text-sm font-semibold text-foreground">{item.title}</h2>
                            <p className="text-sm text-muted-foreground">{item.text}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-2">
                    <h2 className="text-base font-semibold">What you will find</h2>
                    <ul className="text-sm text-muted-foreground space-y-0.5">
                        <li>Entry-level {roleLabel} openings</li>
                        <li>Internships and walk-ins where relevant</li>
                        <li>Verified links with clear eligibility details</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
