import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs by Location | FresherFlow',
    description: 'Find verified fresher jobs, internships, and walk-in drives by city. Explore opportunities in Bangalore, Pune, Hyderabad, Chennai, Delhi NCR, and more.',
    alternates: { canonical: `${SITE_URL || 'https://fresherflow.in'}/location` },
};

export default async function LocationIndexPage() {
    const feed = await fetchBootstrapFeed();
    const opportunities = feed?.opportunities || [];

    // Extract all locations with job counts
    const locationCounts: Record<string, number> = {};
    for (const opp of opportunities) {
        for (const location of opp.locations || []) {
            if (!location) continue;
            const key = location.trim();
            locationCounts[key] = (locationCounts[key] || 0) + 1;
        }
    }

    // Sort by count desc, then alpha
    const sorted = Object.entries(locationCounts)
        .filter(([, count]) => count >= 1)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    // Group alphabetically
    const groups: Record<string, { location: string; count: number; slug: string }[]> = {};
    for (const [location, count] of sorted) {
        const letter = location[0].toUpperCase();
        const key = /[A-Z]/.test(letter) ? letter : '#';
        if (!groups[key]) groups[key] = [];
        groups[key].push({ location, count, slug: slugify(location) });
    }

    const letters = Object.keys(groups).sort((a, b) => {
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
    });

    const totalLocations = sorted.length;
    const totalJobs = opportunities.length;

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

                <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Locations' }]} />

                {/* Header */}
                <div className="border-b border-border/60 pb-6 space-y-2">
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">
                        Browse by Location
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                        Find verified fresher jobs and internships in your preferred city.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                            {totalLocations} locations listed
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
                            {totalJobs} active listings
                        </span>
                    </div>
                </div>

                {/* Letter jump nav */}
                <div className="flex flex-wrap gap-1.5">
                    {letters.map(letter => (
                        <a
                            key={letter}
                            href={`#loc-${letter}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                        >
                            {letter}
                        </a>
                    ))}
                </div>

                {/* Location groups */}
                <div className="space-y-10">
                    {letters.map(letter => (
                        <div key={letter} id={`loc-${letter}`} className="scroll-mt-24 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-black text-foreground">{letter}</span>
                                <span className="text-xs font-semibold text-muted-foreground">{groups[letter].length}</span>
                                <div className="flex-1 h-px bg-border/60" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {groups[letter].map(({ location, count, slug }) => (
                                    <Link
                                        key={slug}
                                        href={`/location/${slug}`}
                                        className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-primary/5 border border-border hover:border-primary/30 transition-all"
                                    >
                                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                            {location}
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                            {count}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}
