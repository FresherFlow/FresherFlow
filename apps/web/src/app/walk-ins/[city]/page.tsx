import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/runtimeConfig';

export const revalidate = 3600;

const formatLabel = (value: string) =>
    value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
    const cityLabel = formatLabel(params.city);
    const title = `Walk-ins in ${cityLabel}`;
    const description = `Verified walk-in drives and fresher opportunities in ${cityLabel}. Direct apply and venue details included.`;

    return {
        title,
        description,
        robots: {
            index: false,
        },
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: '/main.png',
                    width: 1200,
                    height: 630,
                    alt: `Walk-ins in ${cityLabel} on FresherFlow`,
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

export default function WalkInsCityLandingPage({ params }: { params: { city: string } }) {
    const cityLabel = formatLabel(params.city);
    const pageUrl = `${SITE_URL}/walk-ins/${params.city}`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Walk-ins in ${cityLabel}`,
        description: `Verified walk-in drives and fresher opportunities in ${cityLabel}.`,
        url: pageUrl,
        about: cityLabel,
    };

    return (
        <main className="min-h-screen bg-background px-3 md:px-6 py-10 md:py-14">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verified walk-ins</p>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        Walk-ins in {cityLabel} for freshers.
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        We verify walk-in drives and entry-level openings so you can apply confidently.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/opportunities" className="premium-button h-10 px-5 text-xs rounded-lg">
                            Browse verified walk-ins
                        </Link>
                        <Link
                            href="/login"
                            className="premium-button-outline h-10 px-5 text-xs rounded-lg bg-background hover:bg-muted"
                        >
                            Get alerts for {cityLabel}
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { title: 'Venue details', text: 'Clear location, date, and eligibility.' },
                        { title: 'Verified access', text: 'No broken links or stale drives.' },
                        { title: 'Fresh updates', text: 'New walk-ins added daily.' },
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
                        <li>Upcoming walk-ins and hiring drives</li>
                        <li>Entry-level roles in {cityLabel}</li>
                        <li>Verified links with direct apply details</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
