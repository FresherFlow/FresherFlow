import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils/slugify';


export const revalidate = false;
export const dynamicParams = false;

const VALID_LOCATIONS = {
    'bangalore': {
        label: 'Bangalore',
        aliases: ['bangalore', 'bengaluru']
    },
    'hyderabad': {
        label: 'Hyderabad',
        aliases: ['hyderabad']
    },
    'pune': {
        label: 'Pune',
        aliases: ['pune']
    },
    'chennai': {
        label: 'Chennai',
        aliases: ['chennai']
    },
    'mumbai': {
        label: 'Mumbai',
        aliases: ['mumbai']
    },
    'delhi-ncr': {
        label: 'Delhi NCR',
        aliases: ['delhi', 'noida', 'gurugram', 'ncr', 'gurgaon']
    },
    'remote': {
        label: 'Remote',
        aliases: ['remote', 'work from home', 'wfh', 'telecommute']
    }
};

const LOCATION_MIN_JOBS = 5;

export async function generateStaticParams() {
    try {
        const feed = await fetchBootstrapFeed(false, undefined, true);
        const counts: Record<string, number> = {};
        for (const opp of feed?.opportunities || []) {
            for (const [city, locInfo] of Object.entries(VALID_LOCATIONS)) {
                if (city === 'remote') {
                    if (opp.workMode === 'REMOTE') counts[city] = (counts[city] ?? 0) + 1;
                } else {
                    const hasMatch = opp.locations?.some((l: string) =>
                        locInfo.aliases.some(a => l.toLowerCase().includes(a))
                    );
                    if (hasMatch) counts[city] = (counts[city] ?? 0) + 1;
                }
            }
        }
        return Object.keys(VALID_LOCATIONS)
            .filter(city => (counts[city] ?? 0) >= LOCATION_MIN_JOBS)
            .map(city => ({ city }));
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

    const title = `Fresher Jobs in ${locInfo.label} 2026 | Off-Campus Placements`;
    const description = `Find verified entry-level job openings, off-campus drives, and internships in ${locInfo.label} for freshers. Direct application links with zero redirect spam.`;
    const base = SITE_URL.replace(/\/+$/, '');
    const slug = slugify(decodeURIComponent(city));
    const ogImageUrl = `${CDN_URL}/og/location/${slug}.png`;

    return {
        title,
        description,
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
    
    if (city !== properSlug) {
        permanentRedirect(`/locations/${properSlug}`);
    }

    const locInfo = VALID_LOCATIONS[properSlug as keyof typeof VALID_LOCATIONS] || {
        label: decodedCity.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        aliases: [decodedCity.replace(/-/g, ' ').toLowerCase(), decodedCity.toLowerCase()]
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
            return locInfo.aliases.some(alias => lower.includes(alias));
        });

        return !!hasLocMatch;
    });

    if (filtered.length === 0) {
        notFound();
    }

    const seoText = `Searching for off-campus drives or tech internships in ${locInfo.label}? This hub collects all active, manually-reviewed jobs open to freshers and recent graduates in ${locInfo.label}. We verify official application portals to save you from spam and fake listings. Filter by your target batch year and core skills, then submit your resume directly to the companies.`;

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
            />
        </Suspense>
    );
}
