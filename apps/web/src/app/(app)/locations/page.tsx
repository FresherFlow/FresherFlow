import type { Metadata } from 'next';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import { DirectoryClient } from '@/ui/DirectoryClient';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs by Location',
    description: 'Find verified fresher jobs, internships, and walk-in drives by city. Explore opportunities in Bangalore, Pune, Hyderabad, Chennai, Delhi NCR, and more.',
    alternates: { canonical: `${SITE_URL}/location` },
};

export default async function LocationIndexPage() {
    const feed = await fetchBootstrapFeed(false, undefined, true);
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
        .filter(([, count]) => count >= 5)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([location, count]) => ({
            name: location,
            count,
            slug: slugify(location)
        }));

    return (
        <div className="min-h-screen bg-background pb-20 font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Locations' }]} />
                </HeaderPortal>

                <DirectoryClient 
                    title="Browse Jobs by Location"
                    description="Find verified fresher jobs and internships in your preferred city."
                    data={sorted}
                    urlPrefix="/location/"
                />
            </main>
        </div>
    );
}
