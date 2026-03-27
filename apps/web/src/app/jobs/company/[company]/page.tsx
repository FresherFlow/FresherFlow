import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/runtimeConfig';

export const revalidate = 3600;

const formatLabel = (value: string) =>
    value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export function generateMetadata({ params }: { params: { company: string } }): Metadata {
    const companyLabel = formatLabel(params.company);
    const title = `${companyLabel} Jobs for Freshers`;
    const description = `Verified ${companyLabel} opportunities for freshers. Every listing is checked with direct apply links.`;

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
                    alt: `${companyLabel} jobs on FresherFlow`,
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

export default function CompanyLandingPage({ params }: { params: { company: string } }) {
    const companyLabel = formatLabel(params.company);
    const pageUrl = `${SITE_URL}/jobs/company/${params.company}`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${companyLabel} Jobs for Freshers`,
        description: `Verified ${companyLabel} opportunities for freshers.`,
        url: pageUrl,
        about: companyLabel,
    };

    return (
        <main className="min-h-screen bg-background px-3 md:px-6 py-10 md:py-14">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verified company feed</p>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {companyLabel} fresher opportunities.
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        Direct apply links from official sources, reviewed daily for accuracy.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/opportunities" className="premium-button h-10 px-5 text-xs rounded-lg">
                            Browse verified listings
                        </Link>
                        <Link
                            href="/login"
                            className="premium-button-outline h-10 px-5 text-xs rounded-lg bg-background hover:bg-muted"
                        >
                            Get alerts for {companyLabel}
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { title: 'Official sources', text: 'We index company and ATS postings.' },
                        { title: 'Verified links', text: 'Every apply link is checked.' },
                        { title: 'Fresh updates', text: 'New listings added daily.' },
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
                        <li>Entry-level roles and internships at {companyLabel}</li>
                        <li>Walk-ins or drives when announced</li>
                        <li>Verified links with clear eligibility details</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
