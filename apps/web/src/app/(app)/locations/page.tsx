import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { Badge } from '@/ui/Badge';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs by Location',
    description: 'Find verified fresher jobs, internships, and walk-in drives by city. Explore opportunities in Bangalore, Pune, Hyderabad, Chennai, Delhi NCR, and more.',
    alternates: { canonical: `${SITE_URL}/location` },
};

export default async function LocationIndexPage() {
    const feed = await fetchBootstrapFeed();
    const opportunities = feed?.opportunities || [];

    // Only emit links for clean, single city names — block compound strings,
    // generic terms, and anything that would create a useless page.
    const BLOCKED_LOCATIONS = new Set([
        'pan india', 'india', 'remote', 'work from home', 'wfh',
        'multiple locations', 'various locations', 'anywhere', 'worldwide',
        'across india', 'all india', 'multiple cities',
    ]);
    const isCleanLocation = (loc: string) => {
        const l = loc.toLowerCase().trim();
        if (BLOCKED_LOCATIONS.has(l)) return false;
        if (l.includes(',')) return false;          // "Govindapuram, Guntur"
        if (l.includes('(')) return false;          // "Nigeria (Multiple Locations)"
        if (loc.length > 40) return false;          // suspiciously long
        if (loc.length < 2) return false;
        return true;
    };

    // Extract all locations with job counts
    const locationCounts: Record<string, number> = {};
    for (const opp of opportunities) {
        for (const location of opp.locations || []) {
            if (!location) continue;
            const key = location.trim();
            if (!isCleanLocation(key)) continue;
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
        <div className="min-h-screen bg-background pb-20 font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Locations' }]} />
                </HeaderPortal>

                {/* Header */}
                <div className="pb-4 border-b border-border/40 space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Browse Jobs by Location
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                        Find verified fresher jobs and internships in your preferred city.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                        <Badge variant="default" className="text-xs font-semibold px-3 py-1">
                            {totalLocations} locations listed
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
                            {totalJobs} active listings
                        </Badge>
                    </div>
                </div>

                {/* Letter jump nav */}
                <div className="flex flex-wrap gap-1.5">
                    {letters.map(letter => (
                        <a
                            key={letter}
                            href={`#loc-${letter}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-card hover:bg-accent text-foreground hover:text-primary border border-border/70 transition-all shadow-2xs"
                        >
                            {letter}
                        </a>
                    ))}
                </div>

                {/* Location groups */}
                <div className="space-y-8">
                    {letters.map(letter => (
                        <div key={letter} id={`loc-${letter}`} className="scroll-mt-24 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-foreground">{letter}</span>
                                <span className="text-xs font-semibold text-muted-foreground">{groups[letter].length}</span>
                                <div className="flex-1 h-px bg-border/40" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {groups[letter].map(({ location, count, slug }) => (
                                    <Link
                                        key={slug}
                                        href={`/location/${slug}`}
                                        className="group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card hover:bg-accent border border-border/70 hover:border-border transition-all shadow-2xs"
                                    >
                                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                            {location}
                                        </span>
                                        <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            {count}
                                        </Badge>
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
