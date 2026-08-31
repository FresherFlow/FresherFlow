import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils/slugify';
import { VALID_LOCATIONS, getCanonicalLocation } from '@/features/opportunities/utils/locationUtils';
import { truncateTitleByPixels, truncateDescription } from '@/lib/seo/seoMetrics';

export const revalidate = false;
export const dynamicParams = true;

const LOCATION_MIN_JOBS = 3;

export async function generateStaticParams() {
    try {
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

        const locationCounts: Record<string, number> = {};
        for (const opp of opportunities) {
            if (opp.workMode === 'REMOTE') {
                locationCounts['remote'] = (locationCounts['remote'] || 0) + 1;
            }

            for (const location of opp.locations || []) {
                if (!location) continue;
                const key = location.trim();
                if (!isCleanLocation(key)) continue;
                
                const slug = slugify(key);
                const canonicalSlug = getCanonicalLocation(slug) || slug;
                locationCounts[canonicalSlug] = (locationCounts[canonicalSlug] || 0) + 1;
            }
        }

        const validCities = Object.keys(locationCounts).filter(city => (locationCounts[city] ?? 0) >= LOCATION_MIN_JOBS);
        
        const aliasesToGenerate = new Set<string>();
        validCities.forEach(city => {
            const locInfo = VALID_LOCATIONS[city as keyof typeof VALID_LOCATIONS];
            if (locInfo) {
                locInfo.aliases.forEach((alias: string) => aliasesToGenerate.add(alias));
            }
        });

        const allPaths = new Set([...Object.keys(VALID_LOCATIONS), ...validCities, ...aliasesToGenerate]);
        return Array.from(allPaths).map(city => ({ city }));
    } catch {
        return Object.keys(VALID_LOCATIONS).map(city => ({ city }));
    }
}

type Props = {
    params: Promise<{ city: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { city } = await params;
    const locInfo = VALID_LOCATIONS[city as keyof typeof VALID_LOCATIONS] || {
        label: city.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        aliases: [city.replace(/-/g, ' ').toLowerCase(), city.toLowerCase()]
    };

    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];
    const filtered = opportunities.filter(opp => {
        if (city === 'remote') {
            if (opp.workMode === 'REMOTE') return true;
            const locLabel = (opp.locations || []).join(' ').toLowerCase();
            return locLabel.includes('remote') || locLabel.includes('work from home') || locLabel.includes('wfh') || locLabel.includes('pan india');
        }

        const hasLocMatch = opp.locations?.some((l: string) => {
            const lower = l.toLowerCase();
            return locInfo.aliases.some((alias: string) => lower.includes(alias));
        });

        return !!hasLocMatch;
    });

    const rawTitle = `Jobs in ${locInfo.label} | FresherFlow`;
    const title = truncateTitleByPixels(rawTitle);
    const rawDescription = `Find ${filtered.length > 0 ? `${filtered.length} ` : ''}verified fresher jobs, internships and off-campus opportunities in ${locInfo.label} with direct application links.`;
    const description = truncateDescription(rawDescription);
    const base = SITE_URL.replace(/\/+$/, '');
    const slug = slugify(decodeURIComponent(city));
    const ogImageUrl = `${CDN_URL}/og/location/${slug}.png`;

    return {
        title,
        description,
        robots: {
            index: filtered.length > 0,
            follow: true,
        },
        alternates: {
            canonical: `${base}/locations/${city}`
        },
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
        }
    };
}

export default async function LocationPage({ params }: Props) {
    const { city } = await params;
    
    // Ensure canonical lowercased slug
    const decodedCity = decodeURIComponent(city);
    const properSlug = slugify(decodedCity);
    
    // Check if the current slug is an alias that needs canonicalization
    const canonicalSlug = getCanonicalLocation(properSlug);
    
    if (canonicalSlug && canonicalSlug !== properSlug) {
        const label = VALID_LOCATIONS[canonicalSlug as keyof typeof VALID_LOCATIONS].label;
        permanentRedirect(`/locations/${canonicalSlug}?location=${encodeURIComponent(label)}`);
    } else if (city !== properSlug && canonicalSlug) {
        permanentRedirect(`/locations/${properSlug}`);
    }

    const locInfo = VALID_LOCATIONS[properSlug as keyof typeof VALID_LOCATIONS] || {
        label: decodedCity.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        aliases: [decodedCity.replace(/-/g, ' ').toLowerCase(), decodedCity.toLowerCase()]
    };

    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];

    const filtered = opportunities.filter(opp => {
        if (properSlug === 'remote') {
            if (opp.workMode === 'REMOTE') return true;
            const locLabel = (opp.locations || []).join(' ').toLowerCase();
            return locLabel.includes('remote') || locLabel.includes('work from home') || locLabel.includes('wfh') || locLabel.includes('pan india');
        }

        const hasLocMatch = opp.locations?.some((l: string) => {
            const lower = l.toLowerCase();
            return locInfo.aliases.some((alias: string) => lower.includes(alias));
        });

        return !!hasLocMatch;
    });

    const totalRoles = filtered.length;
    const companyCounts: Record<string, number> = {};
    let walkinCount = 0;

    for (const opp of filtered) {
        if (opp.company) {
            companyCounts[opp.company] = (companyCounts[opp.company] || 0) + 1;
        }
        if (opp.type === 'WALKIN' || (opp.tags && (opp.tags.includes('walkin') || opp.tags.includes('drive'))) || opp.title.toLowerCase().includes('walk-in') || opp.title.toLowerCase().includes('drive')) {
            walkinCount++;
        }
    }

    const companiesCount = Object.keys(companyCounts).length;
    const topCompanies = Object.entries(companyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([comp]) => comp);

    const stats = {
        totalRoles,
        companiesCount,
        walkinCount,
        topCompanies,
    };

    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <CategoryPage 
                type={null} 
                initialData={{
                    opportunities: filtered.map(toOpportunityCardDTO) as any,
                    total: filtered.length,
                    cachedAt: feed?.generatedAt ? new Date(feed.generatedAt).getTime() : Date.now(),
                }} 
                initialFilters={{ location: locInfo.label }} 
                canonicalRedirect={true}
                customTitle={`Jobs in ${locInfo.label}`}
            />
        </Suspense>
    );
}
