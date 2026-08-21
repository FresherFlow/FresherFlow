import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import { DirectoryClient } from '@/ui/DirectoryClient';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import { VALID_LOCATIONS, getCanonicalLocation } from '@/features/opportunities/utils/locationUtils';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Fresher Jobs by Location in India | FresherFlow',
    description: 'Find verified fresher jobs, internships, off-campus drives and walk-in interviews by city across India including Bengaluru, Hyderabad, Pune, Delhi NCR, and more.',
    alternates: { canonical: `${SITE_URL}/locations` },
};

const POPULAR_CITIES = [
    { slug: 'bangalore', label: 'Bengaluru' },
    { slug: 'hyderabad', label: 'Hyderabad' },
    { slug: 'pune', label: 'Pune' },
    { slug: 'delhi-ncr', label: 'Delhi NCR' },
    { slug: 'chennai', label: 'Chennai' },
    { slug: 'mumbai', label: 'Mumbai' },
    { slug: 'kolkata', label: 'Kolkata' },
    { slug: 'noida', label: 'Noida' },
    { slug: 'gurugram', label: 'Gurugram' },
    { slug: 'ahmedabad', label: 'Ahmedabad' },
];

export default async function LocationIndexPage() {
    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];

    const BLOCKED_LOCATIONS = new Set([
        'pan india', 'india', 'remote', 'work from home', 'wfh',
        'multiple locations', 'various locations', 'anywhere', 'worldwide',
        'across india', 'all india', 'multiple cities',
    ]);

    const isCleanLocation = (loc: string) => {
        const l = loc.toLowerCase().trim();
        if (BLOCKED_LOCATIONS.has(l)) return false;
        if (l.includes(',')) return false;
        if (l.includes('(')) return false;
        if (loc.length > 40) return false;
        if (loc.length < 2) return false;
        return true;
    };

    // Calculate Popular Cities Grid stats
    const popularCityData = POPULAR_CITIES.map(city => {
        const locInfo = VALID_LOCATIONS[city.slug as keyof typeof VALID_LOCATIONS] || {
            label: city.label,
            aliases: [city.slug, city.label.toLowerCase()]
        };

        const matches = opportunities.filter(opp => {
            return opp.locations?.some((l: string) => {
                const lower = l.toLowerCase();
                return locInfo.aliases.some(alias => lower.includes(alias));
            });
        });

        const companyCounts: Record<string, number> = {};
        for (const opp of matches) {
            if (opp.company) {
                companyCounts[opp.company] = (companyCounts[opp.company] || 0) + 1;
            }
        }

        const topCompanies = Object.entries(companyCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([c]) => c);

        return {
            ...city,
            count: matches.length,
            topCompanies,
        };
    });

    // Extract all locations with job counts for directory listing
    const locationCounts: Record<string, number> = {};
    for (const opp of opportunities) {
        for (const location of opp.locations || []) {
            if (!location) continue;
            const key = location.trim();
            if (!isCleanLocation(key)) continue;
            
            const slug = slugify(key);
            const canonicalSlug = getCanonicalLocation(slug) || slug;
            locationCounts[canonicalSlug] = (locationCounts[canonicalSlug] || 0) + 1;
        }
    }

    const sorted = Object.entries(locationCounts)
        .filter(([, count]) => count >= 3)
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
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Locations' }]} />
                </HeaderPortal>

                {/* Popular Cities Grid Section */}
                <section className="space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                            Browse Fresher Jobs by City
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Explore active off-campus placement drives, tech internships, and walk-in interviews in top hiring hubs across India.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {popularCityData.map(city => (
                            <Link
                                key={city.slug}
                                href={`/locations/${city.slug}`}
                                className="group bg-card border border-border/60 hover:border-primary/50 rounded-2xl p-4 transition-all duration-150 hover:shadow-md flex flex-col justify-between gap-3"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPinIcon className="w-4 h-4 text-primary shrink-0" />
                                            <h2 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                                                {city.label}
                                            </h2>
                                        </div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                                            {city.count} {city.count === 1 ? 'role' : 'roles'}
                                        </span>
                                    </div>

                                    {city.topCompanies.length > 0 && (
                                        <div className="flex items-start gap-1 text-xs text-muted-foreground pt-1 border-t border-border/40">
                                            <BuildingOfficeIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/70" />
                                            <span className="line-clamp-1 font-medium text-[11px]">
                                                {city.topCompanies.join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-primary group-hover:underline">
                                    <span>View jobs in {city.label}</span>
                                    <ChevronRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* All Locations Directory Section */}
                <section className="pt-4 border-t border-border/50">
                    <DirectoryClient 
                        title="All City Directories"
                        description="Explore complete listings of hiring cities across India."
                        data={sorted}
                        urlPrefix="/locations/"
                    />
                </section>
            </main>
        </div>
    );
}
