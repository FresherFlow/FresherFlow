import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { truncateTitleByPixels, truncateDescription } from '@/lib/seo/seoMetrics';

export const revalidate = false;
export const dynamicParams = true;

const DEFAULT_BATCH_YEARS = [2024, 2025, 2026, 2027, 2028];

export async function generateStaticParams() {
    const yearsSet = new Set<number>(DEFAULT_BATCH_YEARS);
    try {
        const feed = await fetchBootstrapFeed(false, undefined, true);
        for (const opp of feed?.opportunities || []) {
            for (const batchNum of opp.allowedPassoutYears || []) {
                if (typeof batchNum === 'number' && !Number.isNaN(batchNum)) {
                    yearsSet.add(batchNum);
                }
            }
        }
    } catch {
        /* if CDN is down, fall back to defaults */
    }

    return Array.from(yearsSet)
        .sort((a, b) => b - a)
        .map(year => ({ year: year.toString() }));
}

type Props = {
    params: Promise<{ year: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { year: rawYear } = await params;
    const year = parseInt(rawYear, 10);
    
    if (Number.isNaN(year)) {
        return {
            title: 'Batch Not Found',
            description: 'This batch listing is not available.'
        };
    }

    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];
    const filtered = opportunities.filter(opp => 
        opp.allowedPassoutYears && 
        Array.isArray(opp.allowedPassoutYears) && 
        opp.allowedPassoutYears.includes(year)
    );

    const companiesCount = new Set(filtered.map(o => o.company).filter(Boolean)).size;
    const totalRoles = filtered.length;

    const rawTitle = `Jobs for ${year} Passouts | ${totalRoles > 0 ? `${totalRoles} Openings | ` : ''}FresherFlow`;
    const title = truncateTitleByPixels(rawTitle);
    const rawDescription = `Find verified jobs, internships and walk-in drives hiring ${year} batch passouts. ${companiesCount > 0 ? `${companiesCount} companies hiring ${year} passouts.` : ''} Direct official application links.`;
    const description = truncateDescription(rawDescription);
    const base = SITE_URL.replace(/\/+$/, '');
    const ogImageUrl = `${CDN_URL}/og/batch/${year}.png`;

    return {
        title,
        description,
        robots: {
            index: filtered.length > 0,
            follow: true,
        },
        alternates: {
            canonical: `${base}/batch/${year}`
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

export default async function BatchPage({ params }: Props) {
    const { year: rawYear } = await params;
    const year = parseInt(rawYear, 10);

    if (Number.isNaN(year) || year < 2015 || year > 2035) {
        notFound();
    }

    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];
    const filtered = opportunities.filter(opp => 
        opp.allowedPassoutYears && 
        Array.isArray(opp.allowedPassoutYears) && 
        opp.allowedPassoutYears.includes(year)
    );

    const companiesCount = new Set(filtered.map(o => o.company).filter(Boolean)).size;
    const totalRoles = filtered.length;
    const walkinCount = filtered.filter(o => 
        o.type === 'WALKIN' || 
        (o.tags && (o.tags.includes('walkin') || o.tags.includes('drive'))) ||
        o.title.toLowerCase().includes('walk-in') || 
        o.title.toLowerCase().includes('drive')
    ).length;

    const stats = {
        companiesCount,
        totalRoles,
        walkinCount,
    };

    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <CategoryPage 
                type={null} 
                initialData={{
                    opportunities: feed?.opportunities || [],
                    total: feed?.count || 0,
                    cachedAt: feed?.generatedAt ? new Date(feed.generatedAt).getTime() : Date.now(),
                }} 
                initialFilters={{ year: year }} 
                canonicalRedirect={true}
                customTitle={`Jobs for ${year} Passouts`}
            />
        </Suspense>
    );
}
