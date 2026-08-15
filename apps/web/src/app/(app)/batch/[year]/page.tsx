import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';

export const revalidate = false;
export const dynamicParams = false;

const BATCH_MIN_JOBS = 5;

export async function generateStaticParams() {
    const counts = new Map<number, number>();
    try {
        const feed = await fetchBootstrapFeed(false, undefined, true);
        for (const opp of feed?.opportunities || []) {
            for (const batchNum of opp.allowedPassoutYears || []) {
                if (typeof batchNum === 'number' && !Number.isNaN(batchNum)) {
                    counts.set(batchNum, (counts.get(batchNum) ?? 0) + 1);
                }
            }
        }
    } catch {
        /* if CDN is down, fall back to empty */
    }

    return Array.from(counts.entries())
        .filter(([, count]) => count >= BATCH_MIN_JOBS)
        .map(([year]) => ({ year: year.toString() }));
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

    const title = `${year} Batch Jobs & Internships for Freshers`;
    const description = `Find verified jobs, internships and off-campus opportunities open to the ${year} graduation batch with direct official apply links.`;
    const base = SITE_URL.replace(/\/+$/, '');
    const ogImageUrl = `${CDN_URL}/og/batch/${year}.png`;

    return {
        title,
        description,
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

    if (Number.isNaN(year)) {
        notFound();
    }

    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];
    const filtered = opportunities.filter(opp => 
        opp.allowedPassoutYears && 
        Array.isArray(opp.allowedPassoutYears) && 
        opp.allowedPassoutYears.includes(year)
    );

    if (filtered.length === 0) {
        notFound();
    }

    const seoText = `Finding off-campus placements as a fresher can be challenging. On this page, we compile all verified jobs, internships, and walk-in drives recruiting candidates from the ${year} batch. Every listing is reviewed by our moderation team to ensure valid official application links, transparent salary ranges, and complete qualification requirements. Use the links to apply directly on the hiring organizations' official careers portal.`;

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
            />
        </Suspense>
    );
}
