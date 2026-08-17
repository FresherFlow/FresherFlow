import type { Metadata } from 'next';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import { DirectoryClient } from '@/ui/DirectoryClient';

import { VALID_LOCATIONS, getCanonicalLocation } from '@/features/opportunities/utils/locationUtils';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Fresher Jobs by Location in India',
    description: 'Find verified fresher jobs, internships, off-campus drives and walk-in interviews by city across India.',
    alternates: { canonical: `${SITE_URL}/locations` },
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
            
            // Map to canonical slug if it's an alias (e.g. 'Bengaluru' -> 'bangalore')
            const slug = slugify(key);
            const canonicalSlug = getCanonicalLocation(slug) || slug;
            
            locationCounts[canonicalSlug] = (locationCounts[canonicalSlug] || 0) + 1;
        }
    }

    // Sort by count desc, then alpha
    const sorted = Object.entries(locationCounts)
        .filter(([, count]) => count >= 5)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([slug, count]) => {
            const label = VALID_LOCATIONS[slug as keyof typeof VALID_LOCATIONS]?.label || 
                          slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return {
                name: label,
                count,
                slug: slug
            };
        });

    return (
        <div className="bg-background font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Locations' }]} />
                </HeaderPortal>

                <DirectoryClient 
                    title="Browse Jobs by Location"
                    description="Find verified fresher jobs and internships in your preferred city."
                    data={sorted}
                    urlPrefix="/locations/"
                />
            </main>
        </div>
    );
}
